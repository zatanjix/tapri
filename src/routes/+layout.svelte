<script lang="ts">
	import '@fontsource/plus-jakarta-sans/400.css';
	import '@fontsource/plus-jakarta-sans/500.css';
	import '@fontsource/plus-jakarta-sans/600.css';
	import '@fontsource/plus-jakarta-sans/700.css';
	import '@fontsource/plus-jakarta-sans/800.css';
	import '@fontsource/jetbrains-mono/500.css';
	import '@fontsource/jetbrains-mono/600.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { loadTicket } from '$lib/client/signup-store';
	import Band from '$lib/components/Band.svelte';

	let { data, children } = $props();

	// A sign-up waiting out its random pause resumes wherever Tapri is reopened.
	onMount(() => {
		if (!data.signedIn && page.url.pathname !== '/join' && loadTicket()) goto('/join');
	});

	async function signOut() {
		await fetch('/api/session', { method: 'DELETE' });
		location.href = '/welcome';
	}
</script>

<svelte:head>
	<title>tapri</title>
</svelte:head>

<Band signedIn={data.signedIn} categories={data.categories} />

<main>
	{@render children()}
</main>

<footer class="wrap">
	<p>Tapri is independent and not affiliated with the institute.</p>
	<p class="links">
		<a href="/help">Get help</a>
		{#if data.sourceUrl}<a href={data.sourceUrl} rel="noreferrer noopener">Source code</a>{/if}
		{#if data.signedIn}<button type="button" onclick={signOut}>Sign out</button>{/if}
	</p>
</footer>

<style>
	main {
		min-height: 70vh;
	}
	footer {
		margin-top: 48px;
		padding-top: 20px;
		padding-bottom: 32px;
		border-top: 1px solid var(--border);
		font-size: 12.5px;
		color: var(--muted);
	}
	footer p {
		margin: 0 0 6px;
	}
	.links {
		display: flex;
		gap: 16px;
		align-items: center;
	}
	.links button {
		background: none;
		border: 0;
		padding: 0;
		color: inherit;
		text-decoration: underline;
		font-size: inherit;
	}
</style>
