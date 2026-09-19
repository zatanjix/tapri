import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '../../src/lib/server/verify/email';
import { generateOtp } from '../../src/lib/server/verify/otp';
import { PendingStore } from '../../src/lib/server/verify/pending';

describe('normalizeEmail', () => {
	it('accepts iitb.ac.in and its subdomains, lowercased', () => {
		expect(normalizeEmail(' 00X0001@IITB.ac.in ')).toBe('00x0001@iitb.ac.in');
		expect(normalizeEmail('prof@cse.iitb.ac.in')).toBe('prof@cse.iitb.ac.in');
	});
	it('rejects lookalikes and other domains', () => {
		for (const bad of ['a@gmail.com', 'a@notiitb.ac.in', 'a@iitb.ac.in.evil.com', 'a@iitb.ac', '@iitb.ac.in', 'a b@iitb.ac.in']) {
			expect(normalizeEmail(bad), bad).toBeNull();
		}
	});
});

describe('generateOtp', () => {
	it('is six digits', () => {
		for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
	});
});

describe('PendingStore', () => {
	it('expires entries after the TTL', () => {
		let now = 0;
		const store = new PendingStore<string>(1000, { now: () => now });
		store.put('a', 'x');
		expect(store.get('a')).toBe('x');
		now = 1000;
		expect(store.get('a')).toBeUndefined();
	});
	it('sweeps expired entries', () => {
		let now = 0;
		const store = new PendingStore<string>(1000, { now: () => now });
		store.put('a', 'x');
		store.put('b', 'y');
		now = 5000;
		store.sweep();
		expect(store.size).toBe(0);
	});
});
