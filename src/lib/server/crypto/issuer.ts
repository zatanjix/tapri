import { RSABSSA } from '@cloudflare/blindrsa-ts';
import type { IssuerKeys } from './keys';

const suite = RSABSSA.SHA384.PSS.Randomized();

export function blindSign(keys: IssuerKeys, blindedMsg: Uint8Array): Promise<Uint8Array> {
	return suite.blindSign(keys.privateKey, blindedMsg);
}

export async function verifyToken(keys: IssuerKeys, preparedMsg: Uint8Array, signature: Uint8Array): Promise<boolean> {
	try {
		return await suite.verify(keys.publicKey, signature, preparedMsg);
	} catch {
		return false;
	}
}
