import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, readJson, requireAccount } from '$lib/server/http';

export async function POST({ locals, request }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const app = await getApp();
	if (!app.limits.react.take(accountId)) return fail('rate_limited');
	const body = await readJson(request);
	const type = body?.targetType;
	const id = body?.targetId;
	if ((type !== 'post' && type !== 'reply') || typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
		return fail('bad_request');
	const result = await app.reactions.toggleVote(accountId, type, id);
	return result.ok ? json({ active: result.active, count: result.count }) : fail(result.error);
}
