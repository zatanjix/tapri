import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fromB64u } from '$lib/server/crypto/encoding';
import { fail, readBody } from '$lib/server/http';

export async function POST({ request, locals }) {
	if (!locals.accountId) return fail('unauthorized');
	const app = await getApp();
	const body = await readBody(request, ['keyId', 'token', 'signature'] as const);
	if (!body) return fail('bad_request');
	const result = await app.accounts.renew(locals.accountId, {
		keyId: body.keyId,
		token: fromB64u(body.token),
		signature: fromB64u(body.signature)
	});
	return result.ok ? json({ ok: true }) : fail(result.error);
}
