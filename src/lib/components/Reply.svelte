<script lang="ts">
	import { api } from '$lib/client/api';
	import type { ReplyView } from '$lib/server/forum/types';
	import { timeAgo } from '$lib/shared/time';
	import Avatar from './Avatar.svelte';
	import HelpNote from './HelpNote.svelte';
	import Reply from './Reply.svelte';
	import ReplyBox from './ReplyBox.svelte';
	import ReportButton from './ReportButton.svelte';
	import VoteControl from './VoteControl.svelte';

	let {
		reply,
		postId,
		viewerHandle,
		canDownvote,
		onchange
	}: { reply: ReplyView; postId: number; viewerHandle: string; canDownvote: boolean; onchange: () => void } = $props();

	let replying = $state(false);


	async function remove() {
		if (!confirm('Delete this reply? This cannot be undone.')) return;
		const r = await api(`/api/replies/${reply.id}`, { method: 'DELETE' });
		if (r.ok) onchange();
	}
</script>

<div class="r">
	<Avatar handle={reply.handle} />
	<div class="main">
		{#if reply.status === 'published'}
			<div class="meta">
				<b>{reply.handle}</b>
				{#if reply.isOp}<span class="op">OP</span>{/if}
				{#if reply.mine}<span class="you">you</span>{/if}
				· {timeAgo(reply.publishedOn)}
			</div>
			<p class="tx">{reply.body}</p>
			{#if reply.distress}<div class="note"><HelpNote distress /></div>{/if}
			<div class="acts">
				<VoteControl targetType="reply" targetId={reply.id} upvotes={reply.upvotes} downvotes={reply.downvotes} myVote={reply.myVote} {canDownvote} compact />
				{#if reply.parentId === null}<button onclick={() => (replying = !replying)}>Reply</button>{/if}
				{#if reply.mine}<button onclick={remove}>Delete</button>{:else}<ReportButton targetType="reply" targetId={reply.id} />{/if}
			</div>
		{:else}
			<p class="gone">{reply.status === 'deleted' ? 'Deleted by its author.' : 'Removed.'}</p>
		{/if}

		{#if reply.children.length}
			<div class="kids">
				{#each reply.children as child (child.id)}
					<Reply reply={child} {postId} {viewerHandle} {canDownvote} {onchange} />
				{/each}
			</div>
		{/if}

		{#if replying}
			<div class="box">
				<ReplyBox
					{postId}
					parentId={reply.id}
					handle={viewerHandle}
					autofocus
					onposted={() => {
						replying = false;
						onchange();
					}}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.r {
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 11px;
		padding: 14px 0 2px;
	}
	.main {
		min-width: 0;
	}
	.meta {
		font-size: 12.5px;
		color: var(--muted);
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
	}
	.meta b {
		color: var(--ink);
	}
	.op,
	.you {
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 4px;
	}
	.op {
		background: var(--ink);
		color: var(--bg);
	}
	.you {
		border: 1px solid var(--border);
	}
	.tx {
		font-size: 14.5px;
		line-height: 1.6;
		margin: 4px 0 6px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.gone {
		font-size: 13px;
		font-style: italic;
		color: var(--muted);
		margin: 4px 0;
	}
	.note {
		margin: 6px 0 8px;
	}
	.acts {
		display: flex;
		gap: 16px;
	}
	.acts button {
		background: none;
		border: 0;
		padding: 2px 0;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--muted);
	}
	.acts button:hover {
		color: var(--ink);
	}
	.kids {
		margin-top: 4px;
		padding-left: 14px;
		border-left: 2px solid var(--border);
	}
	.box {
		margin: 10px 0 4px;
	}
</style>
