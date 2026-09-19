import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fromB64u } from '$lib/server/crypto/encoding';
import { fail, readBody } from '$lib/server/http';

export async function POST({ request, getClientAddress }) {
	const app = await getApp();
	if (!app.limits.verifyStart.take(app.ipKeyer.keyFor(getClientAddress()))) return fail('rate_limited');
	const body = await readBody(request, ['email', 'blindedMsg', 'keyId'] as const);
	if (!body) return fail('bad_request');
	const result = await app.verify.start(body.email, fromB64u(body.blindedMsg), body.keyId);
	return result.ok ? json({ pendingId: result.pendingId }) : fail(result.error);
}
