<script lang="ts">
	/** Preview for the composers. The parser is only downloaded the first time someone opens a preview. */
	import type { Block } from '$lib/shared/markdown';
	import Markdown from './Markdown.svelte';

	let { source }: { source: string } = $props();
	let blocks = $state<Block[] | null>(null);

	$effect(() => {
		const src = source;
		import('$lib/shared/markdown').then((m) => (blocks = m.parseMarkdown(src)));
	});
</script>

<div class="pv">
	{#if blocks === null}<p class="muted">Loading preview…</p>{:else if blocks.length}<Markdown {blocks} />{:else}<p class="muted">Nothing to preview yet.</p>{/if}
</div>

<style>
	.pv {
		overflow-wrap: anywhere;
	}
	.muted {
		margin: 0;
	}
</style>
