import { describe, expect, it } from 'vitest';
import { idParam, readBody, requireAccount, statusFor } from '../../src/lib/server/http';

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

	it('maps forum errors', () => {
		expect(statusFor('not_found')).toBe(404);
		expect(statusFor('too_deep')).toBe(400);
		expect(statusFor('unknown_category')).toBe(400);
	});

	it('requires an account and parses ids', () => {
		expect(requireAccount({ accountId: null })).toBeNull();
		expect(requireAccount({ accountId: 'x' })).toBe('x');
		expect(idParam('42')).toBe(42);
		expect(idParam('4x')).toBeNull();
		expect(idParam('0')).toBeNull();
	});
});
