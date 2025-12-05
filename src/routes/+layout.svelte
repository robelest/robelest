<script lang="ts">
	import '../app.css';
	import { setupConvex } from 'convex-svelte';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';

	setupConvex(PUBLIC_CONVEX_URL);

	let { children } = $props();
</script>

<!-- Skip to main content link for keyboard navigation -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-tn-red focus:text-tn-base focus:rounded"
>
	Skip to main content
</a>

<div class="h-[100dvh] bg-tn-base text-tn-text overflow-hidden relative">
	<div class="relative z-10 h-full flex flex-col">
		{@render children()}
	</div>
</div>
