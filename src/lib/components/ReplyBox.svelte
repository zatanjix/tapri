<script lang="ts">
	import { api } from '$lib/client/api';

	let {
		postId,
		parentId,
		handle,
		autofocus = false,
		onposted
	}: { postId: number; parentId?: number; handle: string; autofocus?: boolean; onposted: () => void } = $props();

	let body = $state('');
	let busy = $state(false);
	let error = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const r = await api(`/api/posts/${postId}/replies`, { body: { body, parentId } });
		busy = false;
		if (r.ok) {
			body = '';
			onposted();
		} else
			error =
				r.error === 'rate_limited'
					? "You're replying very fast. Take a short break and try again."
					: r.error === 'network'
						? "Couldn't reach Tapri. Check your connection."
						: "Couldn't post that reply.";
	}
</script>

<form class="box" onsubmit={submit}>
	<!-- svelte-ignore a11y_autofocus -->
	<textarea bind:value={body} placeholder="Write a reply…" maxlength="5000" rows="3" aria-label="Reply" {autofocus}></textarea>
	<div class="bar">
		<span>You'll appear as <b>{handle}</b> in this thread only.</span>
		<button class="btn" disabled={busy || !body.trim()}>{busy ? 'Posting…' : 'Reply'}</button>
	</div>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</form>

<style>
	.box {
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
		background: var(--bg);
	}
	textarea {
		display: block;
		width: 100%;
		border: 0;
		resize: vertical;
		padding: 12px 14px;
		font-size: 14.5px;
		line-height: 1.55;
		background: transparent;
		min-height: 72px;
	}
	textarea:focus {
		outline: none;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 8px 10px 8px 14px;
		background: var(--surface);
		font-size: 12.5px;
		color: var(--muted);
	}
	.bar b {
		color: var(--ink);
	}
	.btn {
		padding: 7px 13px;
		font-size: 13px;
		flex: none;
	}
	.error {
		padding: 0 14px 10px;
	}
</style>
