<script lang="ts">
	import { QUICK, categoryNote } from '$lib/shared/support';

	let { category, distress = false }: { category?: string; distress?: boolean } = $props();
	const note = $derived(category ? categoryNote(category) : undefined);
</script>

{#if distress}
	<div class="note">
		<b>You don't have to carry this alone.</b> If you're thinking about not being here, please talk to someone
		tonight: Talk to Angel <a href="tel:{QUICK.angel.tel}">{QUICK.angel.phone}</a>, any hour. In an emergency, IITB
		Hospital <a href="tel:{QUICK.hospital.tel}">{QUICK.hospital.phone}</a>.
		<a href="/help">All support options</a>
	</div>
{:else if note}
	<div class="note">
		{note.text}
		{#if note.counselling}
			Talk to Angel <a href="tel:{QUICK.angel.tel}">{QUICK.angel.phone}</a> (24×7), or walk in to SWC, NN Main
			Building 3rd floor, 10–6.
		{/if}
	</div>
{/if}

<style>
	.note {
		background: var(--well);
		color: var(--well-ink);
		border-radius: 10px;
		padding: 11px 13px;
		font-size: 13.5px;
		line-height: 1.55;
	}
	a {
		font-weight: 700;
		white-space: nowrap;
	}
</style>
