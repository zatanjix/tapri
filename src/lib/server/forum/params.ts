import type { FeedSort, FeedTab } from './feed';

export const TABS: { id: FeedTab; label: string }[] = [
	{ id: 'all', label: 'Everything' },
	{ id: 'grievances', label: 'Grievances' },
	{ id: 'conversations', label: 'Conversations' },
	{ id: 'unanswered', label: 'Unanswered' }
];

export const SORTS: { id: FeedSort; label: string }[] = [
	{ id: 'hot', label: 'Most relevant' },
	{ id: 'new', label: 'Latest first' },
	{ id: 'old', label: 'Oldest first' },
	{ id: 'top', label: 'Top voted' },
	{ id: 'affected', label: 'Most affected' }
];

/** Reads tab, sort and page from a URL, falling back to defaults for anything invalid. */
export function feedParams(url: URL): { tab: FeedTab; sort: FeedSort; page: number } {
	const tab = url.searchParams.get('tab') as FeedTab;
	const sort = url.searchParams.get('sort') as FeedSort;
	const page = Number(url.searchParams.get('page'));
	return {
		tab: TABS.some((t) => t.id === tab) ? tab : 'all',
		sort: SORTS.some((s) => s.id === sort) ? sort : 'hot',
		page: Number.isInteger(page) && page > 0 ? page : 1
	};
}
