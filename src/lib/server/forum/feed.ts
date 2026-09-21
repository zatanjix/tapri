import type { Sql } from '../db';
import { showsDistress } from '../../shared/distress';
import { baseHandle } from './handles';
import { LIMITS, type FeedItem } from './types';

export type FeedTab = 'all' | 'conversations' | 'grievances' | 'unanswered';
export type FeedSort = 'hot' | 'new' | 'affected';

export interface FeedQuery {
	tab: FeedTab;
	sort: FeedSort;
	category?: string;
	page?: number;
}

export const PAGE_SIZE = 20;
export const MAX_PAGE = 25;

const excerpt = (body: string) => {
	const flat = body.replace(/\s+/g, ' ').trim();
	return flat.length > LIMITS.excerpt ? `${flat.slice(0, LIMITS.excerpt)}…` : flat;
};

export class FeedService {
	constructor(private deps: { sql: Sql; handleKey: Uint8Array }) {}

	async categories() {
		return this.deps.sql<{ slug: string; name: string; description: string }[]>`
			select slug, name, description from categories order by sort_order`;
	}

	async list(q: FeedQuery): Promise<FeedItem[]> {
		const { sql } = this.deps;
		const page = Math.min(Math.max(1, Math.floor(q.page ?? 1)), MAX_PAGE);
		const tab = {
			all: sql``,
			conversations: sql`and p.kind = 'conversation'`,
			grievances: sql`and p.kind = 'grievance'`,
			unanswered: sql`and p.reply_count = 0`
		}[q.tab];
		const category = q.category ? sql`and c.slug = ${q.category}` : sql``;
		const order = {
			new: sql`p.published_on desc, p.id desc`,
			affected: sql`p.metoo desc, p.published_on desc`,
			hot: sql`greatest(p.upvotes - p.downvotes + 2 * p.metoo + 1, 0)::float
				/ power(extract(epoch from now() - p.published_on) / 3600 + 2, 1.5) desc, p.id desc`
		}[q.sort];

		const rows = await sql`
			select p.*, c.slug, c.name from posts p join categories c on c.id = p.category_id
			where p.status = 'published' ${tab} ${category}
			order by ${order}
			limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`;
		return rows.map((r) => this.item(r));
	}

	async mostAffected(days = 7, limit = 5): Promise<FeedItem[]> {
		const rows = await this.deps.sql`
			select p.*, c.slug, c.name from posts p join categories c on c.id = p.category_id
			where p.status = 'published' and p.kind = 'grievance' and p.metoo > 0
			  and p.published_on > now() - make_interval(days => ${days})
			order by p.metoo desc, p.id desc limit ${limit}`;
		return rows.map((r) => this.item(r));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private item(r: Record<string, any>): FeedItem {
		return {
			id: Number(r.id),
			category: { slug: r.slug, name: r.name },
			kind: r.kind,
			title: r.title,
			excerpt: excerpt(r.body),
			handle: baseHandle(this.deps.handleKey, r.account_id, r.id),
			publishedOn: new Date(r.published_on).toISOString(),
			upvotes: r.upvotes,
			metoo: r.metoo,
			replyCount: r.reply_count,
			distress: showsDistress(`${r.title}\n${r.body}`)
		};
	}
}
