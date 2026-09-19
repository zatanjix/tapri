<script lang="ts">
	import Feed from '$lib/components/Feed.svelte';
	import SupportBox from '$lib/components/SupportBox.svelte';
	import SupportStrip from '$lib/components/SupportStrip.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>tapri</title>
</svelte:head>

<SupportStrip />

<div class="wrap layout">
	<div class="col">
		<Feed items={data.items} tab={data.tab} sort={data.sort} page={data.page} tabs={data.tabs} sorts={data.sorts} />
	</div>
	<aside class="side">
		<SupportBox />
		{#if data.mostAffected.length}
			<section class="box">
				<h2>Most affected this week</h2>
				{#each data.mostAffected as item (item.id)}
					<a class="rank" href="/p/{item.id}"><b>{item.metoo}</b><span>{item.title}</span></a>
				{/each}
			</section>
		{/if}
	</aside>
</div>

<style>
	.layout {
		display: grid;
		gap: 28px;
		padding-top: 18px;
	}
	.col {
		min-width: 0;
	}
	.side {
		display: none;
	}
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: 1fr 290px;
		}
		.side {
			display: flex;
			flex-direction: column;
			gap: 14px;
			position: sticky;
			top: 76px;
			align-self: start;
		}
	}
	.box {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 15px;
	}
	h2 {
		font-size: 15px;
		font-weight: 800;
		margin: 0 0 6px;
	}
	.rank {
		display: grid;
		grid-template-columns: 42px 1fr;
		gap: 8px;
		font-size: 13.5px;
		padding: 8px 0;
		border-top: 1px solid var(--border);
		line-height: 1.35;
		text-decoration: none;
	}
	.rank:hover span {
		text-decoration: underline;
	}
	.rank b {
		font-size: 15px;
		color: var(--count);
	}
</style>
