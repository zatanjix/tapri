/** A stamped ticket waiting to be redeemed. Kept on this device only, and deleted once used. */
export interface ReadyTicket {
	keyId: string;
	token: string;
	signature: string;
	secret: string;
	redeemAt: number;
	keySaved: boolean;
}

const KEY = 'tapri.signup';

export function saveTicket(ticket: ReadyTicket, storage: Storage = localStorage): void {
	storage.setItem(KEY, JSON.stringify(ticket));
}

export function loadTicket(storage: Storage = localStorage): ReadyTicket | null {
	try {
		const t = JSON.parse(storage.getItem(KEY) ?? 'null');
		const ok =
			t &&
			typeof t.keyId === 'string' &&
			typeof t.token === 'string' &&
			typeof t.signature === 'string' &&
			typeof t.secret === 'string' &&
			typeof t.redeemAt === 'number' &&
			typeof t.keySaved === 'boolean';
		return ok ? t : null;
	} catch {
		return null;
	}
}

export function clearTicket(storage: Storage = localStorage): void {
	storage.removeItem(KEY);
}

export const isReady = (t: ReadyTicket, now: number = Date.now()): boolean => now >= t.redeemAt;

/** 15–45 seconds, counted from verification, so the account's creation can't be matched to the email check. */
export const randomWaitMs = (rand: () => number = Math.random): number => 15_000 + Math.floor(rand() * 30_000);
