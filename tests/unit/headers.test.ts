import { describe, expect, it } from 'vitest';
import { withSecurityHeaders } from '../../src/lib/server/headers';

describe('security headers', () => {
	it('sets privacy and hardening headers', () => {
		const res = withSecurityHeaders(new Response('ok'));
		expect(res.headers.get('referrer-policy')).toBe('no-referrer');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
		expect(res.headers.get('x-frame-options')).toBe('DENY');
		expect(res.headers.get('permissions-policy')).toContain('geolocation=()');
		expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
	});
});
