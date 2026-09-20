import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createToken, finalizeToken, importIssuerKey } from '../../src/lib/client/tokens';
import { AccountService } from '../../src/lib/server/accounts/service';
import { SessionService } from '../../src/lib/server/accounts/sessions';
import type { Sql } from '../../src/lib/server/db';
import { MemoryMailer } from '../../src/lib/server/mail/mailer';
import { VerifyService } from '../../src/lib/server/verify/service';
import { generateAccountSecret } from '../../src/lib/shared/secret';
import { freshDb } from '../helpers/db';
import { testKeys } from '../helpers/keys';

let sql: Sql;
beforeAll(async () => {
	sql = await freshDb();
});
afterAll(async () => {
	await sql.end();
});

describe('identity flow', () => {
	it('email → OTP → blind signature → account → session, with no stored link to the email', async () => {
		const keys = await testKeys();
		const mailer = new MemoryMailer();
		const verify = new VerifyService({ sql, keys, semesterKey: randomBytes(32), mailer });
		const accounts = new AccountService({ sql, keys });
		const sessions = new SessionService(sql);
		const email = '00x0002@iitb.ac.in';

		// browser
		const pub = await importIssuerKey(keys.publicSpki);
		const token = await createToken(pub, keys.keyId);
		// server
		const start = await verify.start(email, token.blindedMsg, keys.keyId);
		if (!start.ok) throw new Error(start.error);
		const otp = await verify.confirmOtp(start.pendingId, mailer.lastCodeFor(email)!);
		if (!otp.ok) throw new Error(otp.error);
		expect(await sql`select 1 from verifications`).toHaveLength(0);
		// browser
		const signature = await finalizeToken(pub, token, otp.blindSig);
		const secret = generateAccountSecret();
		// server
		const redeemed = await accounts.redeem({ keyId: keys.keyId, token: token.preparedMsg, signature, accountSecret: secret });
		if (!redeemed.ok) throw new Error(redeemed.error);
		const session = await sessions.signIn(secret);
		expect(await sessions.resolve(session!)).toEqual({ accountId: redeemed.accountId });

		// Nothing in the database contains the email or the blinded message.
		const needles = [Buffer.from(email), Buffer.from(token.blindedMsg)];
		const tables = await sql<{ table_name: string }[]>`
			select table_name from information_schema.tables where table_schema = 'public'`;
		for (const { table_name } of tables) {
			for (const row of await sql`select * from ${sql(table_name)}`) {
				for (const value of Object.values(row)) {
					const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
					for (const needle of needles) expect(bytes.includes(needle), `${table_name} leaks`).toBe(false);
				}
			}
		}
	});
});
