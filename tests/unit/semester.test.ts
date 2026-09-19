import { describe, expect, it } from 'vitest';
import { nextSemester, semesterEnd, semesterId } from '../../src/lib/server/crypto/semester';

describe('semester', () => {
	it('maps July–December to autumn and January–June to spring', () => {
		expect(semesterId(new Date(Date.UTC(2026, 8, 19)))).toBe('2026-autumn');
		expect(semesterId(new Date(Date.UTC(2027, 0, 5)))).toBe('2027-spring');
		expect(semesterId(new Date(Date.UTC(2027, 5, 30)))).toBe('2027-spring');
	});
	it('computes end dates', () => {
		expect(semesterEnd('2026-autumn').toISOString().slice(0, 10)).toBe('2026-12-31');
		expect(semesterEnd('2027-spring').toISOString().slice(0, 10)).toBe('2027-06-30');
	});
	it('steps to the next semester', () => {
		expect(nextSemester('2026-autumn')).toBe('2027-spring');
		expect(nextSemester('2027-spring')).toBe('2027-autumn');
	});
	it('rejects malformed ids', () => {
		expect(() => semesterEnd('2026-summer')).toThrow();
	});
});
