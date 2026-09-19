<script lang="ts">
	import { DISCLAIMER, LAST_CHECKED, TIERS } from '$lib/shared/support';
</script>

<svelte:head>
	<title>Get help · tapri</title>
</svelte:head>

<div class="page">
	<h1>You don't have to handle this alone</h1>
	<p class="lede">Every option below is confidential. On a phone, tap a number to call.</p>

	{#each TIERS as tier (tier.id)}
		<section class="tier {tier.id}">
			<h2>{tier.title}</h2>
			{#each tier.items as item (item.name)}
				<div class="item">
					<div>
						<div class="name">{item.name}</div>
						{#if item.detail || item.phone}
							<div class="detail">
								{item.detail ?? ''}
								{#if item.phone}<span class="phone">{item.phone}</span>{/if}
							</div>
						{/if}
					</div>
					{#if item.tel}
						<a class="act" href="tel:{item.tel}">Call</a>
					{:else if item.url}
						<a class="act" href={item.url} target="_blank" rel="noreferrer noopener">{item.cta ?? 'Open'}</a>
					{/if}
				</div>
			{/each}
		</section>
	{/each}

	<p class="foot">{DISCLAIMER} Last checked {LAST_CHECKED}.</p>
</div>

<style>
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding: 24px var(--gutter) 0;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 6px;
	}
	.lede {
		color: var(--muted);
		margin: 0 0 18px;
	}
	.tier {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 13px 14px;
		margin-bottom: 12px;
	}
	.tier.urgent {
		background: var(--urgent);
		color: var(--urgent-ink);
		border-color: transparent;
	}
	.tier.now {
		background: var(--well);
		color: var(--well-ink);
		border-color: transparent;
	}
	h2 {
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		margin: 0 0 4px;
	}
	.item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 9px 0;
	}
	.item + .item {
		border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
	}
	.name {
		font-weight: 700;
		font-size: 14.5px;
	}
	.detail {
		font-size: 12.5px;
		opacity: 0.88;
		margin-top: 2px;
	}
	.phone {
		font-weight: 700;
		white-space: nowrap;
	}
	.act {
		flex: none;
		background: currentColor;
		border-radius: 8px;
		padding: 7px 12px;
		font-size: 13px;
		font-weight: 800;
		text-decoration: none;
	}
	.tier .act {
		background: var(--btn);
		color: var(--btn-ink);
	}
	.tier.urgent .act {
		background: var(--urgent-ink);
		color: var(--urgent);
	}
	.tier.now .act {
		background: var(--well-ink);
		color: var(--well);
	}
	.foot {
		font-size: 12px;
		color: var(--muted);
		line-height: 1.5;
		margin-top: 16px;
	}
</style>
