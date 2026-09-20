import { error, fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getApp } from '$lib/server/app';
import { ADMIN_COOKIE, adminToken, passphraseMatches } from '$lib/server/gate';
import type { TargetType } from '$lib/server/forum/reports';

/** The moderation view. Hidden entirely unless ADMIN_PASSPHRASE is configured. */
function passphrase(): string {
	const value = process.env.ADMIN_PASSPHRASE;
	if (!value) error(404, 'Not found');
	return value;
}

const signedIn = (cookies: { get(name: string): string | undefined }) =>
	cookies.get(ADMIN_COOKIE) === adminToken(passphrase());

export async function load({ cookies }) {
	if (!signedIn(cookies)) return { unlocked: false, reports: [] };
	return { unlocked: true, reports: await (await getApp()).reports.open() };
}

function target(form: FormData): { type: TargetType; id: number } | null {
	const type = String(form.get('targetType'));
	const id = Number(form.get('targetId'));
	if ((type !== 'post' && type !== 'reply') || !Number.isSafeInteger(id) || id < 1) return null;
	return { type, id };
}

export const actions = {
	unlock: async ({ request, cookies }) => {
		const given = String((await request.formData()).get('passphrase') ?? '');
		if (!passphraseMatches(passphrase(), given)) return fail(401, { wrong: true });
		cookies.set(ADMIN_COOKIE, adminToken(passphrase()), {
			path: '/admin',
			httpOnly: true,
			secure: !dev,
			sameSite: 'strict',
			maxAge: 7 * 86_400
		});
		return { unlocked: true };
	},

	remove: async ({ request, cookies }) => {
		if (!signedIn(cookies)) return fail(401, { wrong: true });
		const t = target(await request.formData());
		if (!t) return fail(400, { badRequest: true });
		await (await getApp()).reports.remove(t.type, t.id);
		return { removed: true };
	},

	dismiss: async ({ request, cookies }) => {
		if (!signedIn(cookies)) return fail(401, { wrong: true });
		const t = target(await request.formData());
		if (!t) return fail(400, { badRequest: true });
		await (await getApp()).reports.dismiss(t.type, t.id);
		return { dismissed: true };
	}
};
