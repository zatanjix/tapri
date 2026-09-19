import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { SESSION_COOKIE, SESSION_DAYS } from '$lib/server/accounts/sessions';
import { fromB64u } from '$lib/server/crypto/encoding';
import { fail, readBody } from '$lib/server/http';

export async function POST({ request, cookies }) {
	const app = await getApp();
	const body = await readBody(request, ['keyId', 'token', 'signature', 'accountSecret'] as const);
	if (!body) return fail('bad_request');
	const result = await app.accounts.redeem({
		keyId: body.keyId,
		token: fromB64u(body.token),
		signature: fromB64u(body.signature),
		accountSecret: body.accountSecret
	});
	if (!result.ok) return fail(result.error);
	const session = await app.sessions.create(result.accountId);
	cookies.set(SESSION_COOKIE, session, {
		path: '/', httpOnly: true, secure: !dev, sameSite: 'strict', maxAge: SESSION_DAYS * 86_400
	});
	return json({ ok: true }, { status: 201 });
}
