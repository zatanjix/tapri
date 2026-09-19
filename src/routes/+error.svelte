<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Not found' : 'Something went wrong'} · tapri</title>
</svelte:head>

<div class="page">
	<p class="code mono">{page.status}</p>
	<h1>{page.status === 404 ? "This page doesn't exist" : 'Something went wrong'}</h1>
	<p class="muted">{page.status === 404 ? (page.error?.message ?? 'It may have been deleted, or the link is wrong.') : 'Please try again in a moment.'}</p>
	<p class="links"><a class="btn" href="/">Back to Tapri</a> <a href="/help">Get help</a></p>
</div>

<style>
	.page {
		max-width: 520px;
		margin: 0 auto;
		padding: 56px var(--gutter) 0;
	}
	.code {
		color: var(--count);
		font-weight: 600;
		margin: 0 0 6px;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	.links {
		display: flex;
		gap: 16px;
		align-items: center;
		margin-top: 20px;
	}
</style>
