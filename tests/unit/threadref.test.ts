import { describe, expect, it } from 'vitest';
import { threadRef } from '../../src/lib/server/forum/posts';

const SLUG = 'c81d63e73351c814';

describe('threadRef', () => {
	it('takes a full link, a path, or the address on its own', () => {
		for (const input of [
			`https://www.tapri.site/p/${SLUG}`,
			`https://tapri.site/p/${SLUG}?x=1#frag`,
			`  /p/${SLUG}/  `,
			SLUG,
			SLUG.toUpperCase()
		])
			expect(threadRef(input), input).toEqual({ slug: SLUG });
	});

	it('still takes an old post number', () => {
		expect(threadRef('12')).toEqual({ id: 12 });
		expect(threadRef('https://www.tapri.site/p/12')).toEqual({ id: 12 });
		expect(threadRef('#12')).toEqual({ id: 12 });
	});

	it('refuses anything else', () => {
		for (const bad of ['', '   ', 'https://www.tapri.site/', 'not-an-address', '0', '/c/wellbeing', 'abc123'])
			expect(threadRef(bad), bad).toBeNull();
	});
});
