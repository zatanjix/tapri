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
	// value is optional so pages loaded before downvotes existed keep working (they only upvote)
	const value = body?.value === undefined ? 1 : body.value;
	if ((type !== 'post' && type !== 'reply') || typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
		return fail('bad_request');
	if (value !== 1 && value !== -1) return fail('bad_request');

	const r = await app.reactions.vote(accountId, type, id, value);
	if (!r.ok) return fail(r.error);
	// active/count mirror the old response shape for pages still open from before this change
	return json({ vote: r.vote, upvotes: r.upvotes, downvotes: r.downvotes, active: r.vote === 1, count: r.upvotes });
}
