import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { SESSION_COOKIE, SESSION_DAYS } from '$lib/server/accounts/sessions';
import { fail, readBody } from '$lib/server/http';

export async function POST({ request, cookies, getClientAddress }) {
	const app = await getApp();
	if (!app.limits.signIn.take(app.ipKeyer.keyFor(getClientAddress()))) return fail('rate_limited');
	const body = await readBody(request, ['accountSecret'] as const);
	if (!body) return fail('bad_request');
	const session = await app.sessions.signIn(body.accountSecret);
	if (!session) return fail('unauthorized');
	cookies.set(SESSION_COOKIE, session, {
		path: '/', httpOnly: true, secure: !dev, sameSite: 'strict', maxAge: SESSION_DAYS * 86_400
	});
	return json({ ok: true });
}

export async function DELETE({ cookies }) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await (await getApp()).sessions.destroy(token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return json({ ok: true });
}
