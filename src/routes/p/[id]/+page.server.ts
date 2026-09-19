import { error, redirect } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { idParam } from '$lib/server/http';

export async function load({ locals, params }) {
	if (!locals.accountId) redirect(303, '/welcome');
	const id = idParam(params.id);
	const thread = id ? await (await getApp()).posts.getThread(locals.accountId, id) : null;
	if (!thread) error(404, "This post doesn't exist or was deleted.");
	return { thread };
}
