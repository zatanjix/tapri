import type { Sql } from '../db';
import { hmac, randomToken, safeEqual } from '../crypto/encoding';
import { blindSign } from '../crypto/issuer';
import type { IssuerKeys } from '../crypto/keys';
import type { Mailer } from '../mail/mailer';
import { normalizeEmail } from './email';
import { generateOtp } from './otp';
import type { PendingStore } from './pending';

export const MAX_ATTEMPTS = 5;

export interface PendingVerification {
	email: string;
	blindedMsg: Uint8Array;
	otp: string;
	attempts: number;
}

export type StartError = 'invalid_email' | 'wrong_key' | 'invalid_token' | 'already_claimed';
export type OtpError = 'expired' | 'wrong_code' | 'too_many_attempts' | 'already_claimed';
export type StartResult = { ok: true; pendingId: string } | { ok: false; error: StartError };
export type OtpResult = { ok: true; blindSig: Uint8Array } | { ok: false; error: OtpError };

export interface VerifyDeps {
	sql: Sql;
	keys: IssuerKeys;
	semesterKey: Buffer;
	mailer: Mailer;
	pending: PendingStore<PendingVerification>;
}

export class VerifyService {
	constructor(private deps: VerifyDeps) {}

	async start(rawEmail: string, blindedMsg: Uint8Array, keyId: string): Promise<StartResult> {
		const { keys, sql, pending, mailer } = this.deps;
		if (keyId !== keys.keyId) return { ok: false, error: 'wrong_key' };
		if (blindedMsg.length !== keys.modulusBytes) return { ok: false, error: 'invalid_token' };
		const email = normalizeEmail(rawEmail);
		if (!email) return { ok: false, error: 'invalid_email' };

		const [claimed] = await sql`
			select 1 from issuances where email_hmac = ${this.emailHmac(email)} and semester = ${keys.keyId}`;
		if (claimed) return { ok: false, error: 'already_claimed' };

		const pendingId = randomToken(24);
		const otp = generateOtp();
		pending.put(pendingId, { email, blindedMsg, otp, attempts: 0 });
		await mailer.sendOtp(email, otp);
		return { ok: true, pendingId };
	}

	async confirmOtp(pendingId: string, code: string): Promise<OtpResult> {
		const { keys, sql, pending } = this.deps;
		const entry = pending.get(pendingId);
		if (!entry) return { ok: false, error: 'expired' };

		if (!safeEqual(entry.otp, code.trim())) {
			entry.attempts += 1;
			if (entry.attempts >= MAX_ATTEMPTS) {
				pending.delete(pendingId);
				return { ok: false, error: 'too_many_attempts' };
			}
			return { ok: false, error: 'wrong_code' };
		}

		pending.delete(pendingId); // the email leaves memory here
		const inserted = await sql`
			insert into issuances (email_hmac, semester) values (${this.emailHmac(entry.email)}, ${keys.keyId})
			on conflict do nothing returning 1`;
		if (inserted.length === 0) return { ok: false, error: 'already_claimed' };

		return { ok: true, blindSig: await blindSign(keys, entry.blindedMsg) };
	}

	private emailHmac(email: string): Buffer {
		return hmac(this.deps.semesterKey, email);
	}
}
