<script lang="ts">
	import { QUICK } from '$lib/shared/support';
</script>

<aside class="box" aria-label="Support">
	<h2>Hey. How are you doing, really?</h2>
	<p>If things feel like too much, talk to someone. It's free and confidential.</p>
	<a class="line" href="tel:{QUICK.angel.tel}"><span>Talk to Angel<small>24×7 helpline</small></span><b>{QUICK.angel.phone}</b></a>
	<a class="line" href="tel:{QUICK.swc.tel}"><span>SWC walk-in<small>NN Main Bldg, 3rd floor · 10–6 daily</small></span><b>{QUICK.swc.phone}</b></a>
	<a class="em" href="tel:{QUICK.hospital.tel}"><b>Emergency:</b> IITB Hospital, 24×7 · <b>{QUICK.hospital.phone}</b></a>
	<a class="cta" href="/help">All support options</a>
</aside>

<style>
	.box {
		background: var(--well);
		color: var(--well-ink);
		border-radius: 12px;
		padding: 16px;
		font-size: 13px;
	}
	h2 {
		margin: 0 0 5px;
		font-size: 15px;
		font-weight: 800;
	}
	p {
		margin: 0 0 10px;
		line-height: 1.5;
	}
	.line {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		padding: 8px 0;
		border-top: 1px solid var(--well-line);
		text-decoration: none;
	}
	.line b {
		white-space: nowrap;
		font-size: 14px;
	}
	small {
		display: block;
		font-size: 11.5px;
		opacity: 0.85;
	}
	.em {
		display: block;
		background: var(--urgent);
		color: var(--urgent-ink);
		border-radius: 8px;
		padding: 9px 10px;
		margin-top: 8px;
		line-height: 1.45;
		text-decoration: none;
	}
	.em b {
		white-space: nowrap;
	}
	.cta {
		display: block;
		margin-top: 12px;
		background: var(--well-ink);
		color: var(--well);
		text-align: center;
		font-weight: 700;
		padding: 9px;
		border-radius: 8px;
		text-decoration: none;
	}
</style>
