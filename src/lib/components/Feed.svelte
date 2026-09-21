<script lang="ts">
	import { goto } from '$app/navigation';
	import type { FeedSort, FeedTab } from '$lib/server/forum/feed';
	import type { FeedItem } from '$lib/server/forum/types';
	import FeedRow from './FeedRow.svelte';

	let {
		items,
		tab,
		sort,
		page,
		tabs,
		sorts
	}: {
		items: FeedItem[];
		tab: FeedTab;
		sort: FeedSort;
		page: number;
		tabs: { id: FeedTab; label: string }[];
		sorts: { id: FeedSort; label: string }[];
	} = $props();

	const href = (p: { tab?: FeedTab; sort?: FeedSort; page?: number }) => {
		const q = new URLSearchParams();
		const t = p.tab ?? tab;
		const s = p.sort ?? sort;
		if (t !== 'all') q.set('tab', t);
		if (s !== 'hot') q.set('sort', s);
		if ((p.page ?? 1) > 1) q.set('page', String(p.page));
		const qs = q.toString();
		return qs ? `?${qs}` : '?';
	};

	const EMPTY: Record<FeedTab, string> = {
		all: 'Nothing here yet. Be the first to start something.',
		grievances: 'No grievances yet. If something needs fixing, raise it.',
		conversations: 'No conversations yet. Ask the question you would ask a senior you trust.',
		unanswered: 'Every post has a reply. Nice.'
	};
</script>

<nav class="tabs" aria-label="Feed">
	{#each tabs as t (t.id)}
		<a href={href({ tab: t.id })} aria-current={t.id === tab ? 'page' : undefined}>{t.label}</a>
	{/each}
</nav>

<div class="sorts">
	<label for="sort">Sort</label>
	<select id="sort" value={sort} onchange={(e) => goto(href({ sort: e.currentTarget.value as FeedSort }))}>
		{#each sorts as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
	</select>
</div>

{#if items.length}
	{#each items as item (item.id)}<FeedRow {item} />{/each}
	{#if items.length === 20}
		<a class="more" href={href({ page: page + 1 })}>More posts</a>
	{/if}
{:else}
	<p class="empty">{EMPTY[tab]} <a href="/new">Create a post</a></p>
{/if}

<style>
	.tabs {
		display: flex;
		gap: 18px;
		border-bottom: 1px solid var(--border);
		font-size: 13.5px;
		font-weight: 600;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.tabs a {
		color: var(--muted);
		text-decoration: none;
		padding-bottom: 9px;
		white-space: nowrap;
	}
	.tabs a[aria-current='page'] {
		color: var(--ink);
		box-shadow: inset 0 -2px 0 var(--ink);
	}
	.sorts {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		color: var(--muted);
		padding: 10px 0 2px;
	}
	.sorts select {
		border: 1px solid var(--border);
		background: var(--bg);
		border-radius: 8px;
		padding: 5px 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--ink);
	}
	.more {
		display: block;
		text-align: center;
		padding: 16px;
		font-weight: 700;
		font-size: 14px;
	}
	.empty {
		color: var(--muted);
		padding: 28px 0;
		text-align: center;
	}
</style>
