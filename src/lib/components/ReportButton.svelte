<script lang="ts">
	import { api } from '$lib/client/api';
	import { QUICK } from '$lib/shared/support';

	let { targetType, targetId }: { targetType: 'post' | 'reply'; targetId: number } = $props();

	const REASONS = [
		{ id: 'hate', label: 'Hate, harassment or a personal attack' },
		{ id: 'identifying', label: 'Identifies someone, or names a person' },
		{ id: 'danger', label: 'Someone may be in danger' },
		{ id: 'spam', label: 'Spam or advertising' },
		{ id: 'other', label: 'Something else' }
	];

	let open = $state(false);
	let reason = $state('');
	let note = $state('');
	let busy = $state(false);
	let done = $state(false);
	let error = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const r = await api('/api/report', { body: { targetType, targetId, reason, note } });
		busy = false;
		if (r.ok || r.error === 'already_reported') done = true;
		else
			error =
				r.error === 'rate_limited'
					? "You've reported a lot recently. Try again later."
					: "Couldn't send that report. Please try again.";
	}
</script>

{#if done}
	<span class="thanks">Reported. Thank you.</span>
{:else}
	<button class="link" onclick={() => (open = !open)} aria-expanded={open}>Report</button>
{/if}

{#if open && !done}
	<form class="panel" onsubmit={submit}>
		<p class="lede">What's wrong with this {targetType}? Reports are anonymous, like everything else here.</p>
		{#each REASONS as r (r.id)}
			<label class="row"><input type="radio" name="reason-{targetType}-{targetId}" value={r.id} bind:group={reason} />{r.label}</label>
		{/each}

		{#if reason === 'danger'}
			<div class="urgent">
				If someone is in immediate danger, please also call: IITB Hospital
				<a href="tel:{QUICK.hospital.tel}">{QUICK.hospital.phone}</a> or Talk to Angel
				<a href="tel:{QUICK.angel.tel}">{QUICK.angel.phone}</a>. Reporting alone may be slower than a phone call.
			</div>
		{/if}

		<label class="sr-only" for="note-{targetType}-{targetId}">Anything to add</label>
		<input id="note-{targetType}-{targetId}" class="field" bind:value={note} maxlength="300" placeholder="Anything to add? (optional)" />
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<div class="actions">
			<button type="button" class="link" onclick={() => (open = false)}>Cancel</button>
			<button class="btn" disabled={busy || !reason}>{busy ? 'Sending…' : 'Send report'}</button>
		</div>
	</form>
{/if}

<style>
	.link {
		background: none;
		border: 0;
		padding: 2px 0;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--muted);
	}
	.link:hover {
		color: var(--ink);
	}
	.thanks {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--muted);
	}
	.panel {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 13px 14px;
		margin: 10px 0;
		background: var(--bg);
	}
	.lede {
		margin: 0 0 8px;
		font-size: 13px;
		color: var(--muted);
	}
	.row {
		display: flex;
		gap: 9px;
		align-items: center;
		font-size: 13.5px;
		padding: 4px 0;
		cursor: pointer;
	}
	.row input {
		accent-color: var(--ink);
	}
	.urgent {
		background: var(--urgent);
		color: var(--urgent-ink);
		border-radius: 8px;
		padding: 9px 10px;
		font-size: 12.5px;
		line-height: 1.5;
		margin: 8px 0;
	}
	.field {
		margin-top: 8px;
		font-size: 13.5px;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 14px;
		margin-top: 10px;
	}
	.actions .btn {
		padding: 7px 13px;
		font-size: 13px;
	}
</style>
