import type { Sql } from '../db';
import { showsDistress } from '../../shared/distress';
import { ThreadHandles } from './handles';
import { LIMITS, type Kind, type PostView, type ReplyView, type Result, type Status, type ThreadView } from './types';

export interface NewPost {
	category: string;
	kind: string;
	title: string;
	body: string;
}

export type CreatePostError = 'unknown_category' | 'invalid_kind' | 'invalid_title' | 'invalid_body';
export type CreateReplyError = 'not_found' | 'too_deep' | 'invalid_body';

const KINDS: readonly Kind[] = ['grievance', 'conversation'];

export class PostService {
	constructor(private deps: { sql: Sql; handleKey: Uint8Array }) {}

	async createPost(accountId: string, input: NewPost): Promise<Result<{ id: number }, CreatePostError>> {
		const title = input.title.trim();
		const body = input.body.trim();
		if (!KINDS.includes(input.kind as Kind)) return { ok: false, error: 'invalid_kind' };
		if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) return { ok: false, error: 'invalid_title' };
		if (body.length === 0 || body.length > LIMITS.bodyMax) return { ok: false, error: 'invalid_body' };

		const [row] = await this.deps.sql`
			insert into posts (category_id, account_id, kind, title, body)
			select id, ${accountId}, ${input.kind}, ${title}, ${body} from categories where slug = ${input.category}
			returning id`;
		return row ? { ok: true, id: Number(row.id) } : { ok: false, error: 'unknown_category' };
	}

	async createReply(
		accountId: string,
		postId: number,
		input: { body: string; parentId?: number }
	): Promise<Result<{ id: number }, CreateReplyError>> {
		const body = input.body.trim();
		if (body.length === 0 || body.length > LIMITS.replyMax) return { ok: false, error: 'invalid_body' };
		const { sql } = this.deps;

		const [post] = await sql`select 1 from posts where id = ${postId} and status = 'published'`;
		if (!post) return { ok: false, error: 'not_found' };

		if (input.parentId !== undefined) {
			const [parent] = await sql`
				select parent_id from replies where id = ${input.parentId} and post_id = ${postId}`;
			if (!parent) return { ok: false, error: 'not_found' };
			if (parent.parent_id !== null) return { ok: false, error: 'too_deep' };
		}

		const id = await sql.begin(async (tx) => {
			const [row] = await tx`
				insert into replies (post_id, parent_id, account_id, body)
				values (${postId}, ${input.parentId ?? null}, ${accountId}, ${body}) returning id`;
			await tx`update posts set reply_count = reply_count + 1 where id = ${postId}`;
			return Number(row.id);
		});
		return { ok: true, id };
	}

	async getThread(viewerId: string, postId: number): Promise<ThreadView | null> {
		const { sql, handleKey } = this.deps;
		const [p] = await sql`
			select p.*, c.slug, c.name from posts p join categories c on c.id = p.category_id
			where p.id = ${postId} and p.status = 'published'`;
		if (!p) return null;

		const rows = await sql`select * from replies where post_id = ${postId} order by id`;
		const votes = await sql`
			select v.target_type, v.target_id from votes v
			where v.account_id = ${viewerId}
			  and ((v.target_type = 'post' and v.target_id = ${postId})
			    or (v.target_type = 'reply' and v.target_id in (select id from replies where post_id = ${postId})))`;
		const voted = new Set(votes.map((v) => `${v.target_type}:${v.target_id}`));
		const [metooed] = await sql`select 1 from metoos where account_id = ${viewerId} and post_id = ${postId}`;

		const names = new ThreadHandles(handleKey, postId);
		const post: PostView = {
			id: Number(p.id),
			category: { slug: p.slug, name: p.name },
			kind: p.kind,
			title: p.title,
			body: p.body,
			handle: names.for(p.account_id),
			publishedOn: new Date(p.published_on).toISOString(),
			upvotes: p.upvotes,
			metoo: p.metoo,
			replyCount: p.reply_count,
			voted: voted.has(`post:${postId}`),
			metooed: Boolean(metooed),
			mine: p.account_id === viewerId,
			distress: showsDistress(`${p.title}\n${p.body}`)
		};

		const byId = new Map<number, ReplyView>();
		for (const r of rows) {
			const status = r.status as Status;
			const visible = status === 'published';
			byId.set(Number(r.id), {
				id: Number(r.id),
				parentId: r.parent_id === null ? null : Number(r.parent_id),
				handle: names.for(r.account_id),
				isOp: r.account_id === p.account_id,
				status,
				body: visible ? r.body : '',
				publishedOn: new Date(r.published_on).toISOString(),
				upvotes: r.upvotes,
				voted: voted.has(`reply:${r.id}`),
				mine: r.account_id === viewerId,
				distress: visible && showsDistress(r.body),
				children: []
			});
		}

		const top: ReplyView[] = [];
		for (const reply of byId.values()) {
			if (reply.parentId === null) top.push(reply);
			else byId.get(reply.parentId)?.children.push(reply);
		}
		top.sort((a, b) => b.upvotes - a.upvotes || a.id - b.id);

		return { post, replies: top, viewerHandle: names.for(viewerId) };
	}

	async deletePost(accountId: string, postId: number): Promise<Result<object, 'not_found'>> {
		const rows = await this.deps.sql`
			update posts set status = 'deleted', title = '', body = ''
			where id = ${postId} and account_id = ${accountId} and status = 'published' returning 1`;
		return rows.length ? { ok: true } : { ok: false, error: 'not_found' };
	}

	async deleteReply(accountId: string, replyId: number): Promise<Result<object, 'not_found'>> {
		const done = await this.deps.sql.begin(async (tx) => {
			const [row] = await tx`
				update replies set status = 'deleted', body = ''
				where id = ${replyId} and account_id = ${accountId} and status = 'published' returning post_id`;
			if (!row) return false;
			await tx`update posts set reply_count = reply_count - 1 where id = ${row.post_id}`;
			return true;
		});
		return done ? { ok: true } : { ok: false, error: 'not_found' };
	}
}
