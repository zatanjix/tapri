import type { Sql } from '../db';
import { sha256 } from '../crypto/encoding';
import { verifyToken } from '../crypto/issuer';
import type { IssuerKeys } from '../crypto/keys';
import { nextSemester, semesterEnd } from '../crypto/semester';
import { normalizeSecret } from '../../shared/secret';

export type RedeemError = 'wrong_key' | 'invalid_token' | 'invalid_secret' | 'already_spent' | 'secret_taken' | 'no_account';
export type RedeemResult = { ok: true; accountId: string } | { ok: false; error: RedeemError };

export interface SignedToken {
	keyId: string;
	token: Uint8Array;
	signature: Uint8Array;
}

class Abort extends Error {
	constructor(public code: RedeemError) {
		super(code);
	}
}

export class AccountService {
	constructor(private deps: { sql: Sql; keys: IssuerKeys }) {}

	async redeem(input: SignedToken & { accountSecret: string }): Promise<RedeemResult> {
		const secret = normalizeSecret(input.accountSecret);
		if (!secret) return { ok: false, error: 'invalid_secret' };
		const checked = await this.check(input);
		if (checked) return { ok: false, error: checked };

		return this.spend(input, async (tx) => {
			const [row] = await tx`
				insert into accounts (secret_hash, valid_until)
				values (${sha256(secret)}, ${this.validUntil()})
				on conflict (secret_hash) do nothing returning id`;
			if (!row) throw new Abort('secret_taken');
			return row.id as string;
		});
	}

	async renew(accountId: string, input: SignedToken): Promise<RedeemResult> {
		const checked = await this.check(input);
		if (checked) return { ok: false, error: checked };

		return this.spend(input, async (tx) => {
			const [row] = await tx`
				update accounts set valid_until = greatest(valid_until, ${this.validUntil()})
				where id = ${accountId} and status = 'active' returning id`;
			if (!row) throw new Abort('no_account');
			return row.id as string;
		});
	}

	private async check(input: SignedToken): Promise<RedeemError | null> {
		if (input.keyId !== this.deps.keys.keyId) return 'wrong_key';
		if (!(await verifyToken(this.deps.keys, input.token, input.signature))) return 'invalid_token';
		return null;
	}

	/** Marks the token spent and runs `then` in the same transaction; any Abort rolls both back. */
	private async spend(input: SignedToken, then: (tx: Sql) => Promise<string>): Promise<RedeemResult> {
		try {
			const accountId = await this.deps.sql.begin(async (tx) => {
				const spent = await tx`
					insert into spent_tokens (token_hash, key_id) values (${sha256(input.token)}, ${input.keyId})
					on conflict do nothing returning 1`;
				if (spent.length === 0) throw new Abort('already_spent');
				return then(tx as unknown as Sql);
			});
			return { ok: true, accountId };
		} catch (e) {
			if (e instanceof Abort) return { ok: false, error: e.code };
			throw e;
		}
	}

	private validUntil(): Date {
		return semesterEnd(nextSemester(this.deps.keys.keyId));
	}
}
