import { describe, expect, it } from 'vitest';
import { statusFor, readBody } from '../../src/lib/server/http';

describe('http helpers', () => {
	it('maps service errors to status codes', () => {
		expect(statusFor('invalid_email')).toBe(400);
		expect(statusFor('already_claimed')).toBe(409);
		expect(statusFor('expired')).toBe(410);
		expect(statusFor('too_many_attempts')).toBe(429);
	});

	it('reads required string fields and rejects the rest', async () => {
		const ok = new Request('http://x', { method: 'POST', body: JSON.stringify({ a: 'x', b: 'y' }) });
		expect(await readBody(ok, ['a', 'b'])).toEqual({ a: 'x', b: 'y' });
		const missing = new Request('http://x', { method: 'POST', body: JSON.stringify({ a: 'x' }) });
		expect(await readBody(missing, ['a', 'b'])).toBeNull();
		const notJson = new Request('http://x', { method: 'POST', body: 'nope' });
		expect(await readBody(notJson, ['a'])).toBeNull();
	});
});
