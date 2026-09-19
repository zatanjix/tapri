import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { toB64u } from '$lib/server/crypto/encoding';
import { fail, readBody } from '$lib/server/http';

export async function POST({ request, getClientAddress }) {
	const app = await getApp();
	if (!app.limits.verifyOtp.take(app.ipKeyer.keyFor(getClientAddress()))) return fail('rate_limited');
	const body = await readBody(request, ['pendingId', 'code'] as const);
	if (!body) return fail('bad_request');
	const result = await app.verify.confirmOtp(body.pendingId, body.code);
	return result.ok ? json({ blindSig: toB64u(result.blindSig) }) : fail(result.error);
}
