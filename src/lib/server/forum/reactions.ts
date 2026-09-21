import type { Sql } from '../db';
import type { Result } from './types';

export type TargetType = 'post' | 'reply';
export type ToggleResult = Result<{ active: boolean; count: number }, 'not_found'>;
export type VoteResult = Result<{ vote: -1 | 0 | 1; upvotes: number; downvotes: number }, 'not_found' | 'not_allowed'>;

/** Downvoting someone's struggle helps nobody, so Wellbeing threads only take upvotes. */
export const NO_DOWNVOTES = ['wellbeing'];

export class ReactionService {
	constructor(private sql: Sql) {}

	/**
	 * Casting the same vote again takes it back; casting the opposite one switches it.
	 * The counters on the post or reply are kept in step inside the same transaction.
	 */
	vote(accountId: string, targetType: TargetType, targetId: number, value: 1 | -1): Promise<VoteResult> {
		return this.sql.begin(async (tx0) => {
			const tx = tx0 as unknown as Sql;
			const [target] =
				targetType === 'post'
					? await tx`
						select c.slug from posts p join categories c on c.id = p.category_id
						where p.id = ${targetId} and p.status = 'published' for update of p`
					: await tx`
						select c.slug from replies r join posts p on p.id = r.post_id join categories c on c.id = p.category_id
						where r.id = ${targetId} and r.status = 'published' for update of r`;
			if (!target) return { ok: false, error: 'not_found' } as const;
			if (value === -1 && NO_DOWNVOTES.includes(target.slug)) return { ok: false, error: 'not_allowed' } as const;

			const [existing] = await tx`
				select value from votes where account_id = ${accountId} and target_type = ${targetType} and target_id = ${targetId}`;
			const before: -1 | 0 | 1 = existing ? existing.value : 0;
			const after: -1 | 0 | 1 = before === value ? 0 : value;

			if (after === 0) {
				await tx`delete from votes where account_id = ${accountId} and target_type = ${targetType} and target_id = ${targetId}`;
			} else if (before === 0) {
				await tx`insert into votes (account_id, target_type, target_id, value) values (${accountId}, ${targetType}, ${targetId}, ${after})`;
			} else {
				await tx`update votes set value = ${after} where account_id = ${accountId} and target_type = ${targetType} and target_id = ${targetId}`;
			}

			const up = (after === 1 ? 1 : 0) - (before === 1 ? 1 : 0);
			const down = (after === -1 ? 1 : 0) - (before === -1 ? 1 : 0);
			const table = targetType === 'post' ? 'posts' : 'replies';
			const [row] = await tx`
				update ${this.sql(table)} set upvotes = upvotes + ${up}, downvotes = downvotes + ${down}
				where id = ${targetId} returning upvotes, downvotes`;
			return { ok: true, vote: after, upvotes: row.upvotes, downvotes: row.downvotes } as const;
		}) as Promise<VoteResult>;
	}

	/** Adds "affects me too", or removes it if already there, keeping the counter in step. */
	toggleMetoo(accountId: string, postId: number): Promise<ToggleResult> {
		return this.sql.begin(async (tx0) => {
			const tx = tx0 as unknown as Sql;
			const [target] = await tx`select 1 from posts where id = ${postId} and status = 'published' for update`;
			if (!target) return { ok: false, error: 'not_found' } as const;

			const added = (await tx`insert into metoos (account_id, post_id) values (${accountId}, ${postId})
				on conflict do nothing returning 1`).length > 0;
			if (!added) await tx`delete from metoos where account_id = ${accountId} and post_id = ${postId}`;
			const [row] = await tx`
				update posts set metoo = metoo + ${added ? 1 : -1} where id = ${postId} returning metoo as count`;
			return { ok: true, active: added, count: row.count as number } as const;
		}) as Promise<ToggleResult>;
	}
}
