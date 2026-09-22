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
	if (!signedIn(cookies)) return { unlocked: false, reports: [], categories: [] };
	const app = await getApp();
	// Retries any image deletions that failed earlier.
	await app.images?.purge().catch(() => {});
	return { unlocked: true, reports: await app.reports.open(), categories: await app.feed.categories() };
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
		const app = await getApp();
		await app.reports.remove(t.type, t.id);
		await app.images?.purge().catch(() => {});
		return { removed: true };
	},

	officialPost: async ({ request, cookies }) => {
		if (!signedIn(cookies)) return fail(401, { wrong: true });
		const form = await request.formData();
		const result = await (await getApp()).posts.createOfficialPost({
			category: String(form.get('category') ?? ''),
			title: String(form.get('title') ?? ''),
			body: String(form.get('body') ?? '')
		});
		return result.ok ? { posted: result.id } : fail(400, { officialError: result.error });
	},

	officialReply: async ({ request, cookies }) => {
		if (!signedIn(cookies)) return fail(401, { wrong: true });
		const form = await request.formData();
		const postId = Number(form.get('postId'));
		if (!Number.isSafeInteger(postId) || postId < 1) return fail(400, { replyError: 'not_found' });
		const result = await (await getApp()).posts.createOfficialReply(postId, { body: String(form.get('body') ?? '') });
		return result.ok ? { replied: postId } : fail(400, { replyError: result.error });
	},

	dismiss: async ({ request, cookies }) => {
		if (!signedIn(cookies)) return fail(401, { wrong: true });
		const t = target(await request.formData());
		if (!t) return fail(400, { badRequest: true });
		await (await getApp()).reports.dismiss(t.type, t.id);
		return { dismissed: true };
	}
};
