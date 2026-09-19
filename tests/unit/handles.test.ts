import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ADJECTIVES, ANIMALS, ThreadHandles, baseHandle } from '../../src/lib/server/forum/handles';

const key = randomBytes(32);

describe('handles', () => {
	it('has 64 unique words in each list', () => {
		expect(new Set(ADJECTIVES).size).toBe(64);
		expect(new Set(ANIMALS).size).toBe(64);
	});

	it('is stable within a thread and differs across threads', () => {
		const a = randomUUID();
		expect(baseHandle(key, a, 1)).toBe(baseHandle(key, a, 1));
		const across = new Set(Array.from({ length: 20 }, (_, i) => baseHandle(key, a, i + 1)));
		expect(across.size).toBeGreaterThan(15);
	});

	it('looks like "Adjective Animal"', () => {
		expect(baseHandle(key, randomUUID(), 7)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
	});

	it('gives distinct names to distinct accounts in one thread', () => {
		const t = new ThreadHandles(key, 42);
		const names = Array.from({ length: 300 }, () => t.for(randomUUID()));
		expect(new Set(names).size).toBe(300);
	});

	it('returns the same name for repeat appearances', () => {
		const t = new ThreadHandles(key, 42);
		const a = randomUUID();
		expect(t.for(a)).toBe(t.for(a));
	});
});
