<script lang="ts">
	import { QUICK } from '$lib/shared/support';
</script>

<div class="strip">
	<b>Hard night?</b> Talk to Angel <a href="tel:{QUICK.angel.tel}">{QUICK.angel.phone}</a>, any hour ·
	<a href="/help">more help</a>
</div>

<style>
	.strip {
		background: var(--well);
		color: var(--well-ink);
		font-size: 12.5px;
		padding: 9px var(--gutter);
		line-height: 1.45;
	}
	a {
		font-weight: 700;
	}
	@media (min-width: 960px) {
		.strip {
			display: none;
		}
	}
</style>
