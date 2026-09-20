import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createToken, importIssuerKey } from '../../src/lib/client/tokens';
import type { Sql } from '../../src/lib/server/db';
import { MemoryMailer } from '../../src/lib/server/mail/mailer';
import { VerifyService } from '../../src/lib/server/verify/service';
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
	verify = new VerifyService({ sql, keys: await testKeys(), semesterKey: randomBytes(32), mailer });
});

async function blinded() {
	const keys = await testKeys();
	return (await createToken(await importIssuerKey(keys.publicSpki), keys.keyId)).blindedMsg;
}

async function started() {
	const start = await verify.start(EMAIL, await blinded(), '2026-autumn');
	if (!start.ok) throw new Error(start.error);
	return start.pendingId;
}

describe('VerifyService', () => {
	it('sends an OTP and returns a blind signature for the right code', async () => {
		const id = await started();
		const result = await verify.confirmOtp(id, mailer.lastCodeFor(EMAIL)!);
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
		const id = await started();
		await verify.confirmOtp(id, mailer.lastCodeFor(EMAIL)!);
		expect(await verify.start(EMAIL, await blinded(), '2026-autumn')).toEqual({ ok: false, error: 'already_claimed' });
	});

	it('limits outstanding codes per email', async () => {
		await started();
		await started();
		await started();
		expect(await verify.start(EMAIL, await blinded(), '2026-autumn')).toEqual({ ok: false, error: 'rate_limited' });
		expect(mailer.sent).toHaveLength(3);
	});

	it('locks out after 5 wrong codes', async () => {
		const id = await started();
		for (let i = 0; i < 4; i++) expect(await verify.confirmOtp(id, '000000x')).toEqual({ ok: false, error: 'wrong_code' });
		expect(await verify.confirmOtp(id, '000000x')).toEqual({ ok: false, error: 'too_many_attempts' });
		expect(await verify.confirmOtp(id, mailer.lastCodeFor(EMAIL)!)).toEqual({ ok: false, error: 'expired' });
	});

	it('expires codes', async () => {
		const id = await started();
		await sql`update verifications set expires_at = now() - interval '1 second'`;
		expect(await verify.confirmOtp(id, mailer.lastCodeFor(EMAIL)!)).toEqual({ ok: false, error: 'expired' });
	});

	it('stores neither the email nor the code, and clears the row after use', async () => {
		const id = await started();
		const code = mailer.lastCodeFor(EMAIL)!;
		const [row] = await sql`select * from verifications`;
		for (const v of Object.values(row)) {
			const bytes = Buffer.isBuffer(v) ? v : Buffer.from(String(v));
			expect(bytes.includes(Buffer.from(EMAIL))).toBe(false);
			expect(bytes.includes(Buffer.from(code))).toBe(false);
		}
		await verify.confirmOtp(id, code);
		expect(await sql`select 1 from verifications`).toHaveLength(0);
		const rows = await sql`select email_hmac from issuances`;
		expect(rows).toHaveLength(1);
	});
});
