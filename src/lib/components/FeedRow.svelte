<script lang="ts">
	import type { FeedItem } from '$lib/server/forum/types';
	import { timeAgo } from '$lib/shared/time';
	import Avatar from './Avatar.svelte';
	import OfficialBadge from './OfficialBadge.svelte';

	let { item, pinned = false }: { item: FeedItem; pinned?: boolean } = $props();

	const countLabel = $derived(item.kind === 'grievance' ? 'affected' : 'feel this');
	const showCount = $derived(item.kind === 'grievance' || item.metoo > 0);
</script>

<article class="row" class:pinned>
	<Avatar handle={item.handle} />
	<div class="main">
		<div class="who">{#if pinned}<span class="pin">Pinned</span>{/if}<b>{item.handle}</b>{#if item.official} <OfficialBadge />{/if} · {item.category.name} · {timeAgo(item.publishedOn)}</div>
		<h3><a href="/p/{item.slug}">{item.title}</a></h3>
		<p class="ex">{item.excerpt}</p>
		<div class="st">
			{#if showCount}<span class="count">{item.metoo} {countLabel}</span>{/if}
			<span>{item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}</span>
			{#if item.imageCount}<span>{item.imageCount} {item.imageCount === 1 ? 'photo' : 'photos'}</span>{/if}
			{#if item.newReplies}<span class="new">{item.newReplies} new</span>{/if}
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
	.pinned {
		background: color-mix(in srgb, var(--band) 16%, transparent);
		margin: 0 calc(-1 * var(--gutter));
		padding-left: var(--gutter);
		padding-right: var(--gutter);
	}
	.pin {
		display: inline-block;
		margin-right: 7px;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--ink);
		color: var(--bg);
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
	.new {
		color: var(--ink);
		font-weight: 800;
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
