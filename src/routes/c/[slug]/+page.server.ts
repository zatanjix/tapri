import { error, redirect } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { SORTS, TABS, feedParams } from '$lib/server/forum/params';

export async function load({ locals, url, params }) {
	if (!locals.accountId) redirect(303, '/welcome');
	const app = await getApp();
	const category = (await app.feed.categories()).find((c) => c.slug === params.slug);
	if (!category) error(404, 'No such category');
	const { tab, sort, page } = feedParams(url);
	const items = await app.feed.list({ tab, sort, page, category: category.slug, viewerId: locals.accountId });
	return { category, items, tab, sort, page, tabs: TABS, sorts: SORTS };
}
