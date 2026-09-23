import type { Sql } from '../db';
import { showsDistress } from '../../shared/distress';
import { toPlainText } from '../../shared/markdown';
import { baseHandle } from './handles';
import { OFFICIAL_HANDLE } from './posts';
import { LIMITS, type FeedItem } from './types';

export type FeedTab = 'all' | 'conversations' | 'grievances' | 'unanswered' | 'following';
export type FeedSort = 'hot' | 'new' | 'old' | 'top' | 'affected';
export type SearchSort = 'relevance' | 'new' | 'old';

export interface FeedQuery {
	tab: FeedTab;
	sort: FeedSort;
	category?: string;
	page?: number;
	/** Needed for the Following tab. */
	viewerId?: string;
	/** Posts shown elsewhere on the page (pinned), left out of the list. */
	exclude?: number[];
}

/** Official posts stay pinned this long, at most PINNED_MAX at a time; then they rank like any other post. */
export const PINNED_DAYS = 14;
export const PINNED_MAX = 2;

export const PAGE_SIZE = 20;

/** Invisible markers around matched words; the interface turns them into highlights (no HTML involved). */
export const HIT_START = '\u0001';
export const HIT_END = '\u0002';
const QUERY_MIN = 2;
const QUERY_MAX = 200;

export type SearchResult = FeedItem & { titleMarked: string; excerptMarked: string };
export const MAX_PAGE = 25;

const excerpt = (body: string) => {
	const flat = body.replace(/\s+/g, ' ').trim();
	return flat.length > LIMITS.excerpt ? `${flat.slice(0, LIMITS.excerpt)}…` : flat;
};

export class FeedService {
	constructor(private deps: { sql: Sql; handleKey: Uint8Array }) {}

	private imageCount() {
		return this.deps.sql`(select count(*)::int from post_images i where i.post_id = p.id) as image_count`;
	}

	async categories() {
		return this.deps.sql<{ slug: string; name: string; description: string }[]>`
			select slug, name, description from categories order by sort_order`;
	}

	async list(q: FeedQuery): Promise<FeedItem[]> {
		const { sql } = this.deps;
		const page = Math.min(Math.max(1, Math.floor(q.page ?? 1)), MAX_PAGE);
		const following = q.tab === 'following';
		if (following && !q.viewerId) return [];
		const tab = {
			all: sql``,
			following: sql``,
			conversations: sql`and p.kind = 'conversation'`,
			grievances: sql`and p.kind = 'grievance'`,
			unanswered: sql`and p.reply_count = 0`
		}[q.tab];
		const category = q.category ? sql`and c.slug = ${q.category}` : sql``;
		const exclude = q.exclude?.length ? sql`and p.id not in ${sql(q.exclude)}` : sql``;
		const order = {
			new: sql`p.published_on desc, p.id desc`,
			old: sql`p.published_on asc, p.id asc`,
			top: sql`p.upvotes - p.downvotes desc, p.published_on desc`,
			affected: sql`p.metoo desc, p.published_on desc`,
			hot: sql`greatest(p.upvotes - p.downvotes + 2 * p.metoo + 1, 0)::float
				/ power(extract(epoch from now() - p.published_on) / 3600 + 2, 1.5) desc, p.id desc`
		}[q.sort];
		const followJoin = following ? sql`join follows f on f.post_id = p.id and f.account_id = ${q.viewerId!}` : sql``;
		const newReplies = following ? sql`, greatest(p.reply_count - f.seen_replies, 0)::int as new_replies` : sql``;
		// In Following, "most relevant" means most recent activity: the latest reply, or the post itself.
		const activity = sql`coalesce(
			(select max(r.published_on) from replies r where r.post_id = p.id and r.status = 'published'),
			p.published_on) desc, p.id desc`;

		const rows = await sql`
			select p.*, c.slug as category_slug, c.name as category_name ${newReplies}, ${this.imageCount()}
			from posts p join categories c on c.id = p.category_id ${followJoin}
			where p.status = 'published' ${tab} ${category} ${exclude}
			order by ${following && q.sort === 'hot' ? activity : order}
			limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`;
		return rows.map((r) => this.item(r));
	}

	/** Full-text search over published posts, most relevant first. The query is never stored. */
	async search(raw: string, page = 1, sort: SearchSort = 'relevance'): Promise<SearchResult[]> {
		const q = raw.trim();
		if (q.length < QUERY_MIN || q.length > QUERY_MAX) return [];
		const { sql } = this.deps;
		const offset = (Math.min(Math.max(1, Math.floor(page)), MAX_PAGE) - 1) * PAGE_SIZE;
		const marks = `StartSel=${HIT_START}, StopSel=${HIT_END}`;
		const rows = await sql`
			with query as (select websearch_to_tsquery('english', ${q}) as tsq)
			select p.*, c.slug as category_slug, c.name as category_name, ${this.imageCount()},
			       ts_headline('english', p.title, query.tsq, ${`${marks}, HighlightAll=true`}) as title_marked,
			       ts_headline('english', p.body, query.tsq, ${`${marks}, MaxWords=30, MinWords=12, MaxFragments=2, FragmentDelimiter=" … "`}) as excerpt_marked
			from posts p join categories c on c.id = p.category_id, query
			where p.status = 'published' and numnode(query.tsq) > 0 and p.search @@ query.tsq
			order by ${
				sort === 'new'
					? sql`p.published_on desc`
					: sort === 'old'
						? sql`p.published_on asc`
						: sql`ts_rank(p.search, query.tsq) desc, p.published_on desc`
			}
			limit ${PAGE_SIZE} offset ${offset}`;
		return rows.map((r) => ({ ...this.item(r), titleMarked: r.title_marked, excerptMarked: r.format === 'markdown' ? toPlainText(r.excerpt_marked) : r.excerpt_marked }));
	}

	/** The latest official posts, pinned above the Everything feed (or a category's, if they're in it). */
	async pinned(category?: string): Promise<FeedItem[]> {
		const { sql } = this.deps;
		const rows = await sql`
			select p.*, c.slug as category_slug, c.name as category_name, ${this.imageCount()}
			from posts p join categories c on c.id = p.category_id
			where p.status = 'published' and p.official
			  and p.published_on > now() - make_interval(days => ${PINNED_DAYS})
			  ${category ? sql`and c.slug = ${category}` : sql``}
			order by p.published_on desc, p.id desc limit ${PINNED_MAX}`;
		return rows.map((r) => this.item(r));
	}

	async mostAffected(days = 7, limit = 5): Promise<FeedItem[]> {
		const rows = await this.deps.sql`
			select p.*, c.slug as category_slug, c.name as category_name from posts p join categories c on c.id = p.category_id
			where p.status = 'published' and p.kind = 'grievance' and p.metoo > 0
			  and p.published_on > now() - make_interval(days => ${days})
			order by p.metoo desc, p.id desc limit ${limit}`;
		return rows.map((r) => this.item(r));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private item(r: Record<string, any>): FeedItem {
		return {
			id: Number(r.id),
			slug: r.slug,
			category: { slug: r.category_slug, name: r.category_name },
			kind: r.kind,
			title: r.title,
			excerpt: excerpt(r.format === 'markdown' ? toPlainText(r.body) : r.body),
			handle: r.official ? OFFICIAL_HANDLE : baseHandle(this.deps.handleKey, r.account_id, r.id),
			publishedOn: new Date(r.published_on).toISOString(),
			upvotes: r.upvotes,
			metoo: r.metoo,
			replyCount: r.reply_count,
			imageCount: r.image_count ?? 0,
			...(r.new_replies === undefined ? {} : { newReplies: r.new_replies }),
			distress: showsDistress(`${r.title}\n${r.body}`),
			official: r.official
		};
	}
}
