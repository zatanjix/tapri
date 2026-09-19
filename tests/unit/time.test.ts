import { describe, expect, it } from 'vitest';
import { timeAgo } from '../../src/lib/shared/time';

const now = Date.UTC(2026, 8, 19, 12, 0, 0);
const ago = (ms: number) => new Date(now - ms).toISOString();

describe('timeAgo', () => {
	it('formats recent times compactly', () => {
		expect(timeAgo(ago(20_000), now)).toBe('just now');
		expect(timeAgo(ago(5 * 60_000), now)).toBe('5m');
		expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3h');
		expect(timeAgo(ago(2 * 86_400_000), now)).toBe('2d');
	});

	it('uses a date after a week', () => {
		expect(timeAgo(new Date(Date.UTC(2026, 8, 3, 9)).toISOString(), now)).toBe('3 Sep');
	});

	it('treats future times as just now', () => {
		expect(timeAgo(ago(-60_000), now)).toBe('just now');
	});
});
