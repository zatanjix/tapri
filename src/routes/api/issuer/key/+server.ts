import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { toB64u } from '$lib/server/crypto/encoding';

export async function GET() {
	const { keys } = await getApp();
	return json({ keyId: keys.keyId, publicKey: toB64u(keys.publicSpki) });
}
