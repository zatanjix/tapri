import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, idParam, requireAccount } from '$lib/server/http';

export async function GET({ locals, params }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const id = idParam(params.id);
	if (!id) return fail('not_found');
	const thread = await (await getApp()).posts.getThread(accountId, id);
	return thread ? json(thread) : fail('not_found');
}

export async function DELETE({ locals, params }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const id = idParam(params.id);
	if (!id) return fail('not_found');
	const result = await (await getApp()).posts.deletePost(accountId, id);
	return result.ok ? json({ ok: true }) : fail(result.error);
}
