import type { Sql } from '../db';
import { randomToken, sha256 } from '../crypto/encoding';
import { normalizeSecret } from '../../shared/secret';

export const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'sid';

export class SessionService {
	constructor(private sql: Sql) {}

	async create(accountId: string): Promise<string> {
		const token = randomToken(32);
		await this.sql`
			insert into sessions (token_hash, account_id, expires_at)
			values (${sha256(token)}, ${accountId}, now() + make_interval(days => ${SESSION_DAYS}))`;
		return token;
	}

	async signIn(rawSecret: string): Promise<string | null> {
		const secret = normalizeSecret(rawSecret);
		if (!secret) return null;
		const [row] = await this.sql`
			select id from accounts
			where secret_hash = ${sha256(secret)} and status = 'active' and valid_until >= current_date`;
		return row ? this.create(row.id) : null;
	}

	async resolve(token: string): Promise<{ accountId: string } | null> {
		const [row] = await this.sql`
			select s.account_id from sessions s join accounts a on a.id = s.account_id
			where s.token_hash = ${sha256(token)} and s.expires_at > now()
			  and a.status = 'active' and a.valid_until >= current_date`;
		return row ? { accountId: row.account_id } : null;
	}

	async destroy(token: string): Promise<void> {
		await this.sql`delete from sessions where token_hash = ${sha256(token)}`;
	}

	async purgeExpired(): Promise<void> {
		await this.sql`delete from sessions where expires_at <= now()`;
	}
}
