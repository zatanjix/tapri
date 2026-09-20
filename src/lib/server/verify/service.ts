import { timingSafeEqual } from 'node:crypto';
import type { Sql } from '../db';
import { hmac, randomToken } from '../crypto/encoding';
import { blindSign } from '../crypto/issuer';
import type { IssuerKeys } from '../crypto/keys';
import type { Mailer } from '../mail/mailer';
import { normalizeEmail } from './email';
import { generateOtp } from './otp';

export const MAX_ATTEMPTS = 5;
export const MAX_PENDING_PER_EMAIL = 3;
export const CODE_TTL_SECONDS = 600;

export type StartError = 'invalid_email' | 'wrong_key' | 'invalid_token' | 'already_claimed' | 'rate_limited';
export type OtpError = 'expired' | 'wrong_code' | 'too_many_attempts' | 'already_claimed';
export type StartResult = { ok: true; pendingId: string } | { ok: false; error: StartError };
export type OtpResult = { ok: true; blindSig: Uint8Array } | { ok: false; error: OtpError };

export interface VerifyDeps {
	sql: Sql;
	keys: IssuerKeys;
	semesterKey: Buffer;
	mailer: Mailer;
}

/**
 * Pending verifications live in the database so they work across serverless instances.
 * A row holds only a keyed hash of the email, a keyed hash of the code and the (blinded) ticket,
 * and is deleted on success, lockout or expiry.
 */
export class VerifyService {
	constructor(private deps: VerifyDeps) {}

	async start(rawEmail: string, blindedMsg: Uint8Array, keyId: string): Promise<StartResult> {
		const { keys, sql, mailer } = this.deps;
		if (keyId !== keys.keyId) return { ok: false, error: 'wrong_key' };
		if (blindedMsg.length !== keys.modulusBytes) return { ok: false, error: 'invalid_token' };
		const email = normalizeEmail(rawEmail);
		if (!email) return { ok: false, error: 'invalid_email' };
		const emailHmac = this.hash(email);

		await sql`delete from verifications where expires_at <= now()`;

		const [claimed] = await sql`
			select 1 from issuances where email_hmac = ${emailHmac} and semester = ${keys.keyId}`;
		if (claimed) return { ok: false, error: 'already_claimed' };

		const [{ n }] = await sql`select count(*)::int as n from verifications where email_hmac = ${emailHmac}`;
		if (n >= MAX_PENDING_PER_EMAIL) return { ok: false, error: 'rate_limited' };

		const pendingId = randomToken(24);
		const otp = generateOtp();
		await sql`
			insert into verifications (id, email_hmac, semester, blinded_msg, otp_hash, expires_at)
			values (${pendingId}, ${emailHmac}, ${keys.keyId}, ${Buffer.from(blindedMsg)}, ${this.hash(`${pendingId}:${otp}`)},
			        now() + make_interval(secs => ${CODE_TTL_SECONDS}))`;
		try {
			await mailer.sendOtp(email, otp);
		} catch (e) {
			await sql`delete from verifications where id = ${pendingId}`;
			throw e;
		}
		return { ok: true, pendingId };
	}

	async confirmOtp(pendingId: string, code: string): Promise<OtpResult> {
		const { keys, sql } = this.deps;
		const [row] = await sql`select * from verifications where id = ${pendingId} and expires_at > now()`;
		if (!row) return { ok: false, error: 'expired' };

		const given = this.hash(`${pendingId}:${code.trim()}`);
		if (!timingSafeEqual(given, Buffer.from(row.otp_hash))) {
			const [u] = await sql`update verifications set attempts = attempts + 1 where id = ${pendingId} returning attempts`;
			if (!u || u.attempts >= MAX_ATTEMPTS) {
				await sql`delete from verifications where id = ${pendingId}`;
				return { ok: false, error: 'too_many_attempts' };
			}
			return { ok: false, error: 'wrong_code' };
		}

		const removed = await sql`delete from verifications where id = ${pendingId} returning 1`;
		if (removed.length === 0) return { ok: false, error: 'expired' };

		const inserted = await sql`
			insert into issuances (email_hmac, semester) values (${row.email_hmac}, ${row.semester})
			on conflict do nothing returning 1`;
		if (inserted.length === 0) return { ok: false, error: 'already_claimed' };

		return { ok: true, blindSig: await blindSign(keys, new Uint8Array(row.blinded_msg)) };
	}

	private hash(value: string): Buffer {
		return hmac(this.deps.semesterKey, value);
	}
}
