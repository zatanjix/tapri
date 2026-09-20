import { timingSafeEqual } from 'node:crypto';
import { hmac, sha256 } from './crypto/encoding';

/**
 * Optional pre-launch lock. When ACCESS_PASSPHRASE is set, every page and API call needs a cookie
 * proving the passphrase was entered. Unset it to open the site.
 */
export const GATE_COOKIE = 'gate';

export const ADMIN_COOKIE = 'admin';

export const gateToken = (passphrase: string, purpose = 'tapri-gate'): string =>
	hmac(Buffer.from(passphrase), purpose).toString('base64url');

export function passphraseMatches(expected: string, given: string): boolean {
	return timingSafeEqual(sha256(expected), sha256(given));
}

/** The gate never covers itself, nor the moderation view (which has its own passphrase). */
export const isExempt = (path: string): boolean => path === '/gate' || path.startsWith('/admin');

export const adminToken = (passphrase: string): string => gateToken(passphrase, 'tapri-admin');

export function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
