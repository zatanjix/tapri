const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

/** 15 random bytes = 120 bits = 24 base32 characters, shown in groups of 4. */
export function generateAccountSecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	let out = '';
	let value = 0;
	let bits = 0;
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += ALPHABET[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
		value &= (1 << bits) - 1;
	}
	return out.match(/.{4}/g)!.join('-');
}

/** Uppercases, strips spaces/dashes, maps O→0 and I/L→1. Returns 24 chars or null. */
export function normalizeSecret(input: string): string | null {
	const s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
	return /^[0-9A-HJKMNP-TV-Z]{24}$/.test(s) ? s : null;
}
