import { redirect } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { SORTS, TABS, feedParams } from '$lib/server/forum/params';

export async function load({ locals, url }) {
	if (!locals.accountId) redirect(303, '/welcome');
	const { tab, sort, page } = feedParams(url);
	const app = await getApp();
	const [items, mostAffected] = await Promise.all([app.feed.list({ tab, sort, page }), app.feed.mostAffected()]);
	return { items, mostAffected, tab, sort, page, tabs: TABS, sorts: SORTS };
}
