import { describe, expect, it } from 'vitest';
import { generateAccountSecret, normalizeSecret } from '../../src/lib/shared/secret';

describe('recovery key', () => {
	it('has the display format', () => {
		expect(generateAccountSecret()).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
	});
	it('is random', () => {
		expect(new Set(Array.from({ length: 100 }, generateAccountSecret)).size).toBe(100);
	});
	it('normalises what people actually type', () => {
		const key = generateAccountSecret();
		const canonical = key.replace(/-/g, '');
		expect(normalizeSecret(key.toLowerCase().replace(/-/g, ' '))).toBe(canonical);
		expect(normalizeSecret('o000-0000-0000-0000-0000-000l')).toBe('000000000000000000000001');
	});
	it('rejects the wrong length or alphabet', () => {
		expect(normalizeSecret('ABCD')).toBeNull();
		expect(normalizeSecret('UUUU-UUUU-UUUU-UUUU-UUUU-UUUU')).toBeNull();
	});
});
