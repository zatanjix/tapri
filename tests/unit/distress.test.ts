import { describe, expect, it } from 'vitest';
import { showsDistress } from '../../src/lib/shared/distress';

describe('showsDistress', () => {
	it('flags clear expressions of distress', () => {
		for (const t of [
			"some nights I don't want to wake up",
			'I want to die',
			'I keep thinking about ending my life',
			'I just want to end it all',
			"there's no point in living anymore",
			"I can't do this anymore",
			'everyone would be better off without me',
			'I have been self-harming again',
			'thinking about suicide'
		]) expect(showsDistress(t), t).toBe(true);
	});

	it('ignores everyday complaints', () => {
		for (const t of [
			'This deadline is killing me',
			'The mess food is to die for (not)',
			'End semester exams start Monday',
			"I can't find the lab manual",
			'WiFi drops every night after 11'
		]) expect(showsDistress(t), t).toBe(false);
	});
});
