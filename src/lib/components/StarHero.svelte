<script lang="ts">
	import { Canvas } from '@threlte/core';

	interface Props {
		onSphereClick?: (sigil: string) => void;
	}

	let { onSphereClick }: Props = $props();

	// Pointer position for tilt effect (works for mouse and touch)
	let targetTiltX = $state(0);
	let targetTiltY = $state(0);

	// Subtle tilt for clean feel
	const MAX_TILT = 0.4;

	function handlePointerMove(event: PointerEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		targetTiltX = y * MAX_TILT;
		targetTiltY = x * MAX_TILT;
	}

	function handlePointerLeave() {
		targetTiltX = 0;
		targetTiltY = 0;
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
			<StarScene {targetTiltX} {targetTiltY} {onSphereClick} />
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
