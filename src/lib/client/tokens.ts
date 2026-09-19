import { RSABSSA } from '@cloudflare/blindrsa-ts';

const suite = RSABSSA.SHA384.PSS.Randomized();

export interface PendingToken {
	keyId: string;
	preparedMsg: Uint8Array;
	blindedMsg: Uint8Array;
	inv: Uint8Array;
}

export function importIssuerKey(spki: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	return crypto.subtle.importKey('spki', spki, { name: 'RSA-PSS', hash: 'SHA-384' }, true, ['verify']);
}

export async function createToken(publicKey: CryptoKey, keyId: string): Promise<PendingToken> {
	const msg = crypto.getRandomValues(new Uint8Array(32));
	const preparedMsg = suite.prepare(msg);
	const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
	return { keyId, preparedMsg, blindedMsg, inv };
}

export function finalizeToken(publicKey: CryptoKey, token: PendingToken, blindSig: Uint8Array): Promise<Uint8Array> {
	return suite.finalize(publicKey, token.preparedMsg, blindSig, token.inv);
}
