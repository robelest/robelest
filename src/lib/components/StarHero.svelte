<script lang="ts">
	import { Canvas } from '@threlte/core';

	interface Props {
		onSphereClick?: (sigil: string) => void;
		showValueSquares?: boolean;
	}

	let { onSphereClick, showValueSquares = false }: Props = $props();

	// Track last pointer position for delta calculation
	let lastPointerX = $state<number | null>(null);
	let lastPointerY = $state<number | null>(null);

	// Accumulated rotation deltas to pass to StarScene
	let deltaX = $state(0);
	let deltaY = $state(0);

	// Sensitivity for pointer movement
	const SENSITIVITY = 0.01;

	function handlePointerMove(event: PointerEvent) {
		if (lastPointerX !== null && lastPointerY !== null) {
			// Calculate delta from last position
			const dx = event.clientX - lastPointerX;
			const dy = event.clientY - lastPointerY;

			// Accumulate rotation (Y movement affects X rotation, X movement affects Y rotation)
			deltaX += dy * SENSITIVITY;
			deltaY += dx * SENSITIVITY;
		}

		lastPointerX = event.clientX;
		lastPointerY = event.clientY;
	}

	function handlePointerLeave() {
		// Reset tracking but don't reset deltas - rotation persists
		lastPointerX = null;
		lastPointerY = null;
	}
</script>

<div
	class="three-container"
	role="img"
	aria-label="Interactive 8-pointed star with clickable corners"
	onpointermove={handlePointerMove}
	onpointerleave={handlePointerLeave}
>
	<Canvas>
		{#await import('./StarScene.svelte') then { default: StarScene }}
			<StarScene {deltaX} {deltaY} {onSphereClick} {showValueSquares} />
		{/await}
	</Canvas>
</div>

<style>
	.three-container {
		width: 100%;
		max-width: 400px;
		aspect-ratio: 1;
		margin: 0 auto;
		touch-action: none; /* Prevent browser touch gestures */
	}

	.three-container :global(canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}
</style>
