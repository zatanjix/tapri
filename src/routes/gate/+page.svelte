<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>tapri</title>
</svelte:head>

<div class="page">
	<h1>Not open yet</h1>
	<p class="muted">Tapri is being tested. Enter the passphrase to continue.</p>
	<form method="POST">
		<label class="label" for="pp">Passphrase</label>
		<input id="pp" name="passphrase" type="password" class="field" autocomplete="off" required />
		{#if form?.wrong}<p class="error" role="alert">That's not it.</p>{/if}
		<button class="btn block">Continue</button>
	</form>
</div>

<style>
	.page {
		max-width: 400px;
		margin: 0 auto;
		padding: 56px var(--gutter) 0;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	p {
		margin: 0 0 18px;
	}
	.btn {
		margin-top: 14px;
	}
</style>
