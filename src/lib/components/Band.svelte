<script lang="ts">
	let { signedIn }: { signedIn: boolean } = $props();
</script>

<header class="band">
	<div class="inner">
		<a class="wm" href={signedIn ? '/' : '/welcome'}>tapri</a>
		<div class="right">
			<a class="help" href="/help">Get help</a>
			{#if signedIn}
				<a class="btn" href="/new"><span class="long">Create a post</span><span class="short">Post</span></a>
			{:else}
				<a class="btn" href="/join">Join</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.band {
		background: var(--band);
		color: var(--band-ink);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.inner {
		max-width: var(--max);
		margin: 0 auto;
		padding: 12px var(--gutter);
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.wm {
		font-weight: 800;
		font-size: 20px;
		letter-spacing: -0.02em;
		text-decoration: none;
	}
	.right {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.help {
		font-size: 13.5px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}
	.help:hover {
		text-decoration: underline;
	}
	.btn {
		background: #1a1a1a;
		color: #fff;
		padding: 8px 13px;
		font-size: 13px;
		white-space: nowrap;
	}
	.long {
		display: none;
	}
	@media (min-width: 560px) {
		.long {
			display: inline;
		}
		.short {
			display: none;
		}
	}
</style>
