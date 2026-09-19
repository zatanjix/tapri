import { describe, expect, it } from 'vitest';
import { createToken, finalizeToken, importIssuerKey } from '../../src/lib/client/tokens';
import { createIssuerKeys } from '../../src/lib/server/crypto/keys';
import { blindSign, verifyToken } from '../../src/lib/server/crypto/issuer';
import { testKeys } from '../helpers/keys';

describe('blind signatures', () => {
	it('client token signed blindly verifies on the server', async () => {
		const keys = await testKeys();
		const pub = await importIssuerKey(keys.publicSpki);
		const pending = await createToken(pub, keys.keyId);
		const blindSig = await blindSign(keys, pending.blindedMsg);
		const signature = await finalizeToken(pub, pending, blindSig);
		expect(await verifyToken(keys, pending.preparedMsg, signature)).toBe(true);
	});

	it('the server never sees the token it later verifies', async () => {
		const keys = await testKeys();
		const pub = await importIssuerKey(keys.publicSpki);
		const pending = await createToken(pub, keys.keyId);
		expect(Buffer.from(pending.blindedMsg).equals(Buffer.from(pending.preparedMsg))).toBe(false);
	});

	it('rejects a tampered token', async () => {
		const keys = await testKeys();
		const pub = await importIssuerKey(keys.publicSpki);
		const pending = await createToken(pub, keys.keyId);
		const signature = await finalizeToken(pub, pending, await blindSign(keys, pending.blindedMsg));
		const tampered = pending.preparedMsg.slice();
		tampered[0] ^= 1;
		expect(await verifyToken(keys, tampered, signature)).toBe(false);
	});

	it('rejects a signature from a different key', async () => {
		const keys = await testKeys();
		const other = await createIssuerKeys('other', 2048);
		const otherPub = await importIssuerKey(other.publicSpki);
		const pending = await createToken(otherPub, other.keyId);
		const signature = await finalizeToken(otherPub, pending, await blindSign(other, pending.blindedMsg));
		expect(await verifyToken(keys, pending.preparedMsg, signature)).toBe(false);
	});
});
