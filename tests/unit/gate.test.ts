import { describe, expect, it } from 'vitest';
import { gateToken, isExempt, passphraseMatches, safeNext } from '../../src/lib/server/gate';

describe('access gate', () => {
	it('derives a stable token that does not reveal the passphrase', () => {
		const t = gateToken('chai at 2am');
		expect(t).toBe(gateToken('chai at 2am'));
		expect(t).not.toContain('chai');
		expect(gateToken('other')).not.toBe(t);
	});

	it('compares passphrases safely', () => {
		expect(passphraseMatches('chai at 2am', 'chai at 2am')).toBe(true);
		expect(passphraseMatches('chai at 2am', 'Chai at 2am')).toBe(false);
		expect(passphraseMatches('chai at 2am', '')).toBe(false);
	});

	it('only exempts the gate itself', () => {
		expect(isExempt('/gate')).toBe(true);
		expect(isExempt('/admin')).toBe(true);
		expect(isExempt('/')).toBe(false);
		expect(isExempt('/api/feed')).toBe(false);
		expect(isExempt('/help')).toBe(false);
	});

	it('only redirects to local paths', () => {
		expect(safeNext('/p/3')).toBe('/p/3');
		expect(safeNext('//evil.example')).toBe('/');
		expect(safeNext('https://evil.example')).toBe('/');
		expect(safeNext(null)).toBe('/');
	});
});
