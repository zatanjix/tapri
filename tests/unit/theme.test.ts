import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, parseTheme } from '../../src/lib/shared/theme';

describe('theme preference', () => {
	it('defaults to light', () => {
		expect(DEFAULT_THEME).toBe('light');
		expect(parseTheme(undefined)).toBe('light');
	});

	it('accepts only known values', () => {
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme('system')).toBe('system');
		expect(parseTheme('"><script>')).toBe('light');
	});
});
