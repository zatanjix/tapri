<script lang="ts">
	import { onMount } from 'svelte';
	import { THEME_COOKIE, parseTheme, type Theme } from '$lib/shared/theme';

	const OPTIONS: { id: Theme; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'system', label: 'Auto' }
	];

	let theme = $state<Theme>('light');

	onMount(() => {
		theme = parseTheme(document.documentElement.dataset.theme);
	});

	function choose(next: Theme) {
		theme = next;
		document.documentElement.dataset.theme = next;
		document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Strict`;
	}
</script>

<div class="switch" role="radiogroup" aria-label="Theme">
	{#each OPTIONS as o (o.id)}
		<button type="button" role="radio" aria-checked={theme === o.id} onclick={() => choose(o.id)}>{o.label}</button>
	{/each}
</div>

<style>
	.switch {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 2px;
		gap: 2px;
	}
	button {
		background: none;
		border: 0;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		transition: background-color 120ms, color 120ms;
	}
	button[aria-checked='true'] {
		background: var(--surface);
		color: var(--ink);
	}
</style>
