import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
	it('has WebCrypto', () => {
		expect(typeof globalThis.crypto.subtle.generateKey).toBe('function');
	});
});
