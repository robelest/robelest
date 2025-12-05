<script lang="ts">
	interface Props {
		/** Text and href for right-side navigation link */
		rightLink?: {
			text: string;
			href: string;
		};
	}

	let { rightLink }: Props = $props();
</script>

<nav aria-label="Main navigation" class="px-4 sm:px-6 lg:px-12 py-4 sm:py-8 flex justify-end items-center">
	{#if rightLink}
		<a
			href={rightLink.href}
			class="text-xs sm:text-sm text-rose-pine-muted font-mono hover:text-rose-pine-text transition-colors"
		>
			{rightLink.text}
		</a>
	{/if}
</nav>
