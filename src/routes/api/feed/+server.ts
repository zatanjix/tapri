import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import type { FeedSort, FeedTab } from '$lib/server/forum/feed';
import { fail, requireAccount } from '$lib/server/http';

const TABS: FeedTab[] = ['all', 'conversations', 'grievances', 'unanswered', 'following'];
const SORTS: FeedSort[] = ['hot', 'new', 'old', 'top', 'affected'];

export async function GET({ locals, url }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const tab = (url.searchParams.get('tab') ?? 'all') as FeedTab;
	const sort = (url.searchParams.get('sort') ?? 'hot') as FeedSort;
	if (!TABS.includes(tab) || !SORTS.includes(sort)) return fail('bad_request');
	const items = await (await getApp()).feed.list({
		tab,
		sort,
		category: url.searchParams.get('category') ?? undefined,
		page: Number(url.searchParams.get('page') ?? '1') || 1,
		viewerId: accountId
	});
	return json({ items });
}
