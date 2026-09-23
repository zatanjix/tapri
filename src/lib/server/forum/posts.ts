import { randomBytes } from 'node:crypto';
import type { Sql } from '../db';
import { showsDistress } from '../../shared/distress';
import { parseMarkdown } from '../../shared/markdown';
import { IMAGE_LIMITS, processImage, type ProcessedImage } from '../images/process';
import type { ImageService, StoredImage } from '../images/service';
import { ThreadHandles } from './handles';
import { NO_DOWNVOTES } from './reactions';
import { LIMITS, type Kind, type PostView, type ReplyView, type Result, type Status, type ThreadView } from './types';

export interface NewPost {
	category: string;
	kind: string;
	title: string;
	body: string;
}

export type CreatePostError =
	| 'unknown_category'
	| 'invalid_kind'
	| 'invalid_title'
	| 'invalid_body'
	| 'rate_limited'
	| 'too_many_images'
	| 'invalid_image'
	| 'images_unavailable';
export type CreateReplyError = 'not_found' | 'too_deep' | 'invalid_body' | 'rate_limited';

/** Official posts belong to a system account nobody can sign in as, never to a person's account. */
export const SYSTEM_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
export const OFFICIAL_HANDLE = 'Tapri';

/** Per account per hour. Counted from the account's own recent rows, so no extra data is kept. */
export const HOURLY_LIMITS = { posts: 5, replies: 30 } as const;

const KINDS: readonly Kind[] = ['grievance', 'conversation'];

/** A thread's public address: 64 random bits, so links reveal nothing about order or volume. */
export const newSlug = () => randomBytes(8).toString('hex');
export const SLUG = /^[0-9a-f]{16}$/;

/**
 * What the admin page accepts in "Reply as Tapri": a thread's link, its address, or (for links
 * shared before addresses existed) its old number.
 */
export function threadRef(input: string): { slug: string } | { id: number } | null {
	const raw = input.trim().replace(/^#/, '');
	const last = raw.split(/[?#]/)[0].replace(/\/+$/, '').split('/').pop()?.trim().toLowerCase() ?? '';
	if (SLUG.test(last)) return { slug: last };
	if (/^[1-9]\d{0,15}$/.test(last)) return { id: Number(last) };
	return null;
}

export class PostService {
	constructor(private deps: { sql: Sql; handleKey: Uint8Array; images?: ImageService | null }) {}

	/** `images` are raw uploads; they are re-encoded without metadata before anything is stored. */
	async createPost(accountId: string, input: NewPost, images: Uint8Array[] = []): Promise<Result<{ id: number }, CreatePostError>> {
		const title = input.title.trim();
		const body = input.body.trim();
		if (!KINDS.includes(input.kind as Kind)) return { ok: false, error: 'invalid_kind' };
		if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) return { ok: false, error: 'invalid_title' };
		if (body.length === 0 || body.length > LIMITS.bodyMax) return { ok: false, error: 'invalid_body' };
		if (images.length > IMAGE_LIMITS.perPost) return { ok: false, error: 'too_many_images' };
		const imageService = this.deps.images;
		if (images.length && !imageService) return { ok: false, error: 'images_unavailable' };
		const { sql } = this.deps;

		const [{ n }] = await sql`
			select count(*)::int as n from posts
			where account_id = ${accountId} and published_on > now() - interval '1 hour'`;
		if (n >= HOURLY_LIMITS.posts) return { ok: false, error: 'rate_limited' };

		const [category] = await sql`select id from categories where slug = ${input.category}`;
		if (!category) return { ok: false, error: 'unknown_category' };

		const processed: ProcessedImage[] = [];
		for (const raw of images) {
			const img = await processImage(raw);
			if (!img) return { ok: false, error: 'invalid_image' };
			processed.push(img);
		}
		const stored: StoredImage[] = processed.length ? await imageService!.upload(processed) : [];

		try {
			const id = await sql.begin(async (tx) => {
				const [row] = await tx`
					insert into posts (category_id, account_id, kind, title, body, format, slug)
					values (${category.id}, ${accountId}, ${input.kind}, ${title}, ${body}, 'markdown', ${newSlug()}) returning id`;
				// Your own posts are followed from the start.
				await tx`insert into follows (account_id, post_id) values (${accountId}, ${row.id})`;
				for (const [position, img] of stored.entries())
					await tx`
						insert into post_images (id, post_id, position, width, height, bytes)
						values (${img.id}, ${row.id}, ${position}, ${img.width}, ${img.height}, ${img.bytes})`;
				return Number(row.id);
			});
			return { ok: true, id };
		} catch (e) {
			await imageService?.discard(stored.map((s) => s.id));
			throw e;
		}
	}

	/** Only reachable from the admin page. Skips per-account limits, which exist to stop abuse by people. */
	async createOfficialPost(input: { category: string; title: string; body: string }): Promise<Result<{ id: number }, CreatePostError>> {
		const title = input.title.trim();
		const body = input.body.trim();
		if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) return { ok: false, error: 'invalid_title' };
		if (body.length === 0 || body.length > LIMITS.bodyMax) return { ok: false, error: 'invalid_body' };
		const [row] = await this.deps.sql`
			insert into posts (category_id, account_id, kind, title, body, official, format, slug)
			select id, ${SYSTEM_ACCOUNT_ID}, 'conversation', ${title}, ${body}, true, 'markdown', ${newSlug()} from categories where slug = ${input.category}
			returning id`;
		return row ? { ok: true, id: Number(row.id) } : { ok: false, error: 'unknown_category' };
	}

	async createOfficialReply(postId: number, input: { body: string }): Promise<Result<{ id: number }, 'not_found' | 'invalid_body'>> {
		const body = input.body.trim();
		if (body.length === 0 || body.length > LIMITS.replyMax) return { ok: false, error: 'invalid_body' };
		const id = await this.deps.sql.begin(async (tx) => {
			const [post] = await tx`select 1 from posts where id = ${postId} and status = 'published'`;
			if (!post) return null;
			const [row] = await tx`
				insert into replies (post_id, account_id, body, official, format)
				values (${postId}, ${SYSTEM_ACCOUNT_ID}, ${body}, true, 'markdown') returning id`;
			await tx`update posts set reply_count = reply_count + 1 where id = ${postId}`;
			return Number(row.id);
		});
		return id === null ? { ok: false, error: 'not_found' } : { ok: true, id };
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

		const [{ n }] = await sql`
			select count(*)::int as n from replies
			where account_id = ${accountId} and published_on > now() - interval '1 hour'`;
		if (n >= HOURLY_LIMITS.replies) return { ok: false, error: 'rate_limited' };

		if (input.parentId !== undefined) {
			const [parent] = await sql`
				select parent_id from replies where id = ${input.parentId} and post_id = ${postId}`;
			if (!parent) return { ok: false, error: 'not_found' };
			if (parent.parent_id !== null) return { ok: false, error: 'too_deep' };
		}

		const id = await sql.begin(async (tx) => {
			const [row] = await tx`
				insert into replies (post_id, parent_id, account_id, body, format)
				values (${postId}, ${input.parentId ?? null}, ${accountId}, ${body}, 'markdown') returning id`;
			await tx`update posts set reply_count = reply_count + 1 where id = ${postId}`;
			// Replying follows the thread, with everything up to your own reply counted as seen.
			await tx`
				insert into follows (account_id, post_id, seen_replies)
				select ${accountId}, id, reply_count from posts where id = ${postId}
				on conflict (account_id, post_id) do update set seen_replies = excluded.seen_replies`;
			return Number(row.id);
		});
		return { ok: true, id };
	}

	/** The internal id behind a shared address, or null. */
	async idForSlug(slug: string): Promise<number | null> {
		if (!SLUG.test(slug)) return null;
		const [row] = await this.deps.sql`select id from posts where slug = ${slug}`;
		return row ? Number(row.id) : null;
	}

	/** The address of a thread known by its number, for redirecting old links. */
	async slugForId(id: number): Promise<string | null> {
		const [row] = await this.deps.sql`select slug from posts where id = ${id}`;
		return row ? (row.slug as string) : null;
	}

	async getThread(viewerId: string, postId: number): Promise<ThreadView | null> {
		const { sql, handleKey } = this.deps;
		const [p] = await sql`
			select p.*, c.slug as category_slug, c.name as category_name from posts p join categories c on c.id = p.category_id
			where p.id = ${postId} and p.status = 'published'`;
		if (!p) return null;

		const rows = await sql`select * from replies where post_id = ${postId} order by id`;
		const votes = await sql`
			select v.target_type, v.target_id, v.value from votes v
			where v.account_id = ${viewerId}
			  and ((v.target_type = 'post' and v.target_id = ${postId})
			    or (v.target_type = 'reply' and v.target_id in (select id from replies where post_id = ${postId})))`;
		const myVotes = new Map<string, -1 | 1>(votes.map((v) => [`${v.target_type}:${v.target_id}`, v.value]));
		const myVote = (key: string): -1 | 0 | 1 => myVotes.get(key) ?? 0;
		const [metooed] = await sql`select 1 from metoos where account_id = ${viewerId} and post_id = ${postId}`;
		// Opening a followed thread marks its replies as seen.
		const images = await sql<{ id: string; width: number; height: number }[]>`
			select id, width, height from post_images where post_id = ${postId} order by position`;
		const followed = await sql`
			update follows set seen_replies = ${p.reply_count}
			where account_id = ${viewerId} and post_id = ${postId} returning 1`;

		const names = new ThreadHandles(handleKey, postId);
		const post: PostView = {
			id: Number(p.id),
			slug: p.slug,
			category: { slug: p.category_slug, name: p.category_name },
			kind: p.kind,
			title: p.title,
			body: p.body,
			doc: p.format === 'markdown' ? parseMarkdown(p.body) : null,
			images: images.map(({ id, width, height }) => ({ id, width, height })),
			handle: p.official ? OFFICIAL_HANDLE : names.for(p.account_id),
			publishedOn: new Date(p.published_on).toISOString(),
			upvotes: p.upvotes,
			downvotes: p.downvotes,
			metoo: p.metoo,
			replyCount: p.reply_count,
			myVote: myVote(`post:${postId}`),
			canDownvote: !NO_DOWNVOTES.includes(p.category_slug),
			metooed: Boolean(metooed),
			following: followed.length > 0,
			mine: p.account_id === viewerId,
			distress: showsDistress(`${p.title}\n${p.body}`),
			official: p.official
		};

		const byId = new Map<number, ReplyView>();
		for (const r of rows) {
			const status = r.status as Status;
			const visible = status === 'published';
			byId.set(Number(r.id), {
				id: Number(r.id),
				parentId: r.parent_id === null ? null : Number(r.parent_id),
				handle: r.official ? OFFICIAL_HANDLE : names.for(r.account_id),
				isOp: !r.official && r.account_id === p.account_id,
				status,
				body: visible ? r.body : '',
				doc: visible && r.format === 'markdown' ? parseMarkdown(r.body) : null,
				publishedOn: new Date(r.published_on).toISOString(),
				upvotes: r.upvotes,
				downvotes: r.downvotes,
				myVote: myVote(`reply:${r.id}`),
				mine: r.account_id === viewerId,
				distress: visible && showsDistress(r.body),
				official: r.official,
				children: []
			});
		}

		const top: ReplyView[] = [];
		for (const reply of byId.values()) {
			if (reply.parentId === null) top.push(reply);
			else byId.get(reply.parentId)?.children.push(reply);
		}
		top.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes) || a.id - b.id);

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
