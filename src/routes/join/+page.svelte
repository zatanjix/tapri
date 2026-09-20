<script lang="ts">
	import { onMount } from 'svelte';
	import { api, fromB64u, toB64u } from '$lib/client/api';
	import { clearTicket, isReady, loadTicket, randomWaitMs, saveTicket, type ReadyTicket } from '$lib/client/signup-store';
	import { createToken, finalizeToken, importIssuerKey, type PendingToken } from '$lib/client/tokens';
	import { generateAccountSecret } from '$lib/shared/secret';

	type Step = 'how' | 'email' | 'code' | 'key' | 'wait' | 'done';
	const ORDER: Step[] = ['how', 'email', 'code', 'key', 'wait', 'done'];

	let step = $state<Step>('how');
	let email = $state('');
	let code = $state('');
	let error = $state('');
	let busy = $state(false);
	let resendIn = $state(0);
	let saved = $state(false);
	let copied = $state(false);
	let now = $state(Date.now());
	let ticket = $state<ReadyTicket | null>(null);

	let pendingId = '';
	let pending: PendingToken | null = null;
	let pub: CryptoKey | null = null;

	const fullEmail = $derived(email.includes('@') ? email.trim() : `${email.trim()}@iitb.ac.in`);
	const stepIndex = $derived(ORDER.indexOf(step));
	const remaining = $derived(ticket ? Math.max(0, Math.ceil((ticket.redeemAt - now) / 1000)) : 0);
	/** The wait is at most 45 seconds, so the bar fills against that. */
	const progress = $derived(ticket ? Math.min(1, Math.max(0, 1 - (ticket.redeemAt - now) / 45_000)) : 0);

	onMount(() => {
		const existing = loadTicket();
		if (existing) {
			ticket = existing;
			step = existing.keySaved ? 'wait' : 'key';
		}
		const timer = setInterval(() => {
			now = Date.now();
			if (resendIn > 0) resendIn -= 1;
			if (step === 'wait' && ticket && isReady(ticket, now) && !busy) redeem();
		}, 1000);
		return () => clearInterval(timer);
	});

	const MESSAGES: Record<string, string> = {
		invalid_email: "That doesn't look like an IIT Bombay email address.",
		already_claimed: 'This email has already been used to join this semester.',
		rate_limited: 'Too many attempts from this network. Try again in a while.',
		wrong_code: "That code isn't right. Check the email and try again.",
		expired: 'That code has expired. Request a new one.',
		too_many_attempts: 'Too many wrong codes. Request a new one.',
		network: "Couldn't reach Tapri. Check your connection and try again.",
		mail_failed: "We couldn't send the code just now. Please try again in a few minutes.",
		unavailable: 'Tapri is having trouble right now. Please try again in a few minutes.'
	};
	const message = (e: string) => MESSAGES[e] ?? 'Something went wrong. Please try again.';

	async function sendCode(e?: SubmitEvent) {
		e?.preventDefault();
		busy = true;
		error = '';
		const key = await api<{ keyId: string; publicKey: string }>('/api/issuer/key');
		if (!key.ok) return fail(key.error);
		pub = await importIssuerKey(fromB64u(key.data.publicKey));
		pending = await createToken(pub, key.data.keyId);
		const r = await api<{ pendingId: string }>('/api/verify/start', {
			body: { email: fullEmail, blindedMsg: toB64u(pending.blindedMsg), keyId: key.data.keyId }
		});
		if (!r.ok) return fail(r.error);
		pendingId = r.data.pendingId;
		code = '';
		resendIn = 45;
		busy = false;
		step = 'code';
	}

	async function verify(e: SubmitEvent) {
		e.preventDefault();
		if (!pending || !pub) return;
		busy = true;
		error = '';
		const r = await api<{ blindSig: string }>('/api/verify/otp', { body: { pendingId, code } });
		if (!r.ok) {
			if (r.error === 'expired' || r.error === 'too_many_attempts') step = 'email';
			return fail(r.error);
		}
		const signature = await finalizeToken(pub, pending, fromB64u(r.data.blindSig));
		ticket = {
			keyId: pending.keyId,
			token: toB64u(pending.preparedMsg),
			signature: toB64u(signature),
			secret: generateAccountSecret(),
			redeemAt: Date.now() + randomWaitMs(),
			keySaved: false
		};
		saveTicket(ticket);
		pending = null;
		busy = false;
		step = 'key';
	}

	function fail(e: string) {
		error = message(e);
		busy = false;
	}

	async function copyKey() {
		if (!ticket) return;
		await navigator.clipboard.writeText(ticket.secret);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function downloadKey() {
		if (!ticket) return;
		const text = `Your Tapri recovery key:\n\n${ticket.secret}\n\nThis key is your account. Keep it private. Nobody can recover it for you.\n`;
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
		a.download = 'tapri-recovery-key.txt';
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function confirmSaved() {
		if (!ticket) return;
		ticket = { ...ticket, keySaved: true };
		saveTicket(ticket);
		step = 'wait';
	}

	async function redeem() {
		if (!ticket) return;
		busy = true;
		const r = await api('/api/account', {
			body: { keyId: ticket.keyId, token: ticket.token, signature: ticket.signature, accountSecret: ticket.secret }
		});
		busy = false;
		if (r.ok) {
			clearTicket();
			step = 'done';
		} else if (r.error !== 'network') {
			clearTicket();
			error =
				r.error === 'wrong_key'
					? 'A new semester has started since you verified. Please join again.'
					: "This sign-up couldn't be completed. Please start again.";
			ticket = null;
			step = 'how';
		}
	}
</script>

<svelte:head>
	<title>Join · tapri</title>
</svelte:head>

<div class="page">
	<div class="dots" aria-hidden="true">
		{#each ORDER.slice(0, 5) as s, i (s)}<i class:on={i <= stepIndex}></i>{/each}
	</div>

	{#if step === 'how'}
		<h1>Anonymous, and here's exactly how</h1>
		<p class="lede">No sign-up form, no username, no password. Three steps:</p>
		<ol class="how">
			<li><b>Prove you're from IIT Bombay</b><span>With a one-time code sent to your IITB email.</span></li>
			<li><b>Get a sealed ticket</b><span>Tapri stamps it without seeing inside, so it can never tell whose it is.</span></li>
			<li><b>Use it to make your account</b><span>Your email and your account are never connected, not even by Tapri.</span></li>
		</ol>
		<div class="see">
			<div class="y"><b>What Tapri can see</b>That an IITB email joined this semester.</div>
			<div class="n"><b>What Tapri can't see</b>Which account is yours, or what you post.</div>
		</div>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<button class="btn block" onclick={() => ((error = ''), (step = 'email'))}>Get started</button>
		<p class="alt muted">Already joined? <a href="/signin">Sign in with your recovery key</a></p>
	{:else if step === 'email'}
		<h1>Your IITB email</h1>
		<p class="lede">We'll send a 6-digit code to prove the address is yours.</p>
		<form onsubmit={sendCode}>
			<label class="label" for="email">Email or LDAP ID</label>
			<div class="emailrow">
				<input id="email" class="field" bind:value={email} autocomplete="email" autocapitalize="none" spellcheck="false" required />
				{#if !email.includes('@')}<span class="dom">@iitb.ac.in</span>{/if}
			</div>
			<div class="info"><b>Used once, then forgotten.</b> Your email is deleted as soon as the code is checked. Only a scrambled marker is kept, so each email gets one account per semester.</div>
			<p class="small muted">Anyone with an IITB email can join, including faculty and staff. Write with that in mind.</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<button class="btn block" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send code'}</button>
		</form>
	{:else if step === 'code'}
		<h1>Check your inbox</h1>
		<p class="lede">Code sent to <b>{fullEmail}</b>. It expires in 10 minutes.</p>
		<form onsubmit={verify}>
			<label class="label" for="code">6-digit code</label>
			<input
				id="code"
				class="field mono code"
				bind:value={code}
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				pattern={"[0-9]{6}"}
				required
			/>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<button class="btn block" disabled={busy || !/^\d{6}$/.test(code)}>{busy ? 'Checking…' : 'Verify'}</button>
		</form>
		<p class="alt muted">
			Not there? Check Spam.
			{#if resendIn > 0}You can request a new code in {resendIn}s.{:else}<button class="link" onclick={() => sendCode()}>Send a new code</button>{/if}
		</p>
	{:else if step === 'key' && ticket}
		<h1>This key is your account</h1>
		<p class="lede">No email, no password. It's the only way back in on a new phone or browser.</p>
		<div class="key mono">{ticket.secret.slice(0, 14)}<br />{ticket.secret.slice(15)}</div>
		<div class="krow">
			<button class="btn ghost" onclick={copyKey}>{copied ? 'Copied' : 'Copy'}</button>
			<button class="btn ghost" onclick={downloadKey}>Save as file</button>
		</div>
		<div class="warn">If you lose it, your account is gone. Nobody can recover it for you, because nobody knows it's yours. A password manager or notes app is a good place for it.</div>
		<label class="check"><input type="checkbox" bind:checked={saved} /> I've saved my key somewhere safe</label>
		<button class="btn block" disabled={!saved} onclick={confirmSaved}>Continue</button>
	{:else if step === 'wait' && ticket}
		<h1>Setting up your account</h1>
		<p class="lede">
			{#if remaining > 0}Ready in about {remaining} seconds.{:else}Almost there…{/if}
			You can close this tab; it'll finish next time you open Tapri here.
		</p>
		<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}>
			<i style:width="{Math.max(4, progress * 100)}%"></i>
		</div>
		<div class="why"><b>Why the wait?</b> If your account appeared the second your email was checked, the timing alone could link the two. A random pause breaks that link.</div>
		<h2 class="rules-h">Meanwhile, the house rules</h2>
		<ol class="rules">
			<li>Be kind. Someone here may be having the worst week of their life.</li>
			<li>No hate, no spam, no harassment.</li>
			<li>Don't share details that could identify anyone, including you.</li>
		</ol>
	{:else if step === 'done'}
		<h1>You're in.</h1>
		<p class="lede">Welcome to Tapri. Three things to remember:</p>
		<div class="prom"><b>You have a new name in every thread.</b><span>Nobody can follow you from one conversation to another.</span></div>
		<div class="prom"><b>Your email is already gone.</b><span>Your account and your email were never connected.</span></div>
		<div class="prom"><b>Help is one tap away.</b><span>"Get help" is at the top of every page, day or night.</span></div>
		<a class="btn block" href="/" data-sveltekit-reload>Go to Tapri</a>
		<p class="alt muted">Tip: add Tapri to your home screen from your browser's share or menu button.</p>
	{/if}
</div>

<style>
	.page {
		max-width: 460px;
		margin: 0 auto;
		padding: 22px var(--gutter) 0;
	}
	.dots {
		display: flex;
		gap: 5px;
		margin-bottom: 22px;
	}
	.dots i {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--border);
	}
	.dots i.on {
		background: var(--ink);
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 8px;
	}
	.lede {
		color: var(--muted);
		margin: 0 0 18px;
	}
	.how {
		list-style: none;
		counter-reset: s;
		padding: 0;
		margin: 0 0 16px;
	}
	.how li {
		counter-increment: s;
		display: grid;
		grid-template-columns: 30px 1fr;
		column-gap: 11px;
		margin-bottom: 12px;
	}
	.how li::before {
		content: counter(s);
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
	.how span {
		font-size: 13px;
		color: var(--muted);
	}
	.see {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		font-size: 12.5px;
		margin-bottom: 18px;
	}
	.see div {
		border-radius: 10px;
		padding: 10px;
		line-height: 1.45;
	}
	.see b {
		display: block;
		margin-bottom: 3px;
	}
	.see .y {
		background: var(--surface);
	}
	.see .n {
		background: var(--well);
		color: var(--well-ink);
	}
	.emailrow {
		position: relative;
	}
	.dom {
		position: absolute;
		right: 14px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
	}
	.info {
		background: var(--surface);
		border-radius: 10px;
		padding: 11px 12px;
		font-size: 12.5px;
		margin: 12px 0 10px;
		line-height: 1.5;
	}
	.small {
		font-size: 12.5px;
		margin: 0 0 14px;
	}
	.code {
		font-size: 26px;
		letter-spacing: 0.4em;
		text-align: center;
	}
	.btn.block {
		margin-top: 14px;
	}
	.alt {
		font-size: 13px;
		margin-top: 16px;
	}
	.link {
		background: none;
		border: 0;
		padding: 0;
		font-weight: 700;
		color: var(--ink);
		text-decoration: underline;
	}
	.key {
		background: #1a1a1a;
		color: #f2c14e;
		border-radius: 12px;
		padding: 16px 14px;
		font-weight: 600;
		font-size: 19px;
		line-height: 1.7;
		text-align: center;
		letter-spacing: 0.05em;
		margin-bottom: 10px;
		user-select: all;
	}
	.krow {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-bottom: 12px;
	}
	.warn {
		background: var(--warn);
		color: var(--warn-ink);
		border-radius: 10px;
		padding: 11px 12px;
		font-size: 12.5px;
		line-height: 1.5;
		margin-bottom: 14px;
	}
	.check {
		display: flex;
		gap: 10px;
		align-items: center;
		font-size: 14px;
		font-weight: 600;
	}
	.check input {
		width: 20px;
		height: 20px;
		accent-color: var(--ink);
	}
	.prog {
		height: 6px;
		background: var(--surface);
		border-radius: 3px;
		overflow: hidden;
	}
	.prog i {
		display: block;
		height: 100%;
		background: var(--ink);
		border-radius: 3px;
		transition: width 1s linear;
	}
	.why {
		background: var(--well);
		color: var(--well-ink);
		border-radius: 10px;
		padding: 11px 12px;
		font-size: 12.5px;
		line-height: 1.5;
		margin: 16px 0;
	}
	.rules-h {
		font-size: 14px;
		font-weight: 800;
		margin: 0 0 6px;
	}
	.rules {
		font-size: 13.5px;
		padding-left: 18px;
		margin: 0;
	}
	.rules li {
		margin-bottom: 6px;
	}
	.prom {
		border-top: 1px solid var(--border);
		padding: 11px 0;
		font-size: 14px;
	}
	.prom b {
		display: block;
	}
	.prom span {
		color: var(--muted);
		font-size: 13px;
	}
</style>
