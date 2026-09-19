import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, idParam, requireAccount } from '$lib/server/http';

export async function POST({ locals, params }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const id = idParam(params.id);
	if (!id) return fail('not_found');
	const app = await getApp();
	if (!app.limits.react.take(accountId)) return fail('rate_limited');
	const result = await app.reactions.toggleMetoo(accountId, id);
	return result.ok ? json({ active: result.active, count: result.count }) : fail(result.error);
}
