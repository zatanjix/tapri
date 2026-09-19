import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createToken, finalizeToken, importIssuerKey } from '../../src/lib/client/tokens';
import { AccountService } from '../../src/lib/server/accounts/service';
import { blindSign } from '../../src/lib/server/crypto/issuer';
import type { Sql } from '../../src/lib/server/db';
import { generateAccountSecret } from '../../src/lib/shared/secret';
import { clearData, freshDb } from '../helpers/db';
import { testKeys } from '../helpers/keys';

let sql: Sql;
let accounts: AccountService;

beforeAll(async () => {
	sql = await freshDb();
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	accounts = new AccountService({ sql, keys: await testKeys() });
});

async function signedToken() {
	const keys = await testKeys();
	const pub = await importIssuerKey(keys.publicSpki);
	const t = await createToken(pub, keys.keyId);
	const signature = await finalizeToken(pub, t, await blindSign(keys, t.blindedMsg));
	return { keyId: keys.keyId, token: t.preparedMsg, signature };
}

describe('AccountService.redeem', () => {
	it('creates an account valid until the end of the next semester', async () => {
		const res = await accounts.redeem({ ...(await signedToken()), accountSecret: generateAccountSecret() });
		expect(res.ok).toBe(true);
		const [row] = await sql`select valid_until::text as v, status from accounts`;
		expect(row).toEqual({ v: '2027-06-30', status: 'active' });
	});

	it('rejects a token spent twice', async () => {
		const token = await signedToken();
		await accounts.redeem({ ...token, accountSecret: generateAccountSecret() });
		expect(await accounts.redeem({ ...token, accountSecret: generateAccountSecret() })).toEqual({ ok: false, error: 'already_spent' });
	});

	it('does not burn the token when the secret is invalid', async () => {
		const token = await signedToken();
		expect(await accounts.redeem({ ...token, accountSecret: 'nope' })).toEqual({ ok: false, error: 'invalid_secret' });
		expect((await accounts.redeem({ ...token, accountSecret: generateAccountSecret() })).ok).toBe(true);
	});

	it('rejects forged tokens and stale key ids', async () => {
		const token = await signedToken();
		const forged = { ...token, signature: new Uint8Array(token.signature.length) };
		expect(await accounts.redeem({ ...forged, accountSecret: generateAccountSecret() })).toEqual({ ok: false, error: 'invalid_token' });
		expect(await accounts.redeem({ ...token, keyId: '2026-spring', accountSecret: generateAccountSecret() })).toEqual({ ok: false, error: 'wrong_key' });
	});

	it('stores only a hash of the recovery key', async () => {
		const secret = generateAccountSecret();
		await accounts.redeem({ ...(await signedToken()), accountSecret: secret });
		const [row] = await sql`select secret_hash from accounts`;
		expect(Buffer.from(row.secret_hash).toString('utf8')).not.toContain(secret.replace(/-/g, ''));
	});
});

describe('AccountService.renew', () => {
	it('extends validity with a new semester token', async () => {
		const created = await accounts.redeem({ ...(await signedToken()), accountSecret: generateAccountSecret() });
		if (!created.ok) throw new Error('redeem failed');
		await sql`update accounts set valid_until = '2026-12-31'`;
		expect((await accounts.renew(created.accountId, await signedToken())).ok).toBe(true);
		const [row] = await sql`select valid_until::text as v from accounts`;
		expect(row.v).toBe('2027-06-30');
	});
});
