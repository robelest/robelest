<script lang="ts">
	interface Props {
		/** Optional back link to show above the footer (for blog posts) */
		backLink?: {
			text: string;
			href: string;
		};
	}

	let { backLink }: Props = $props();
</script>

<footer class="px-4 sm:px-6 lg:px-12 py-3 lg:py-6">
	<div class="max-w-7xl mx-auto">
		{#if backLink}
			<nav aria-label="Back navigation">
				<a
					href={backLink.href}
					class="inline-flex items-center gap-2 text-tn-muted hover:text-tn-text transition-colors font-mono text-sm"
				>
					{backLink.text}
				</a>
			</nav>
		{/if}
	</div>
</footer>
