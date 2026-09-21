import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, readJson, requireAccount } from '$lib/server/http';

/** POST, not GET, so search words travel in the body and never appear in URLs or request logs. */
export async function POST({ locals, request }) {
	if (!requireAccount(locals)) return fail('unauthorized');
	const body = await readJson(request);
	if (typeof body?.q !== 'string') return fail('bad_request');
	const page = typeof body.page === 'number' ? body.page : 1;
	const sort = body.sort === 'new' || body.sort === 'old' ? body.sort : 'relevance';
	return json({ items: await (await getApp()).feed.search(body.q, page, sort) });
}
