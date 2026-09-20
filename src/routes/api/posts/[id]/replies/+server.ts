import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, idParam, readJson, requireAccount } from '$lib/server/http';

export async function POST({ locals, params, request }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const postId = idParam(params.id);
	if (!postId) return fail('not_found');
	const app = await getApp();

	const body = await readJson(request);
	if (!body || typeof body.body !== 'string') return fail('bad_request');
	let parentId: number | undefined;
	if (body.parentId !== undefined) {
		if (typeof body.parentId !== 'number' || !Number.isSafeInteger(body.parentId) || body.parentId < 1) return fail('bad_request');
		parentId = body.parentId;
	}
	const result = await app.posts.createReply(accountId, postId, { body: body.body, parentId });
	return result.ok ? json({ id: result.id }, { status: 201 }) : fail(result.error);
}
