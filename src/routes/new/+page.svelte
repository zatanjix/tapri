<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/client/api';
	import { prepareImage } from '$lib/client/images';
	import HelpNote from '$lib/components/HelpNote.svelte';
	import MdHint from '$lib/components/MdHint.svelte';
	import MdPreview from '$lib/components/MdPreview.svelte';
	import { showsDistress } from '$lib/shared/distress';

	let { data } = $props();

	const DRAFT = 'tapri.draft';
	type Kind = 'grievance' | 'conversation';

	let category = $state('');
	let kind = $state<Kind>('grievance');
	let title = $state('');
	let body = $state('');
	let busy = $state(false);
	let preview = $state(false);
	let photos = $state<{ blob: Blob; url: string }[]>([]);
	let preparing = $state(false);
	let photoError = $state('');
	const MAX_PHOTOS = 4;

	async function addPhotos(e: Event & { currentTarget: HTMLInputElement }) {
		const files = [...(e.currentTarget.files ?? [])].slice(0, MAX_PHOTOS - photos.length);
		e.currentTarget.value = '';
		photoError = '';
		preparing = true;
		for (const file of files) {
			const blob = await prepareImage(file);
			if (blob) photos.push({ blob, url: URL.createObjectURL(blob) });
			else photoError = "One photo couldn't be read. Try a JPEG or PNG.";
		}
		preparing = false;
	}

	function removePhoto(i: number) {
		URL.revokeObjectURL(photos[i].url);
		photos.splice(i, 1);
	}
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
		network: "Couldn't reach Tapri. Your draft is saved on this device.",
		too_many_images: 'Up to 4 photos per post.',
		invalid_image: "One of the photos couldn't be read. Try a JPEG or PNG.",
		images_unavailable: "Photos can't be posted right now. Remove them to post the text.",
		too_large: 'The photos are too large together. Try fewer.',
		unavailable: "Photos couldn't be saved just now. Nothing was posted; try again."
	};

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		let payload: FormData | object = { category, kind, title, body };
		if (photos.length) {
			// Hosting refuses requests over 4.5 MB; say so here rather than failing vaguely.
			if (photos.reduce((n, p) => n + p.blob.size, 0) > 4_300_000) {
				busy = false;
				error = ERRORS.too_large;
				return;
			}
			const form = new FormData();
			for (const [k, v] of Object.entries({ category, kind, title, body })) form.append(k, v);
			photos.forEach((p, i) => form.append('images', p.blob, `photo-${i + 1}`));
			payload = form;
		}
		const r = await api<{ id: number }>('/api/posts', { body: payload });
		busy = false;
		if (r.ok) {
			localStorage.removeItem(DRAFT);
			photos.forEach((p) => URL.revokeObjectURL(p.url));
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
		{#if preview}
			<div class="preview"><MdPreview source={body} /></div>
		{:else}
			<label class="sr-only" for="body">Post</label>
			<textarea id="body" bind:value={body} maxlength="10000" rows="9" placeholder="Say what happened, since when, and what you've already tried."></textarea>
		{/if}
		<div class="meta">
			<div class="modes" role="group" aria-label="Editor mode">
				<button type="button" aria-pressed={!preview} onclick={() => (preview = false)}>Write</button>
				<button type="button" aria-pressed={preview} onclick={() => (preview = true)}>Preview</button>
			</div>
			<span>{body.length.toLocaleString()} / 10,000</span>
		</div>
		<div class="hintrow"><MdHint /></div>
	</div>

	{#if data.imagesEnabled}
		<div class="photos">
			{#if photos.length}
				<div class="thumbs">
					{#each photos as p, i (p.url)}
						<div class="thumb">
							<img src={p.url} alt="Photo {i + 1}" />
							<button type="button" aria-label="Remove photo {i + 1}" onclick={() => removePhoto(i)}>×</button>
						</div>
					{/each}
				</div>
			{/if}
			<div class="addrow">
				<label class="add" class:disabled={photos.length >= MAX_PHOTOS || preparing}>
					<input type="file" accept="image/*" multiple class="sr-only" disabled={photos.length >= MAX_PHOTOS || preparing} onchange={addPhotos} />
					{preparing ? 'Preparing…' : photos.length ? `Add photos (${photos.length}/${MAX_PHOTOS})` : 'Add photos'}
				</label>
				<span class="pnote">
					Location, camera and time details are removed before upload. What's <em>in</em> a photo stays: check for
					faces, names, room numbers and views from windows. <a href="/rules#photos">More</a>
				</span>
			</div>
			{#if photoError}<p class="error" role="alert">{photoError}</p>{/if}
		</div>
	{/if}

	{#if distress}<div class="note"><HelpNote distress /></div>{/if}

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	<div class="foot">
		<span class="muted">You'll appear under a new random name in this thread. Drafts stay on this device. <a href="/rules">House rules</a>.</span>
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
	.preview {
		padding: 12px 14px;
		min-height: 180px;
		font-size: 15px;
		line-height: 1.65;
	}
	.meta {
		align-items: center;
	}
	.modes {
		display: flex;
		gap: 2px;
	}
	.modes button {
		border: 0;
		background: none;
		border-radius: 6px;
		padding: 3px 9px;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}
	.modes button[aria-pressed='true'] {
		background: var(--bg);
		color: var(--ink);
		box-shadow: 0 0 0 1px var(--border);
	}
	.hintrow {
		padding: 0 14px 8px;
		background: var(--surface);
	}
	.photos {
		margin-top: 12px;
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 10px;
	}
	.thumb {
		position: relative;
		width: 76px;
		height: 76px;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid var(--border);
	}
	.thumb button {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--ink);
		font-size: 14px;
		line-height: 1;
		padding: 0;
	}
	.addrow {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.add {
		flex: none;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 7px 11px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
	.add:has(:focus-visible) {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.add.disabled {
		opacity: 0.5;
		cursor: default;
	}
	.pnote {
		font-size: 12px;
		line-height: 1.45;
		color: var(--muted);
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
