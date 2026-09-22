import { redirect } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { SORTS, TABS, feedParams } from '$lib/server/forum/params';

export async function load({ locals, url }) {
	if (!locals.accountId) redirect(303, '/welcome');
	const { tab, sort, page } = feedParams(url);
	const app = await getApp();
	// Recent official posts sit on top of the Everything tab, and aren't repeated below.
	const pinned = tab === 'all' ? await app.feed.pinned() : [];
	const exclude = pinned.map((p) => p.id);
	const [items, mostAffected] = await Promise.all([
		app.feed.list({ tab, sort, page, viewerId: locals.accountId, exclude }),
		app.feed.mostAffected()
	]);
	return { items, pinned: page === 1 ? pinned : [], mostAffected, tab, sort, page, tabs: TABS, sorts: SORTS };
}
