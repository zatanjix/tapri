<script lang="ts">
	import { api } from '$lib/client/api';

	let {
		targetType,
		targetId,
		upvotes,
		downvotes,
		myVote,
		canDownvote,
		compact = false
	}: {
		targetType: 'post' | 'reply';
		targetId: number;
		upvotes: number;
		downvotes: number;
		myVote: -1 | 0 | 1;
		canDownvote: boolean;
		compact?: boolean;
	} = $props();

	let up = $state(0);
	let down = $state(0);
	let mine = $state<-1 | 0 | 1>(0);
	let busy = $state(false);

	$effect.pre(() => {
		up = upvotes;
		down = downvotes;
		mine = myVote;
	});

	async function cast(value: 1 | -1) {
		if (busy) return;
		busy = true;
		const r = await api<{ vote: -1 | 0 | 1; upvotes: number; downvotes: number }>('/api/vote', {
			body: { targetType, targetId, value }
		});
		busy = false;
		if (r.ok) ({ vote: mine, upvotes: up, downvotes: down } = r.data);
	}
</script>

<span class="vote" class:compact>
	<button class="up" class:on={mine === 1} aria-pressed={mine === 1} aria-label="Upvote" onclick={() => cast(1)}>▲</button>
	<span class="score" aria-label="Score">{up - down}</span>
	{#if canDownvote}
		<button class="down" class:on={mine === -1} aria-pressed={mine === -1} aria-label="Downvote" onclick={() => cast(-1)}>▼</button>
	{/if}
</span>

<style>
	.vote {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 2px 4px;
	}
	.compact {
		border: 0;
		padding: 0;
	}
	button {
		background: none;
		border: 0;
		padding: 4px 6px;
		font-size: 12px;
		color: var(--muted);
		border-radius: 6px;
		transition: color 120ms, background-color 120ms;
	}
	.compact button {
		padding: 2px 4px;
	}
	button:hover {
		color: var(--ink);
		background: var(--surface);
	}
	.up.on {
		color: var(--count);
	}
	.down.on {
		color: var(--ink);
	}
	.score {
		min-width: 18px;
		text-align: center;
		font-size: 13px;
		font-weight: 700;
	}
	.compact .score {
		font-size: 12.5px;
		color: var(--muted);
	}
</style>
