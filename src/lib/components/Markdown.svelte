<script lang="ts">
	/** Renders a markdown tree built on the server. Only Temml's MathML is inserted as markup. */
	import type { Block } from '$lib/shared/markdown';
	import Markdown from './Markdown.svelte';
	import MdInlines from './MdInlines.svelte';

	let { blocks }: { blocks: Block[] } = $props();
</script>

{#each blocks as b, i (i)}
	{#if b.t === 'p'}
		<p><MdInlines items={b.c} /></p>
	{:else if b.t === 'quote'}
		<blockquote><Markdown blocks={b.c} /></blockquote>
	{:else if b.t === 'list' && b.ordered}
		<ol start={b.start}>{#each b.items as item, j (j)}<li><Markdown blocks={item} /></li>{/each}</ol>
	{:else if b.t === 'list'}
		<ul>{#each b.items as item, j (j)}<li><Markdown blocks={item} /></li>{/each}</ul>
	{:else if b.t === 'pre'}
		<pre><code>{b.v}</code></pre>
	{:else if b.t === 'mathBlock'}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- MathML from Temml, checked in shared/markdown.ts -->
		<div class="math">{@html b.html}</div>
	{:else if b.t === 'hr'}
		<hr />
	{/if}
{/each}

<style>
	p {
		margin: 0 0 0.7em;
	}
	p:last-child,
	blockquote:last-child,
	ul:last-child,
	ol:last-child,
	pre:last-child {
		margin-bottom: 0;
	}
	blockquote {
		margin: 0 0 0.7em;
		padding: 2px 0 2px 12px;
		border-left: 3px solid var(--border);
		color: var(--muted);
	}
	ul,
	ol {
		margin: 0 0 0.7em;
		padding-left: 22px;
	}
	li > :global(p) {
		margin-bottom: 0.2em;
	}
	pre {
		margin: 0 0 0.7em;
		padding: 10px 12px;
		background: var(--surface);
		border-radius: 8px;
		overflow-x: auto;
		font-family: var(--mono);
		font-size: 0.85em;
		line-height: 1.5;
		white-space: pre;
	}
	.math {
		margin: 0 0 0.7em;
		overflow-x: auto;
		overflow-y: hidden;
	}
	hr {
		border: 0;
		border-top: 1px solid var(--border);
		margin: 1em 0;
	}
</style>
