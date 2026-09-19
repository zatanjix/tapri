import { systemClock, type Clock } from '../clock';

/** In-memory only. Losing it on restart is intended: nothing about a verification survives. */
export class PendingStore<T> {
	private items = new Map<string, { value: T; expires: number }>();

	constructor(
		private ttlMs: number,
		private clock: Clock = systemClock
	) {}

	put(id: string, value: T): void {
		this.items.set(id, { value, expires: this.clock.now() + this.ttlMs });
	}

	get(id: string): T | undefined {
		const item = this.items.get(id);
		if (!item) return undefined;
		if (item.expires <= this.clock.now()) {
			this.items.delete(id);
			return undefined;
		}
		return item.value;
	}

	delete(id: string): void {
		this.items.delete(id);
	}

	sweep(): void {
		const now = this.clock.now();
		for (const [id, item] of this.items) if (item.expires <= now) this.items.delete(id);
	}

	get size(): number {
		return this.items.size;
	}
}
