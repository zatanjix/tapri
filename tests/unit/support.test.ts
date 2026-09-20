import { describe, expect, it } from 'vitest';
import { CATEGORY_NOTES, DISCLAIMER, TIERS, categoryNote } from '../../src/lib/shared/support';

const SLUGS = ['academics', 'hostel-mess', 'wellbeing', 'harassment', 'administration', 'placements', 'general', 'feedback'];

describe('support data', () => {
	it('orders tiers by urgency', () => {
		expect(TIERS.map((t) => t.id)).toEqual(['urgent', 'now', 'campus', 'outside']);
	});

	it('uses dialable numbers and https links only', () => {
		for (const tier of TIERS)
			for (const item of tier.items) {
				if (item.tel) expect(item.tel, item.name).toMatch(/^\+?\d{4,15}$/);
				if (item.url) expect(item.url, item.name).toMatch(/^https:\/\//);
			}
	});

	it('includes the key numbers', () => {
		const tels = TIERS.flatMap((t) => t.items.map((i) => i.tel));
		for (const n of ['02221591110', '+918291297051', '9833338989', '9167398598', '08047136761', '02225769070', '14416', '18005990019'])
			expect(tels).toContain(n);
	});

	it('notes only the categories where support is the right answer', () => {
		expect(Object.keys(CATEGORY_NOTES).sort()).toEqual(['general', 'harassment', 'placements', 'wellbeing']);
		for (const slug of Object.keys(CATEGORY_NOTES)) {
			expect(categoryNote(slug)?.text.length ?? 0, slug).toBeGreaterThan(20);
			expect(SLUGS, slug).toContain(slug);
		}
		for (const slug of ['academics', 'hostel-mess', 'administration']) expect(categoryNote(slug), slug).toBeUndefined();
	});

	it('states independence', () => {
		expect(DISCLAIMER).toMatch(/not affiliated/i);
	});
});
