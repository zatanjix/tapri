<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/client/api';
	import Avatar from '$lib/components/Avatar.svelte';
	import HelpNote from '$lib/components/HelpNote.svelte';
	import Reply from '$lib/components/Reply.svelte';
	import ReplyBox from '$lib/components/ReplyBox.svelte';
	import SupportBox from '$lib/components/SupportBox.svelte';
	import { timeAgo } from '$lib/shared/time';

	let { data } = $props();
	const post = $derived(data.thread.post);

	let metoo = $state({ active: false, count: 0 });
	let vote = $state({ active: false, count: 0 });
	let copied = $state(false);

	$effect.pre(() => {
		metoo = { active: post.metooed, count: post.metoo };
		vote = { active: post.voted, count: post.upvotes };
	});

	const metooLabel = $derived(
		post.kind === 'grievance' ? 'Affects me too' : post.category.slug === 'wellbeing' ? 'I feel this too' : 'Same here'
	);

	async function toggleMetoo() {
		const r = await api<{ active: boolean; count: number }>(`/api/posts/${post.id}/metoo`, { method: 'POST' });
		if (r.ok) metoo = r.data;
	}

	async function toggleVote() {
		const r = await api<{ active: boolean; count: number }>('/api/vote', { body: { targetType: 'post', targetId: post.id } });
		if (r.ok) vote = r.data;
	}

	async function copyLink() {
		await navigator.clipboard.writeText(location.href);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function remove() {
		if (!confirm('Delete this post and hide the thread? This cannot be undone.')) return;
		const r = await api(`/api/posts/${post.id}`, { method: 'DELETE' });
		if (r.ok) goto('/');
	}

	const refresh = () => invalidateAll();
</script>

<svelte:head>
	<title>{post.title} · tapri</title>
</svelte:head>

<div class="wrap layout">
	<article class="col">
		<div class="crumb"><a href="/c/{post.category.slug}">{post.category.name}</a> / <span class="mono">#{post.id}</span></div>
		<div class="who">
			<Avatar handle={post.handle} />
			<span><b>{post.handle}</b>{#if post.mine} <span class="you">you</span>{/if} · {timeAgo(post.publishedOn)}</span>
		</div>
		<h1>{post.title}</h1>
		<div class="body">{post.body}</div>

		<div class="acts">
			<button class="feel" class:on={metoo.active} aria-pressed={metoo.active} onclick={toggleMetoo}>
				{metooLabel} <span class="n">{metoo.count}</span>
			</button>
			<button class="sec" class:on={vote.active} aria-pressed={vote.active} onclick={toggleVote}>▲ {vote.count}</button>
			<button class="sec" onclick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
			{#if post.mine}<button class="ghost" onclick={remove}>Delete</button>{/if}
		</div>

		<div class="note">
			<HelpNote category={post.category.slug} distress={post.distress} />
		</div>

		<div class="rhead">
			<h2>{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</h2>
			<span class="muted">Most helpful first</span>
		</div>

		{#each data.thread.replies as reply (reply.id)}
			<Reply {reply} postId={post.id} viewerHandle={data.thread.viewerHandle} onchange={refresh} />
		{/each}

		<div class="compose">
			<ReplyBox postId={post.id} handle={data.thread.viewerHandle} onposted={refresh} />
		</div>
	</article>

	<aside class="side">
		<SupportBox />
		<section class="box">
			<h2>About this thread</h2>
			<ul>
				<li>Everyone here has a different name in each thread.</li>
				<li>Nobody, including the people who run Tapri, can see who wrote what.</li>
				<li>Be kind. Someone reading may be having a hard week.</li>
			</ul>
		</section>
	</aside>
</div>

<style>
	.layout {
		display: grid;
		gap: 28px;
		padding-top: 18px;
	}
	.col {
		min-width: 0;
	}
	.crumb {
		font-size: 12.5px;
		color: var(--muted);
		margin-bottom: 12px;
	}
	.crumb a {
		color: var(--ink);
		font-weight: 600;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		color: var(--muted);
	}
	.who b {
		color: var(--ink);
	}
	.you {
		margin-left: 6px;
		font-size: 10.5px;
		font-weight: 800;
		text-transform: uppercase;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 1px 6px;
	}
	h1 {
		font-size: clamp(20px, 4vw, 24px);
		font-weight: 800;
		line-height: 1.25;
		letter-spacing: -0.02em;
		margin: 12px 0 10px;
		overflow-wrap: anywhere;
	}
	.body {
		font-size: 15.5px;
		line-height: 1.65;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.acts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		margin: 16px 0 14px;
	}
	.acts button {
		border-radius: 8px;
		font-size: 13px;
		font-weight: 700;
		padding: 8px 12px;
		background: transparent;
		transition: background-color 120ms, color 120ms;
	}
	.feel {
		border: 1.5px solid var(--count);
		color: var(--count);
		font-weight: 800 !important;
	}
	.feel .n {
		font-size: 14.5px;
		margin-left: 4px;
	}
	.feel.on {
		background: var(--count);
		color: var(--bg);
	}
	.sec {
		border: 1px solid var(--border);
	}
	.sec.on {
		border-color: var(--ink);
	}
	.ghost {
		border: 0;
		color: var(--muted);
	}
	.rhead {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 22px 0 0;
		padding-bottom: 9px;
		border-bottom: 1px solid var(--border);
		font-size: 13px;
	}
	.rhead h2 {
		font-size: 15px;
		font-weight: 800;
		margin: 0;
	}
	.compose {
		margin-top: 18px;
	}
	.side {
		display: none;
	}
	.box {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 15px;
		font-size: 13px;
		line-height: 1.55;
	}
	.box h2 {
		font-size: 14.5px;
		font-weight: 800;
		margin: 0 0 6px;
	}
	.box ul {
		margin: 0;
		padding-left: 18px;
	}
	.box li {
		margin-bottom: 4px;
	}
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: 1fr 290px;
		}
		.side {
			display: flex;
			flex-direction: column;
			gap: 14px;
			position: sticky;
			top: 76px;
			align-self: start;
		}
	}
</style>
