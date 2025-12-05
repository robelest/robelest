<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
	bind:ref
	data-slot="dialog-title"
	class={cn("dialog-title", className)}
	{...restProps}
/>

<style>
	:global(.dialog-title) {
		font-family: var(--font-serif);
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 300;
		color: var(--tn-teal);
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin-bottom: 0.5rem;
	}
</style>
