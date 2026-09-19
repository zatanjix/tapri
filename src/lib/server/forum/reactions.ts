import type { Sql } from '../db';
import type { Result } from './types';

export type TargetType = 'post' | 'reply';
export type ToggleResult = Result<{ active: boolean; count: number }, 'not_found'>;

const TABLE: Record<TargetType, string> = { post: 'posts', reply: 'replies' };

export class ReactionService {
	constructor(private sql: Sql) {}

	toggleVote(accountId: string, targetType: TargetType, targetId: number): Promise<ToggleResult> {
		return this.toggle({
			table: TABLE[targetType],
			column: 'upvotes',
			targetId,
			add: (tx) => tx`insert into votes (account_id, target_type, target_id)
				values (${accountId}, ${targetType}, ${targetId}) on conflict do nothing returning 1`,
			remove: (tx) => tx`delete from votes
				where account_id = ${accountId} and target_type = ${targetType} and target_id = ${targetId}`
		});
	}

	toggleMetoo(accountId: string, postId: number): Promise<ToggleResult> {
		return this.toggle({
			table: 'posts',
			column: 'metoo',
			targetId: postId,
			add: (tx) => tx`insert into metoos (account_id, post_id)
				values (${accountId}, ${postId}) on conflict do nothing returning 1`,
			remove: (tx) => tx`delete from metoos where account_id = ${accountId} and post_id = ${postId}`
		});
	}

	/** Adds the reaction, or removes it if it already exists, and keeps the counter in step. */
	private async toggle(o: {
		table: string;
		column: 'upvotes' | 'metoo';
		targetId: number;
		add: (tx: Sql) => PromiseLike<ArrayLike<unknown>>;
		remove: (tx: Sql) => Promise<unknown>;
	}): Promise<ToggleResult> {
		const { sql } = this;
		return sql.begin(async (tx0) => {
			const tx = tx0 as unknown as Sql;
			const [target] = await tx`
				select 1 from ${sql(o.table)} where id = ${o.targetId} and status = 'published' for update`;
			if (!target) return { ok: false, error: 'not_found' } as const;

			const added = (await o.add(tx)).length > 0;
			if (!added) await o.remove(tx);
			const [row] = await tx`
				update ${sql(o.table)} set ${sql(o.column)} = ${sql(o.column)} + ${added ? 1 : -1}
				where id = ${o.targetId} returning ${sql(o.column)} as count`;
			return { ok: true, active: added, count: row.count as number } as const;
		}) as Promise<ToggleResult>;
	}
}
