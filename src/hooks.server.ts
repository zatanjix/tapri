import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/accounts/sessions';
import { getApp } from '$lib/server/app';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.accountId = token ? ((await (await getApp()).sessions.resolve(token))?.accountId ?? null) : null;
	return resolve(event);
};
