<script lang="ts">
	import { goto } from '$app/navigation';

	let { value = $bindable(''), onsearch }: { value?: string; onsearch?: (q: string) => void } = $props();

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const q = value.trim();
		if (q.length < 2) return;
		// The query goes in the fragment (#), which browsers never send to the server.
		if (onsearch) onsearch(q);
		else goto(`/search#${encodeURIComponent(q)}`);
	}
</script>

<form class="box" role="search" onsubmit={submit}>
	<label class="sr-only" for="q">Search posts</label>
	<input id="q" type="search" bind:value placeholder="Search posts" autocomplete="off" maxlength="200" enterkeyhint="search" />
</form>

<style>
	.box {
		margin-bottom: 12px;
	}
	input {
		width: 100%;
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 10px;
		padding: 10px 13px;
		font-size: 14.5px;
		transition: border-color 120ms, background-color 120ms;
	}
	input:focus {
		outline: none;
		border-color: var(--ink);
		background: var(--bg);
	}
</style>
