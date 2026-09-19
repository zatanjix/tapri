<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/client/api';
	import HelpNote from '$lib/components/HelpNote.svelte';
	import { showsDistress } from '$lib/shared/distress';

	let { data } = $props();

	const DRAFT = 'tapri.draft';
	type Kind = 'grievance' | 'conversation';

	let category = $state('');
	let kind = $state<Kind>('grievance');
	let title = $state('');
	let body = $state('');
	let busy = $state(false);
	let error = $state('');
	let loaded = false;

	const current = $derived(data.categories.find((c) => c.slug === category));
	const distress = $derived(showsDistress(`${title}\n${body}`));
	const valid = $derived(Boolean(category) && title.trim().length >= 5 && title.trim().length <= 150 && body.trim().length > 0);

	onMount(() => {
		try {
			const d = JSON.parse(localStorage.getItem(DRAFT) ?? 'null');
			if (d) ({ category, kind, title, body } = d);
		} catch {
			/* ignore a corrupt draft */
		}
		if (data.preselect && data.categories.some((c) => c.slug === data.preselect)) category = data.preselect;
		loaded = true;
	});

	$effect(() => {
		const draft = JSON.stringify({ category, kind, title, body });
		if (loaded) localStorage.setItem(DRAFT, draft);
	});

	const ERRORS: Record<string, string> = {
		invalid_title: 'The title needs to be between 5 and 150 characters.',
		invalid_body: 'The post needs some text, up to 10,000 characters.',
		unknown_category: 'Pick a category.',
		rate_limited: "You've posted a lot in the last hour. Try again a little later.",
		network: "Couldn't reach Tapri. Your draft is saved on this device."
	};

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const r = await api<{ id: number }>('/api/posts', { body: { category, kind, title, body } });
		busy = false;
		if (r.ok) {
			localStorage.removeItem(DRAFT);
			goto(`/p/${r.data.id}`);
		} else error = ERRORS[r.error] ?? "Couldn't post that. Your draft is saved on this device.";
	}
</script>

<svelte:head>
	<title>Create a post · tapri</title>
</svelte:head>

<form class="page" onsubmit={submit}>
	<h1>Create a post</h1>

	<fieldset>
		<legend class="label">Category</legend>
		<div class="chips">
			{#each data.categories as c (c.slug)}
				<label class="chip" class:on={category === c.slug}>
					<input type="radio" name="category" value={c.slug} bind:group={category} class="sr-only" />{c.name}
				</label>
			{/each}
		</div>
		{#if current}<p class="ctx">{current.description}</p>{/if}
	</fieldset>

	<fieldset>
		<legend class="label">What kind of post?</legend>
		<div class="kinds">
			<label class="kind" class:on={kind === 'grievance'}>
				<input type="radio" name="kind" value="grievance" bind:group={kind} class="sr-only" />
				<b>Raise a grievance</b>
				<span>Others can mark "affects me too". The count shows how widespread it is.</span>
			</label>
			<label class="kind" class:on={kind === 'conversation'}>
				<input type="radio" name="kind" value="conversation" bind:group={kind} class="sr-only" />
				<b>Start a conversation</b>
				<span>A question, advice, or something on your mind.</span>
			</label>
		</div>
	</fieldset>

	<div class="editor">
		<label class="sr-only" for="title">Title</label>
		<input id="title" class="title" bind:value={title} maxlength="150" placeholder="Title" autocomplete="off" />
		<label class="sr-only" for="body">Post</label>
		<textarea id="body" bind:value={body} maxlength="10000" rows="9" placeholder="Say what happened, since when, and what you've already tried."></textarea>
		<div class="meta"><span>No images, to keep hidden metadata out.</span><span>{body.length.toLocaleString()} / 10,000</span></div>
	</div>

	{#if distress}<div class="note"><HelpNote distress /></div>{/if}

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	<div class="foot">
		<span class="muted">You'll appear under a new random name in this thread. Drafts stay on this device.</span>
		<button class="btn" disabled={busy || !valid}>{busy ? 'Posting…' : 'Post'}</button>
	</div>
</form>

<style>
	.page {
		max-width: 680px;
		margin: 0 auto;
		padding: 22px var(--gutter) 0;
	}
	h1 {
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 16px;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0 0 18px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.chip {
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 7px 11px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 120ms, color 120ms;
	}
	.chip.on {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
	.chip:has(:focus-visible),
	.kind:has(:focus-visible) {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.ctx {
		font-size: 12.5px;
		color: var(--muted);
		margin: 8px 0 0;
	}
	.kinds {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.kind {
		border: 1.5px solid var(--border);
		border-radius: 10px;
		padding: 11px 12px;
		cursor: pointer;
	}
	.kind.on {
		border-color: var(--ink);
	}
	.kind b {
		display: block;
		font-size: 14px;
	}
	.kind span {
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.45;
	}
	.editor {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
	}
	.title {
		width: 100%;
		border: 0;
		border-bottom: 1px solid var(--border);
		padding: 12px 14px;
		font-size: 17px;
		font-weight: 700;
		background: transparent;
	}
	textarea {
		display: block;
		width: 100%;
		border: 0;
		padding: 12px 14px;
		font-size: 15px;
		line-height: 1.65;
		resize: vertical;
		background: transparent;
		min-height: 180px;
	}
	.title:focus,
	textarea:focus {
		outline: none;
	}
	.editor:focus-within {
		border-color: var(--ink);
	}
	.meta {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 7px 14px;
		font-size: 12px;
		color: var(--muted);
		background: var(--surface);
	}
	.note {
		margin-top: 12px;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--border);
		font-size: 12.5px;
	}
	.foot .btn {
		padding: 10px 20px;
		flex: none;
	}
	@media (max-width: 520px) {
		.kinds {
			grid-template-columns: 1fr;
		}
	}
</style>
