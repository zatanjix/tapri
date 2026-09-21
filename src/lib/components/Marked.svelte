<script lang="ts">
	/** Renders text containing  …  markers as highlights, without ever interpreting HTML. */
	let { text }: { text: string } = $props();

	const parts = $derived(
		text.split('').flatMap((chunk, i) => {
			if (i === 0) return [{ hit: false, text: chunk }];
			const [hit, rest = ''] = chunk.split('');
			return [
				{ hit: true, text: hit },
				{ hit: false, text: rest }
			];
		})
	);
</script>

{#each parts as part, i (i)}{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}

<style>
	mark {
		background: color-mix(in srgb, var(--band) 55%, transparent);
		color: inherit;
		border-radius: 3px;
		padding: 0 2px;
	}
</style>
