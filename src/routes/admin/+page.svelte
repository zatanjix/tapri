<script lang="ts">
	import { timeAgo } from '$lib/shared/time';

	let { data, form } = $props();

	const REASONS: Record<string, string> = {
		hate: 'Hate or harassment',
		identifying: 'Identifies someone',
		danger: 'Someone may be in danger',
		spam: 'Spam',
		other: 'Something else'
	};
</script>

<svelte:head>
	<title>Reports · tapri</title>
</svelte:head>

<div class="page">
	{#if !data.unlocked}
		<h1>Reports</h1>
		<form method="POST" action="?/unlock">
			<label class="label" for="pp">Passphrase</label>
			<input id="pp" name="passphrase" type="password" class="field" autocomplete="off" required />
			{#if form?.wrong}<p class="error" role="alert">That's not it.</p>{/if}
			<button class="btn block">Continue</button>
		</form>
	{:else}
		<h1>Reports <span class="count">{data.reports.length} open</span></h1>
		{#if data.reports.length === 0}
			<p class="muted empty">Nothing reported. Check back later.</p>
		{/if}

		{#each data.reports as r (r.targetType + r.targetId)}
			<article class="report" class:danger={r.reason === 'danger'}>
				<div class="meta">
					<b>{REASONS[r.reason] ?? r.reason}</b>
					{#if r.times > 1}<span class="times">{r.times} reports</span>{/if}
					· {r.targetType} #{r.targetId} · {timeAgo(r.reportedOn)}
					{#if r.status !== 'published'}<span class="gone">already {r.status}</span>{/if}
				</div>
				{#if r.note}<p class="note">“{r.note}”</p>{/if}
				{#if r.title}<h2>{r.title}</h2>{/if}
				<p class="body">{r.body.slice(0, 600)}</p>
				<div class="actions">
					<a class="view" href="/p/{r.postId}" target="_blank" rel="noreferrer">Open thread</a>
					<form method="POST" action="?/dismiss">
						<input type="hidden" name="targetType" value={r.targetType} />
						<input type="hidden" name="targetId" value={r.targetId} />
						<button class="btn ghost">Leave it</button>
					</form>
					<form method="POST" action="?/remove">
						<input type="hidden" name="targetType" value={r.targetType} />
						<input type="hidden" name="targetId" value={r.targetId} />
						<button class="btn danger-btn">Remove</button>
					</form>
				</div>
			</article>
		{/each}
	{/if}
</div>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 26px var(--gutter) 0;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 16px;
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.count {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	.empty {
		padding: 28px 0;
	}
	.report {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 15px;
		margin-bottom: 12px;
	}
	.report.danger {
		border-color: var(--count);
	}
	.meta {
		font-size: 12.5px;
		color: var(--muted);
	}
	.meta b {
		color: var(--ink);
	}
	.times {
		background: var(--count);
		color: var(--bg);
		border-radius: 4px;
		padding: 1px 6px;
		font-weight: 700;
		font-size: 11px;
	}
	.gone {
		font-style: italic;
	}
	.note {
		margin: 8px 0 0;
		font-size: 13.5px;
	}
	h2 {
		font-size: 16px;
		font-weight: 800;
		margin: 8px 0 4px;
	}
	.body {
		margin: 0;
		font-size: 14px;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: var(--ink);
		opacity: 0.86;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
	}
	.view {
		font-size: 13px;
		font-weight: 700;
		margin-right: auto;
	}
	.actions .btn {
		padding: 7px 13px;
		font-size: 13px;
	}
	.danger-btn {
		background: var(--count);
		color: var(--bg);
	}
</style>
