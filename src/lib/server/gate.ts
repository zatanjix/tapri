import { timingSafeEqual } from 'node:crypto';
import { hmac, sha256 } from './crypto/encoding';

/**
 * Optional pre-launch lock. When ACCESS_PASSPHRASE is set, every page and API call needs a cookie
 * proving the passphrase was entered. Unset it to open the site.
 */
export const GATE_COOKIE = 'gate';

export const gateToken = (passphrase: string): string => hmac(Buffer.from(passphrase), 'tapri-gate').toString('base64url');

export function passphraseMatches(expected: string, given: string): boolean {
	return timingSafeEqual(sha256(expected), sha256(given));
}

export const isExempt = (path: string): boolean => path === '/gate';

export function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
