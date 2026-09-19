import { describe, expect, it } from 'vitest';
import { clearTicket, isReady, loadTicket, randomWaitMs, saveTicket, type ReadyTicket } from '../../src/lib/client/signup-store';

function memoryStorage(): Storage {
	const m = new Map<string, string>();
	return {
		getItem: (k) => m.get(k) ?? null,
		setItem: (k, v) => void m.set(k, String(v)),
		removeItem: (k) => void m.delete(k),
		clear: () => m.clear(),
		key: (i) => [...m.keys()][i] ?? null,
		get length() {
			return m.size;
		}
	};
}

const ticket: ReadyTicket = { keyId: '2026-autumn', token: 'dG9r', signature: 'c2ln', secret: 'AAAA-BBBB', redeemAt: 1000, keySaved: false };

describe('signup store', () => {
	it('round-trips and clears', () => {
		const s = memoryStorage();
		saveTicket(ticket, s);
		expect(loadTicket(s)).toEqual(ticket);
		clearTicket(s);
		expect(loadTicket(s)).toBeNull();
	});

	it('returns null for corrupt or incomplete data', () => {
		const s = memoryStorage();
		s.setItem('tapri.signup', '{not json');
		expect(loadTicket(s)).toBeNull();
		s.setItem('tapri.signup', JSON.stringify({ keyId: 'x' }));
		expect(loadTicket(s)).toBeNull();
	});

	it('is ready only after redeemAt', () => {
		expect(isReady(ticket, 999)).toBe(false);
		expect(isReady(ticket, 1000)).toBe(true);
	});

	it('waits between one and four minutes', () => {
		expect(randomWaitMs(() => 0)).toBe(60_000);
		expect(randomWaitMs(() => 0.999999)).toBeLessThanOrEqual(240_000);
	});
});
