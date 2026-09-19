<script lang="ts">
	import type { FeedItem } from '$lib/server/forum/types';
	import { timeAgo } from '$lib/shared/time';
	import Avatar from './Avatar.svelte';

	let { item }: { item: FeedItem } = $props();

	const countLabel = $derived(item.kind === 'grievance' ? 'affected' : 'feel this');
	const showCount = $derived(item.kind === 'grievance' || item.metoo > 0);
</script>

<article class="row">
	<Avatar handle={item.handle} />
	<div class="main">
		<div class="who"><b>{item.handle}</b> · {item.category.name} · {timeAgo(item.publishedOn)}</div>
		<h3><a href="/p/{item.id}">{item.title}</a></h3>
		<p class="ex">{item.excerpt}</p>
		<div class="st">
			{#if showCount}<span class="count">{item.metoo} {countLabel}</span>{/if}
			<span>{item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}</span>
		</div>
	</div>
</article>

<style>
	.row {
		display: grid;
		grid-template-columns: 34px 1fr;
		gap: 12px;
		padding: 15px 0;
		border-bottom: 1px solid var(--border);
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
		font-weight: 700;
	}
	h3 {
		font-size: 17px;
		font-weight: 800;
		line-height: 1.3;
		letter-spacing: -0.01em;
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
	.row {
		position: relative;
	}
	.row:hover h3 a {
		text-decoration: underline;
	}
	.ex {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		opacity: 0.86;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
	}
	.st {
		display: flex;
		gap: 14px;
		font-size: 12.5px;
		color: var(--muted);
		margin-top: 9px;
	}
	.count {
		color: var(--count);
		font-weight: 700;
	}
	@media (max-width: 600px) {
		h3 {
			font-size: 16px;
		}
	}
</style>
