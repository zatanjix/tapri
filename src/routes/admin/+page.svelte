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
		<section class="official">
			<h2 class="sec-h">Post as Tapri</h2>
			<p class="muted small">Appears as <b>Tapri</b> with the ✓ Official badge. Not linked to your own account.</p>
			<form method="POST" action="?/officialPost">
				<select name="category" class="field" required>
					{#each data.categories as c (c.slug)}<option value={c.slug} selected={c.slug === 'feedback'}>{c.name}</option>{/each}
				</select>
				<input name="title" class="field" placeholder="Title" minlength="5" maxlength="150" required />
				<textarea name="body" class="field" rows="4" placeholder="What do you want to say?" maxlength="10000" required></textarea>
				{#if form?.officialError}<p class="error">Couldn't post: {form.officialError}</p>{/if}
				{#if form?.posted}<p class="ok">Posted. <a href="/p/{form.posted}">View it</a></p>{/if}
				<button class="btn">Post as Tapri</button>
			</form>

			<h2 class="sec-h">Reply as Tapri</h2>
			<form method="POST" action="?/officialReply">
				<input name="thread" class="field" placeholder="Thread link (use Copy link on the thread)" required />
				<textarea name="body" class="field" rows="3" placeholder="Reply" maxlength="5000" required></textarea>
				{#if form?.replyError}<p class="error">Couldn't reply: {form.replyError}</p>{/if}
				{#if form?.replied}<p class="ok">Replied. <a href="/p/{form.replied}">View thread</a></p>{/if}
				<button class="btn">Reply as Tapri</button>
			</form>
		</section>

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
					<a class="view" href="/p/{r.postSlug}" target="_blank" rel="noreferrer">Open thread</a>
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
	.official {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 15px 16px;
		margin-bottom: 26px;
	}
	.official form {
		display: grid;
		gap: 8px;
		margin-bottom: 18px;
	}
	.official form:last-child {
		margin-bottom: 0;
	}
	.official .btn {
		justify-self: start;
		padding: 8px 14px;
		font-size: 13px;
	}
	.sec-h {
		font-size: 15px;
		font-weight: 800;
		margin: 0 0 4px;
	}
	.small {
		font-size: 12.5px;
		margin: 0 0 10px;
	}
	.ok {
		font-size: 13px;
		font-weight: 600;
		margin: 0;
	}
	textarea.field {
		resize: vertical;
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
