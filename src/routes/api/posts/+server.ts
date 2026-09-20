import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, readJson, requireAccount } from '$lib/server/http';

const FIELDS = ['category', 'kind', 'title', 'body'] as const;

export async function POST({ locals, request }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const app = await getApp();
	const body = await readJson(request);
	if (!body || FIELDS.some((f) => typeof body[f] !== 'string')) return fail('bad_request');
	const result = await app.posts.createPost(accountId, {
		category: body.category as string,
		kind: body.kind as string,
		title: body.title as string,
		body: body.body as string
	});
	return result.ok ? json({ id: result.id }, { status: 201 }) : fail(result.error);
}
