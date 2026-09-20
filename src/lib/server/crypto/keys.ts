import { mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const ALG = { name: 'RSA-PSS', hash: 'SHA-384' } as const;

export interface IssuerKeys {
	keyId: string;
	publicKey: CryptoKey;
	privateKey: CryptoKey;
	publicSpki: Uint8Array<ArrayBuffer>;
	modulusBytes: number;
}

async function fromPair(keyId: string, publicKey: CryptoKey, privateKey: CryptoKey): Promise<IssuerKeys> {
	const publicSpki = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey));
	const modulusBytes = (publicKey.algorithm as RsaHashedKeyAlgorithm).modulusLength / 8;
	return { keyId, publicKey, privateKey, publicSpki, modulusBytes };
}

/** Keys must be extractable: blindrsa-ts reads the raw RSA parameters. */
export async function createIssuerKeys(keyId: string, modulusLength = 3072): Promise<IssuerKeys> {
	const pair = (await crypto.subtle.generateKey(
		{ ...ALG, modulusLength, publicExponent: Uint8Array.from([1, 0, 1]) },
		true,
		['sign', 'verify']
	)) as CryptoKeyPair;
	return fromPair(keyId, pair.publicKey, pair.privateKey);
}

const issuerPath = (dir: string, keyId: string, ext: 'spki' | 'pkcs8') => join(dir, `issuer-${keyId}.${ext}`);
const semesterPath = (dir: string, keyId: string) => join(dir, `semester-${keyId}.key`);

/** Refuses to overwrite existing files (flag 'wx'). */
export async function saveIssuerKeys(dir: string, keys: IssuerKeys): Promise<void> {
	await mkdir(dir, { recursive: true, mode: 0o700 });
	const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
	await writeFile(issuerPath(dir, keys.keyId, 'spki'), keys.publicSpki, { mode: 0o600, flag: 'wx' });
	await writeFile(issuerPath(dir, keys.keyId, 'pkcs8'), pkcs8, { mode: 0o600, flag: 'wx' });
}

export async function loadIssuerKeys(dir: string, keyId: string): Promise<IssuerKeys> {
	const spki = await readFile(issuerPath(dir, keyId, 'spki'));
	const pkcs8 = await readFile(issuerPath(dir, keyId, 'pkcs8'));
	const publicKey = await crypto.subtle.importKey('spki', spki, ALG, true, ['verify']);
	const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, ALG, true, ['sign']);
	return fromPair(keyId, publicKey, privateKey);
}

export async function createSemesterKey(dir: string, keyId: string): Promise<void> {
	await mkdir(dir, { recursive: true, mode: 0o700 });
	await writeFile(semesterPath(dir, keyId), randomBytes(32), { mode: 0o600, flag: 'wx' });
}

export async function loadSemesterKey(dir: string, keyId: string): Promise<Buffer> {
	return readFile(semesterPath(dir, keyId));
}

/** Overwrites the key with random bytes before deleting it. */
export async function retireSemesterKey(dir: string, keyId: string): Promise<void> {
	const path = semesterPath(dir, keyId);
	const handle = await open(path, 'r+');
	try {
		await handle.write(randomBytes(32), 0, 32, 0);
		await handle.sync();
	} finally {
		await handle.close();
	}
	await unlink(path);
}

const handlePath = (dir: string) => join(dir, 'handle.key');

/** The per-thread name key is permanent: changing it would rename everyone in every thread. */
export async function ensureHandleKey(dir: string): Promise<void> {
	await mkdir(dir, { recursive: true, mode: 0o700 });
	try {
		await writeFile(handlePath(dir), randomBytes(32), { mode: 0o600, flag: 'wx' });
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
	}
}

export async function loadHandleKey(dir: string): Promise<Buffer> {
	return readFile(handlePath(dir));
}

/** For hosting platforms without persistent disks: keys as base64url text in environment variables. */
export async function exportIssuerKeys(keys: IssuerKeys): Promise<{ publicKey: string; privateKey: string }> {
	const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
	return { publicKey: Buffer.from(keys.publicSpki).toString('base64url'), privateKey: Buffer.from(pkcs8).toString('base64url') };
}

export async function importIssuerKeys(keyId: string, publicKey: string, privateKey: string): Promise<IssuerKeys> {
	const pub = await crypto.subtle.importKey('spki', Buffer.from(publicKey, 'base64url'), ALG, true, ['verify']);
	const priv = await crypto.subtle.importKey('pkcs8', Buffer.from(privateKey, 'base64url'), ALG, true, ['sign']);
	return fromPair(keyId, pub, priv);
}
