import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '../../src/lib/server/verify/email';
import { generateOtp } from '../../src/lib/server/verify/otp';

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
