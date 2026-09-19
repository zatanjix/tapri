import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createToken, finalizeToken, importIssuerKey } from '../../src/lib/client/tokens';
import { blindSign, verifyToken } from '../../src/lib/server/crypto/issuer';
import {
	createIssuerKeys, createSemesterKey, loadIssuerKeys, loadSemesterKey, retireSemesterKey, saveIssuerKeys
} from '../../src/lib/server/crypto/keys';

let dir: string;
beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'tapri-keys-'));
});
afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe('key files', () => {
	it('saved keys load and still sign', async () => {
		await saveIssuerKeys(dir, await createIssuerKeys('2026-autumn', 2048));
		const keys = await loadIssuerKeys(dir, '2026-autumn');
		const pub = await importIssuerKey(keys.publicSpki);
		const t = await createToken(pub, keys.keyId);
		const sig = await finalizeToken(pub, t, await blindSign(keys, t.blindedMsg));
		expect(await verifyToken(keys, t.preparedMsg, sig)).toBe(true);
		expect(keys.modulusBytes).toBe(256);
	});

	it('refuses to overwrite an existing key', async () => {
		const keys = await createIssuerKeys('2026-autumn', 2048);
		await saveIssuerKeys(dir, keys);
		await expect(saveIssuerKeys(dir, keys)).rejects.toThrow(/EEXIST/);
	});

	it('writes private files with 0600 permissions', async () => {
		await saveIssuerKeys(dir, await createIssuerKeys('2026-autumn', 2048));
		const mode = (await stat(join(dir, 'issuer-2026-autumn.pkcs8'))).mode & 0o777;
		expect(mode).toBe(0o600);
	});

	it('retiring a semester key deletes it', async () => {
		await createSemesterKey(dir, '2026-autumn');
		expect((await loadSemesterKey(dir, '2026-autumn')).length).toBe(32);
		await retireSemesterKey(dir, '2026-autumn');
		await expect(loadSemesterKey(dir, '2026-autumn')).rejects.toThrow(/ENOENT/);
	});
});
