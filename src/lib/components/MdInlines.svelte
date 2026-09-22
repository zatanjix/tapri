<script lang="ts">
	import type { Inline } from '$lib/shared/markdown';
	import MdInlines from './MdInlines.svelte';

	let { items }: { items: Inline[] } = $props();
</script>

<!-- Kept on one line per node so no stray spaces appear between words. -->
{#each items as n, i (i)}{#if n.t === 'text'}{n.v}{:else if n.t === 'br'}<br />{:else if n.t === 'strong'}<strong><MdInlines items={n.c} /></strong>{:else if n.t === 'em'}<em><MdInlines items={n.c} /></em>{:else if n.t === 'del'}<del><MdInlines items={n.c} /></del>{:else if n.t === 'code'}<code>{n.v}</code>{:else if n.t === 'link' && n.href.startsWith('/')}<a href={n.href}><MdInlines items={n.c} /></a>{:else if n.t === 'link'}<a href={n.href} target="_blank" rel="noopener noreferrer nofollow"><MdInlines items={n.c} /></a>{:else if n.t === 'math'}{@html n.html}{/if}{/each}

<style>
	code {
		font-family: var(--mono);
		font-size: 0.86em;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0 4px;
	}
	a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	strong {
		font-weight: 800;
	}
</style>
