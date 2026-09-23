import { error, redirect } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { idParam } from '$lib/server/http';

export async function load({ locals, params }) {
	if (!locals.accountId) redirect(303, '/welcome');
	const app = await getApp();

	// Links shared before threads had their own addresses still work.
	const oldId = idParam(params.slug);
	if (oldId !== null) {
		const slug = await app.posts.slugForId(oldId);
		if (slug) redirect(308, `/p/${slug}`);
		error(404, "This post doesn't exist or was deleted.");
	}

	const id = await app.posts.idForSlug(params.slug);
	const thread = id ? await app.posts.getThread(locals.accountId, id) : null;
	if (!thread) error(404, "This post doesn't exist or was deleted.");
	return { thread };
}
