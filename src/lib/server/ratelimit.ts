import { randomBytes } from 'node:crypto';
import { systemClock, type Clock } from './clock';
import { hmac } from './crypto/encoding';

/** Token bucket, memory only: `capacity` requests per `windowMs`, refilled continuously. */
export class RateLimiter {
	private buckets = new Map<string, { tokens: number; at: number }>();

	constructor(
		private capacity: number,
		private windowMs: number,
		private clock: Clock = systemClock
	) {}

	take(key: string): boolean {
		const now = this.clock.now();
		const b = this.buckets.get(key) ?? { tokens: this.capacity, at: now };
		b.tokens = Math.min(this.capacity, b.tokens + ((now - b.at) * this.capacity) / this.windowMs);
		b.at = now;
		const allowed = b.tokens >= 1;
		if (allowed) b.tokens -= 1;
		this.buckets.set(key, b);
		return allowed;
	}

	sweep(): void {
		const cutoff = this.clock.now() - this.windowMs;
		for (const [k, b] of this.buckets) if (b.at < cutoff) this.buckets.delete(k);
	}
}

/** Turns an IP into an opaque key with a secret that is discarded every UTC day. */
export class IpKeyer {
	private day = -1;
	private secret = randomBytes(32);

	constructor(private clock: Clock = systemClock) {}

	keyFor(ip: string): string {
		const day = Math.floor(this.clock.now() / 86_400_000);
		if (day !== this.day) {
			this.day = day;
			this.secret = randomBytes(32);
		}
		return hmac(this.secret, ip).toString('base64url');
	}
}
