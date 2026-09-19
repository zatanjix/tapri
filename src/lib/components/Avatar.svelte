<script lang="ts">
	let { handle, size = 32 }: { handle: string; size?: number } = $props();

	const initials = $derived(
		handle
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
	);
	const tint = $derived([...handle].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 6);
</script>

<span class="av t{tint}" style:width="{size}px" style:height="{size}px" aria-hidden="true">{initials}</span>

<style>
	.av {
		flex: none;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 12px;
	}
	.t0 { background: #e3efe9; color: #2f6b50; }
	.t1 { background: #fbeadb; color: #9a4f15; }
	.t2 { background: #e6ecfa; color: #2f55ad; }
	.t3 { background: #f1e6f5; color: #74408a; }
	.t4 { background: #f7e7e7; color: #9b3434; }
	.t5 { background: #e9eef0; color: #3e5a66; }
	@media (prefers-color-scheme: dark) {
		.t0 { background: #20352c; color: #9fd3b9; }
		.t1 { background: #3a2a1c; color: #f0b98a; }
		.t2 { background: #1f2940; color: #a9bdf0; }
		.t3 { background: #33223b; color: #d3aee3; }
		.t4 { background: #3b2020; color: #f0a8a8; }
		.t5 { background: #22303a; color: #a9c3cf; }
	}
</style>
