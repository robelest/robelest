<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.DescriptionProps = $props();
</script>

<DialogPrimitive.Description
	bind:ref
	data-slot="dialog-description"
	class={cn("dialog-description", className)}
	{...restProps}
/>

<style>
	:global(.dialog-description) {
		font-family: var(--font-serif);
		font-size: clamp(0.875rem, 1.5vw, 1rem);
		color: var(--tn-muted);
		font-style: italic;
		font-weight: 300;
	}
</style>
