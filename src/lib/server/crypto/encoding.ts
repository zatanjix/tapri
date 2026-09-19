import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const sha256 = (data: Uint8Array | string): Buffer => createHash('sha256').update(data).digest();

export const hmac = (key: Uint8Array, data: string): Buffer => createHmac('sha256', key).update(data).digest();

export const toB64u = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url');

export const fromB64u = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'base64url'));

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}
