<script lang="ts">
	import { api } from '$lib/client/api';

	let key = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const r = await api('/api/session', { body: { accountSecret: key } });
		busy = false;
		if (r.ok) location.href = '/';
		else
			error =
				r.error === 'rate_limited'
					? 'Too many attempts. Wait a while and try again.'
					: r.error === 'network'
						? "Couldn't reach Tapri. Check your connection."
						: "That key doesn't match an account.";
	}
</script>

<svelte:head>
	<title>Sign in · tapri</title>
</svelte:head>

<div class="page">
	<h1>Sign in</h1>
	<p class="lede">Enter the recovery key you saved when you joined. Case and dashes don't matter.</p>
	<form onsubmit={submit}>
		<label class="label" for="key">Recovery key</label>
		<input
			id="key"
			class="field mono"
			bind:value={key}
			placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
			required
		/>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<button class="btn block" disabled={busy || key.replace(/[\s-]/g, '').length < 24}>
			{busy ? 'Signing in…' : 'Sign in'}
		</button>
	</form>
	<p class="alt muted">Lost your key? It can't be recovered, but you can <a href="/join">join again</a> next semester.</p>
</div>

<style>
	.page {
		max-width: 440px;
		margin: 0 auto;
		padding: 36px var(--gutter) 0;
	}
	h1 {
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	.lede {
		color: var(--muted);
		margin: 0 0 20px;
	}
	.field {
		letter-spacing: 0.04em;
		font-size: 16px;
	}
	.btn {
		margin-top: 14px;
	}
	.alt {
		font-size: 13px;
		margin-top: 18px;
	}
</style>
