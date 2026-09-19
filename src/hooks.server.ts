import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/accounts/sessions';
import { getApp } from '$lib/server/app';
import { withSecurityHeaders } from '$lib/server/headers';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.accountId = token ? ((await (await getApp()).sessions.resolve(token))?.accountId ?? null) : null;
	return withSecurityHeaders(await resolve(event));
};
