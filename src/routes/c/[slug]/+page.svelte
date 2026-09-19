<script lang="ts">
	import Feed from '$lib/components/Feed.svelte';
	import HelpNote from '$lib/components/HelpNote.svelte';
	import SupportBox from '$lib/components/SupportBox.svelte';
	import SupportStrip from '$lib/components/SupportStrip.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.category.name} · tapri</title>
</svelte:head>

<SupportStrip />

<div class="wrap layout">
	<div class="col">
		<header>
			<h1>{data.category.name}</h1>
			<p class="muted">{data.category.description}</p>
			<HelpNote category={data.category.slug} />
		</header>
		<Feed items={data.items} tab={data.tab} sort={data.sort} page={data.page} tabs={data.tabs} sorts={data.sorts} />
	</div>
	<aside class="side"><SupportBox /></aside>
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
	header {
		margin-bottom: 16px;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 2px;
	}
	header p {
		margin: 0 0 12px;
	}
	.side {
		display: none;
	}
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: 1fr 290px;
		}
		.side {
			display: block;
			position: sticky;
			top: 76px;
			align-self: start;
		}
	}
</style>
