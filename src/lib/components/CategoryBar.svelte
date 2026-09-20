<script lang="ts">
	import { page } from '$app/state';

	let { categories }: { categories: { slug: string; name: string }[] } = $props();
	const active = $derived(page.url.pathname.startsWith('/c/') ? page.url.pathname.slice(3) : '');
</script>

<nav class="bar" aria-label="Categories">
	<a href="/" class:on={!active}>Everything</a>
	{#each categories as c (c.slug)}
		<a href="/c/{c.slug}" class:on={active === c.slug}>{c.name}</a>
	{/each}
</nav>

<style>
	.bar {
		display: flex;
		gap: 7px;
		overflow-x: auto;
		scrollbar-width: none;
		padding-bottom: 14px;
		margin: 0 calc(var(--gutter) * -1);
		padding-left: var(--gutter);
		padding-right: var(--gutter);
	}
	.bar::-webkit-scrollbar {
		display: none;
	}
	a {
		flex: none;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 6px 11px;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		color: var(--muted);
		white-space: nowrap;
		transition: background-color 120ms, color 120ms;
	}
	a:hover {
		color: var(--ink);
	}
	a.on {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
</style>
