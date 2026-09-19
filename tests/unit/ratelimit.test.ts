import { describe, expect, it } from 'vitest';
import { IpKeyer, RateLimiter } from '../../src/lib/server/ratelimit';

describe('RateLimiter', () => {
	it('allows a burst up to capacity, then refills over time', () => {
		let now = 0;
		const rl = new RateLimiter(3, 60_000, { now: () => now });
		expect([rl.take('k'), rl.take('k'), rl.take('k'), rl.take('k')]).toEqual([true, true, true, false]);
		now = 20_000; // one token per 20s
		expect(rl.take('k')).toBe(true);
		expect(rl.take('k')).toBe(false);
	});
	it('keeps keys independent', () => {
		const rl = new RateLimiter(1, 60_000);
		expect(rl.take('a')).toBe(true);
		expect(rl.take('b')).toBe(true);
	});
});

describe('IpKeyer', () => {
	it('never returns the IP and rotates daily', () => {
		let now = Date.UTC(2026, 8, 19, 10);
		const keyer = new IpKeyer({ now: () => now });
		const a = keyer.keyFor('10.1.2.3');
		expect(a).not.toContain('10.1.2.3');
		expect(keyer.keyFor('10.1.2.3')).toBe(a);
		now = Date.UTC(2026, 8, 20, 10);
		expect(keyer.keyFor('10.1.2.3')).not.toBe(a);
	});
});
