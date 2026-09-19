import { createIssuerKeys, createSemesterKey, saveIssuerKeys } from '../src/lib/server/crypto/keys';
import { semesterId } from '../src/lib/server/crypto/semester';

const dir = process.env.KEYS_DIR;
if (!dir) throw new Error('KEYS_DIR is not set');
const keyId = process.argv[2] ?? semesterId();

await saveIssuerKeys(dir, await createIssuerKeys(keyId));
await createSemesterKey(dir, keyId);
console.log(`created issuer and semester keys for ${keyId} in ${dir}`);
