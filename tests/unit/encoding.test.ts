import { describe, expect, it } from 'vitest';
import { fromB64u, hmac, randomToken, safeEqual, sha256, toB64u } from '../../src/lib/server/crypto/encoding';

describe('encoding', () => {
	it('round-trips base64url', () => {
		const bytes = new Uint8Array([0, 251, 255, 1]);
		expect(fromB64u(toB64u(bytes))).toEqual(bytes);
	});
	it('hashes deterministically', () => {
		expect(sha256('a').equals(sha256('a'))).toBe(true);
		expect(hmac(Buffer.from('k'), 'a').equals(hmac(Buffer.from('j'), 'a'))).toBe(false);
	});
	it('makes distinct random tokens', () => {
		expect(randomToken()).not.toBe(randomToken());
		expect(fromB64u(randomToken(32)).length).toBe(32);
	});
	it('compares strings safely', () => {
		expect(safeEqual('123456', '123456')).toBe(true);
		expect(safeEqual('123456', '123457')).toBe(false);
		expect(safeEqual('123', '123456')).toBe(false);
	});
});
