<script lang="ts">
	import { QUICK } from '$lib/shared/support';
</script>

<svelte:head>
	<title>House rules · tapri</title>
</svelte:head>

<div class="page">
	<h1>House rules</h1>
	<p class="lede">Short, and meant in good faith. Tapri works because people are decent to each other here.</p>

	<ol class="rules">
		<li>
			<b>Be kind.</b>
			<span>Someone reading may be having the worst week of their life. Disagree with what people say, not with who they are.</span>
		</li>
		<li>
			<b>No hate, no spam, no harassment.</b>
			<span>Nothing targeting someone for who they are: caste, religion, gender, sexuality, region, disability. No pile-ons, no advertising.</span>
		</li>
		<li>
			<b>Don't share details that could identify anyone, including you.</b>
			<span>Room numbers, timetables, "the girl who sat in the third row": these turn an anonymous post into a guessing game about a real person.</span>
		</li>
		<li>
			<b>Say what happened, not who to blame.</b>
			<span>Describing a problem gets it fixed. Accusing a named person can't be checked here, and makes it about them instead of the problem.</span>
		</li>
		<li>
			<b>Don't use Tapri to put someone in danger.</b>
			<span>No threats, and nothing encouraging anyone to hurt themselves or anyone else.</span>
		</li>
	</ol>

	<h2>What happens if a post breaks them</h2>
	<p>
		It may be removed. When that happens the thread keeps a note in its place, so the conversation still
		makes sense and everyone can see which rule was involved.
	</p>

	<h2>If someone here is struggling</h2>
	<p>
		Reply kindly if you can, and point them to <a href="/help">Get help</a>. If someone sounds like they're in
		danger right now, the 24×7 helpline is <a href="tel:{QUICK.angel.tel}">{QUICK.angel.phone}</a> and IITB Hospital is
		<a href="tel:{QUICK.hospital.tel}">{QUICK.hospital.phone}</a>. You don't have to handle it alone either.
	</p>

	<h2>Anyone claiming to be the developer</h2>
	<p>
		Announcements and replies from the people who run Tapri always appear as <b>Tapri</b> with an
		<b>✓ Official</b> badge. No one else can get that badge. A post from an animal name saying it's
		the developer isn't.
	</p>

	<h2>Ideas and complaints about Tapri</h2>
	<p>
		Post them in <a href="/c/feedback">Feedback</a>. It's read, and other people can add to it.
	</p>
</div>

<style>
	.page {
		max-width: 620px;
		margin: 0 auto;
		padding: 28px var(--gutter) 0;
	}
	h1 {
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	.lede {
		color: var(--muted);
		margin: 0 0 22px;
	}
	.rules {
		list-style: none;
		counter-reset: r;
		padding: 0;
		margin: 0 0 8px;
	}
	.rules li {
		counter-increment: r;
		display: grid;
		grid-template-columns: 30px 1fr;
		column-gap: 12px;
		padding: 14px 0;
		border-top: 1px solid var(--border);
	}
	.rules li::before {
		content: counter(r);
		grid-row: span 2;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--band);
		color: var(--band-ink);
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 13px;
	}
	.rules b {
		font-size: 15.5px;
	}
	.rules span {
		font-size: 14px;
		color: var(--muted);
		line-height: 1.55;
	}
	h2 {
		font-size: 16px;
		font-weight: 800;
		margin: 24px 0 4px;
	}
	.page > p {
		margin: 0;
		line-height: 1.6;
	}
</style>
