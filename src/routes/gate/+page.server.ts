import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { GATE_COOKIE, gateToken, passphraseMatches, safeNext } from '$lib/server/gate';

export function load() {
	if (!process.env.ACCESS_PASSPHRASE) redirect(303, '/');
}

export const actions = {
	default: async ({ request, cookies, url }) => {
		const expected = process.env.ACCESS_PASSPHRASE;
		if (!expected) redirect(303, '/');
		const given = String((await request.formData()).get('passphrase') ?? '');
		if (!passphraseMatches(expected, given)) return fail(401, { wrong: true });
		cookies.set(GATE_COOKIE, gateToken(expected), {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'strict',
			maxAge: 30 * 86_400
		});
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
