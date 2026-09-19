import { retireSemesterKey } from '../src/lib/server/crypto/keys';

const dir = process.env.KEYS_DIR;
const keyId = process.argv[2];
if (!dir || !keyId) throw new Error('usage: KEYS_DIR=... tsx scripts/retire-semester-key.ts <semester-id>');

await retireSemesterKey(dir, keyId);
console.log(`destroyed semester key ${keyId}; issuance records for it are now unreadable`);
