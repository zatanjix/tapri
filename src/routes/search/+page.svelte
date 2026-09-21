<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/client/api';
	import Avatar from '$lib/components/Avatar.svelte';
	import Marked from '$lib/components/Marked.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import type { SearchResult } from '$lib/server/forum/feed';
	import { timeAgo } from '$lib/shared/time';

	let query = $state('');
	let searched = $state('');
	let results = $state<SearchResult[]>([]);
	let page = $state(1);
	let busy = $state(false);
	let error = $state('');

	async function run(q: string, p = 1) {
		busy = true;
		error = '';
		const r = await api<{ items: SearchResult[] }>('/api/search', { body: { q, page: p } });
		busy = false;
		if (!r.ok) {
			error = "Search isn't working right now. Please try again.";
			return;
		}
		results = p === 1 ? r.data.items : [...results, ...r.data.items];
		searched = q;
		page = p;
		// Keep the query out of the address the server sees; the fragment stays in the browser.
		history.replaceState(history.state, '', `/search#${encodeURIComponent(q)}`);
	}

	onMount(() => {
		const q = decodeURIComponent(location.hash.slice(1));
		if (q) {
			query = q;
			run(q);
		}
	});
</script>

<svelte:head>
	<title>Search · tapri</title>
</svelte:head>

<div class="wrap page">
	<SearchBox bind:value={query} onsearch={(q) => run(q)} />
	<p class="tips muted">Use quotes for exact phrases, <span class="mono">"mess food"</span>, and a minus to exclude, <span class="mono">wifi -hostel</span>.</p>

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	{#if searched}
		<p class="count muted">
			{#if results.length}{results.length}{results.length % 20 === 0 ? '+' : ''} result{results.length === 1 ? '' : 's'} for “{searched}”{:else}Nothing found for “{searched}”. Try fewer or different words.{/if}
		</p>
	{/if}

	{#each results as item (item.id)}
		<article class="row">
			<Avatar handle={item.handle} />
			<div class="main">
				<div class="who"><b>{item.handle}</b> · {item.category.name} · {timeAgo(item.publishedOn)}</div>
				<h3><a href="/p/{item.id}"><Marked text={item.titleMarked} /></a></h3>
				<p class="ex"><Marked text={item.excerptMarked} /></p>
				<div class="st">
					{#if item.kind === 'grievance' || item.metoo > 0}<span class="count-n">{item.metoo} {item.kind === 'grievance' ? 'affected' : 'feel this'}</span>{/if}
					<span>{item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}</span>
				</div>
			</div>
		</article>
	{/each}

	{#if results.length && results.length % 20 === 0}
		<button class="more" disabled={busy} onclick={() => run(searched, page + 1)}>{busy ? 'Loading…' : 'More results'}</button>
	{/if}
</div>

<style>
	.page {
		max-width: 720px;
		padding-top: 18px;
	}
	.tips {
		font-size: 12.5px;
		margin: -4px 0 14px;
	}
	.count {
		font-size: 13px;
		margin: 0 0 4px;
	}
	.row {
		display: grid;
		grid-template-columns: 34px 1fr;
		gap: 12px;
		padding: 15px 0;
		border-bottom: 1px solid var(--border);
		position: relative;
	}
	.main {
		min-width: 0;
	}
	.who {
		font-size: 12.5px;
		color: var(--muted);
	}
	.who b {
		color: var(--ink);
	}
	h3 {
		font-size: 17px;
		font-weight: 800;
		line-height: 1.3;
		margin: 3px 0 5px;
	}
	h3 a {
		text-decoration: none;
	}
	h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.row:hover h3 a {
		text-decoration: underline;
	}
	.ex {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		opacity: 0.86;
		overflow-wrap: anywhere;
	}
	.st {
		display: flex;
		gap: 14px;
		font-size: 12.5px;
		color: var(--muted);
		margin-top: 9px;
	}
	.count-n {
		color: var(--count);
		font-weight: 700;
	}
	.more {
		display: block;
		margin: 16px auto 0;
		background: none;
		border: 0;
		font-weight: 700;
		font-size: 14px;
		text-decoration: underline;
	}
</style>
