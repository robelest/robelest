<script lang="ts">
	import { Canvas } from '@threlte/core';

	interface Props {
		onSphereClick?: (sigil: string) => void;
		isDark?: boolean;
	}

	let { onSphereClick, isDark = false }: Props = $props();

	// Mouse position for tilt effect
	let targetTiltX = $state(0);
	let targetTiltY = $state(0);

	// Very high sensitivity for dramatic, full rotation
	const MAX_TILT = 1.2;

	function handleMouseMove(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		targetTiltX = y * MAX_TILT;
		targetTiltY = x * MAX_TILT;
	}

	function handleMouseLeave() {
		targetTiltX = 0;
		targetTiltY = 0;
	}
</script>

<div
	class="three-container"
	role="img"
	aria-label="Interactive golden 8-pointed star with clickable spheres"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
	<Canvas>
		{#await import('./StarScene.svelte') then { default: StarScene }}
			<StarScene {targetTiltX} {targetTiltY} {onSphereClick} {isDark} />
		{/await}
	</Canvas>
</div>

<style>
	.three-container {
		width: 100%;
		max-width: 400px;
		aspect-ratio: 1;
		margin: 0 auto;
	}

	.three-container :global(canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}
</style>
