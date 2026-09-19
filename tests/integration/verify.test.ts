import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createToken, importIssuerKey } from '../../src/lib/client/tokens';
import type { Sql } from '../../src/lib/server/db';
import { MemoryMailer } from '../../src/lib/server/mail/mailer';
import { PendingStore } from '../../src/lib/server/verify/pending';
import { VerifyService, type PendingVerification } from '../../src/lib/server/verify/service';
import { clearData, freshDb } from '../helpers/db';
import { testKeys } from '../helpers/keys';

let sql: Sql;
let mailer: MemoryMailer;
let verify: VerifyService;
const EMAIL = '00x0001@iitb.ac.in';

beforeAll(async () => {
	sql = await freshDb();
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	mailer = new MemoryMailer();
	verify = new VerifyService({
		sql,
		keys: await testKeys(),
		semesterKey: randomBytes(32),
		mailer,
		pending: new PendingStore<PendingVerification>(10 * 60_000)
	});
});

async function blinded() {
	const keys = await testKeys();
	return (await createToken(await importIssuerKey(keys.publicSpki), keys.keyId)).blindedMsg;
}

describe('VerifyService', () => {
	it('sends an OTP and returns a blind signature for the right code', async () => {
		const start = await verify.start(EMAIL, await blinded(), '2026-autumn');
		expect(start.ok).toBe(true);
		if (!start.ok) return;
		const result = await verify.confirmOtp(start.pendingId, mailer.lastCodeFor(EMAIL)!);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.blindSig.length).toBe(256);
	});

	it('rejects non-IITB emails without sending anything', async () => {
		expect(await verify.start('a@gmail.com', await blinded(), '2026-autumn')).toEqual({ ok: false, error: 'invalid_email' });
		expect(mailer.sent).toHaveLength(0);
	});

	it('rejects a stale key id and a malformed blinded message', async () => {
		expect(await verify.start(EMAIL, await blinded(), '2026-spring')).toEqual({ ok: false, error: 'wrong_key' });
		expect(await verify.start(EMAIL, new Uint8Array(10), '2026-autumn')).toEqual({ ok: false, error: 'invalid_token' });
	});

	it('allows one issuance per email per semester', async () => {
		const a = await verify.start(EMAIL, await blinded(), '2026-autumn');
		if (!a.ok) throw new Error('start failed');
		await verify.confirmOtp(a.pendingId, mailer.lastCodeFor(EMAIL)!);
		expect(await verify.start(EMAIL, await blinded(), '2026-autumn')).toEqual({ ok: false, error: 'already_claimed' });
	});

	it('locks out after 5 wrong codes', async () => {
		const start = await verify.start(EMAIL, await blinded(), '2026-autumn');
		if (!start.ok) throw new Error('start failed');
		for (let i = 0; i < 4; i++) expect(await verify.confirmOtp(start.pendingId, '000000x')).toEqual({ ok: false, error: 'wrong_code' });
		expect(await verify.confirmOtp(start.pendingId, '000000x')).toEqual({ ok: false, error: 'too_many_attempts' });
		expect(await verify.confirmOtp(start.pendingId, mailer.lastCodeFor(EMAIL)!)).toEqual({ ok: false, error: 'expired' });
	});

	it('stores only an HMAC of the email', async () => {
		const start = await verify.start(EMAIL, await blinded(), '2026-autumn');
		if (!start.ok) throw new Error('start failed');
		await verify.confirmOtp(start.pendingId, mailer.lastCodeFor(EMAIL)!);
		const rows = await sql`select email_hmac, semester from issuances`;
		expect(rows).toHaveLength(1);
		expect(Buffer.from(rows[0].email_hmac).includes(Buffer.from(EMAIL))).toBe(false);
	});
});
