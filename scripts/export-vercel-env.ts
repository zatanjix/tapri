import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createIssuerKeys, exportIssuerKeys } from '../src/lib/server/crypto/keys';
import { semesterId } from '../src/lib/server/crypto/semester';

/**
 * Generates fresh production keys and writes them to .env.vercel (git-ignored, owner-only) for
 * pasting into Vercel's environment settings. Keep that file safe and private: it is the only
 * copy of this semester's issuer key. It never overwrites an existing file.
 */
const keyId = process.argv[2] ?? semesterId();
const issuer = await exportIssuerKeys(await createIssuerKeys(keyId));
const b64 = (n: number) => randomBytes(n).toString('base64url');

const lines = [
	`ISSUER_KEY_ID=${keyId}`,
	`ISSUER_PUBLIC_KEY=${issuer.publicKey}`,
	`ISSUER_PRIVATE_KEY=${issuer.privateKey}`,
	`SEMESTER_KEY=${b64(32)}`,
	`HANDLE_KEY=${b64(32)}`,
	'MAILER=resend',
	`ACCESS_PASSPHRASE=${b64(12)}`,
	'# Also add in Vercel: DATABASE_URL (Neon, pooled), RESEND_API_KEY, MAIL_FROM'
];
await writeFile('.env.vercel', lines.join('\n') + '\n', { mode: 0o600, flag: 'wx' });
console.log(`wrote .env.vercel for ${keyId}`);
