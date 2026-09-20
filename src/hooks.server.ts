import { json, redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/accounts/sessions';
import { getApp } from '$lib/server/app';
import { GATE_COOKIE, gateToken, isExempt } from '$lib/server/gate';
import { withSecurityHeaders } from '$lib/server/headers';
import { THEME_COOKIE, parseTheme } from '$lib/shared/theme';

export const handle: Handle = async ({ event, resolve }) => {
	const passphrase = process.env.ACCESS_PASSPHRASE;
	const path = event.url.pathname;
	if (passphrase && !isExempt(path) && event.cookies.get(GATE_COOKIE) !== gateToken(passphrase)) {
		if (path.startsWith('/api/')) return withSecurityHeaders(json({ error: 'locked' }, { status: 401 }));
		redirect(303, `/gate?next=${encodeURIComponent(path + event.url.search)}`);
	}

	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.accountId = token ? ((await (await getApp()).sessions.resolve(token))?.accountId ?? null) : null;

	// The theme is rendered into the page on the server, so there is no flash and no inline script.
	const theme = parseTheme(event.cookies.get(THEME_COOKIE));
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%tapri.theme%', theme)
	});
	return withSecurityHeaders(response);
};
