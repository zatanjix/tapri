import type { Sql } from '../db';
import type { Result } from './types';

/** Following by hand stops here. Posting and replying still follow automatically. */
export const MAX_FOLLOWS = 1000;

export type FollowResult = Result<{ active: boolean }, 'not_found' | 'too_many'>;

export class FollowService {
	constructor(private sql: Sql) {}

	/** Follows a published post, or unfollows it if already followed. */
	async toggle(accountId: string, postId: number): Promise<FollowResult> {
		const { sql } = this;
		const removed = await sql`delete from follows where account_id = ${accountId} and post_id = ${postId} returning 1`;
		if (removed.length) return { ok: true, active: false };

		const [post] = await sql`select reply_count from posts where id = ${postId} and status = 'published'`;
		if (!post) return { ok: false, error: 'not_found' };
		const [{ n }] = await sql`select count(*)::int as n from follows where account_id = ${accountId}`;
		if (n >= MAX_FOLLOWS) return { ok: false, error: 'too_many' };

		await sql`
			insert into follows (account_id, post_id, seen_replies)
			values (${accountId}, ${postId}, ${post.reply_count}) on conflict do nothing`;
		return { ok: true, active: true };
	}
}
