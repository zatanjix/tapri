import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { createIssuerKeys, createSemesterKey, ensureHandleKey, saveIssuerKeys } from '../src/lib/server/crypto/keys';
import { semesterId } from '../src/lib/server/crypto/semester';

const dir = process.env.KEYS_DIR;
if (!dir) throw new Error('KEYS_DIR is not set');
const keyId = process.argv[2] ?? semesterId();

await ensureHandleKey(dir);

const exists = await access(join(dir, `issuer-${keyId}.pkcs8`)).then(() => true, () => false);
if (exists) {
	console.log(`keys for ${keyId} already exist; nothing overwritten`);
} else {
	await saveIssuerKeys(dir, await createIssuerKeys(keyId));
	await createSemesterKey(dir, keyId);
	console.log(`created issuer and semester keys for ${keyId} in ${dir}`);
}
