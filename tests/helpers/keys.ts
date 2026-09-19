import { createIssuerKeys, type IssuerKeys } from '../../src/lib/server/crypto/keys';

let cached: Promise<IssuerKeys> | undefined;

/** 2048-bit keys keep tests fast; production uses 3072. */
export function testKeys(keyId = '2026-autumn'): Promise<IssuerKeys> {
	return (cached ??= createIssuerKeys(keyId, 2048));
}
