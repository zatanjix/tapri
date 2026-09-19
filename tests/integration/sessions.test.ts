import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../src/lib/server/accounts/sessions';
import { sha256 } from '../../src/lib/server/crypto/encoding';
import type { Sql } from '../../src/lib/server/db';
import { generateAccountSecret, normalizeSecret } from '../../src/lib/shared/secret';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let sessions: SessionService;
let secret: string;
let accountId: string;

beforeAll(async () => {
	sql = await freshDb();
	sessions = new SessionService(sql);
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	secret = generateAccountSecret();
	const [row] = await sql`
		insert into accounts (secret_hash, valid_until) values (${sha256(normalizeSecret(secret)!)}, '2099-01-01') returning id`;
	accountId = row.id;
});

describe('SessionService', () => {
	it('signs in with the recovery key and resolves the session', async () => {
		const token = await sessions.signIn(secret.toLowerCase());
		expect(token).toBeTruthy();
		expect(await sessions.resolve(token!)).toEqual({ accountId });
	});

	it('rejects unknown keys', async () => {
		expect(await sessions.signIn(generateAccountSecret())).toBeNull();
	});

	it('refuses banned and expired accounts', async () => {
		const token = (await sessions.signIn(secret))!;
		await sql`update accounts set status = 'banned'`;
		expect(await sessions.resolve(token)).toBeNull();
		await sql`update accounts set status = 'active', valid_until = '2000-01-01'`;
		expect(await sessions.signIn(secret)).toBeNull();
	});

	it('destroys sessions and stores only token hashes', async () => {
		const token = (await sessions.signIn(secret))!;
		const [row] = await sql`select token_hash from sessions`;
		expect(Buffer.from(row.token_hash).toString('base64url')).not.toBe(token);
		await sessions.destroy(token);
		expect(await sessions.resolve(token)).toBeNull();
	});

	it('purges expired sessions', async () => {
		await sessions.signIn(secret);
		await sql`update sessions set expires_at = now() - interval '1 minute'`;
		await sessions.purgeExpired();
		expect((await sql`select count(*)::int as n from sessions`)[0].n).toBe(0);
	});
});
