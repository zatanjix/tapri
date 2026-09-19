<svelte:head>
	<title>tapri</title>
</svelte:head>

<section class="hero">
	<h1>Say it here.<br />Nobody knows it's you.</h1>
	<p class="lede">
		An anonymous forum for insti junta. Raise what's wrong, ask what you can't ask out loud, and see how many
		others feel the same.
	</p>
	<div class="ctas">
		<a class="btn" href="/join">Join with your IITB email</a>
		<a class="btn ghost" href="/signin">I have a recovery key</a>
	</div>
</section>

<section class="promises">
	<div>
		<h2>Only the IIT Bombay community</h2>
		<p>Every account is backed by a verified <span class="mono">@iitb.ac.in</span> address.</p>
	</div>
	<div>
		<h2>Your email never touches your account</h2>
		<p>A sealed-ticket system means nobody can link a post to a person, including the people who run Tapri.</p>
	</div>
	<div>
		<h2>A new name in every thread</h2>
		<p>No profiles, no usernames, no history following you around.</p>
	</div>
</section>

<style>
	.hero {
		max-width: 640px;
		margin: 0 auto;
		padding: 44px var(--gutter) 28px;
	}
	h1 {
		font-size: clamp(30px, 7vw, 44px);
		line-height: 1.08;
		letter-spacing: -0.03em;
		font-weight: 800;
		margin: 0 0 14px;
	}
	.lede {
		font-size: 16.5px;
		color: var(--muted);
		margin: 0 0 24px;
		max-width: 52ch;
	}
	.ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.ctas .btn {
		padding: 12px 18px;
	}
	.promises {
		max-width: 640px;
		margin: 0 auto;
		padding: 0 var(--gutter);
		display: grid;
		gap: 0;
	}
	.promises div {
		border-top: 1px solid var(--border);
		padding: 16px 0;
	}
	h2 {
		font-size: 15.5px;
		font-weight: 800;
		margin: 0 0 3px;
	}
	.promises p {
		margin: 0;
		color: var(--muted);
		font-size: 14px;
	}
</style>
