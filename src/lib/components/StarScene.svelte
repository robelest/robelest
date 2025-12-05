<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import * as THREE from 'three';

	// Enable click detection on meshes
	interactivity();

	interface Props {
		targetTiltX?: number;
		targetTiltY?: number;
		onSphereClick?: (sigil: string) => void;
	}

	let { targetTiltX = 0, targetTiltY = 0, onSphereClick }: Props = $props();

	// Track hover state for each sphere
	let hoveredSphere = $state<string | null>(null);

	// Tilt state with easing
	let tiltX = $state(0);
	let tiltY = $state(0);

	// Slow auto-rotation
	let rotationZ = $state(0);

	// Smooth easing for responsive feel
	const EASING = 0.35;
	const ROTATION_SPEED = 0.0018; // Slow, subtle rotation

	// Animation loop for smooth tilt and rotation
	useTask(() => {
		tiltX += (targetTiltX - tiltX) * EASING;
		tiltY += (targetTiltY - tiltY) * EASING;
		rotationZ += ROTATION_SPEED;
	});

	// Tokyo Night colors
	const BLUE = '#7aa2f7';       // Primary accent
	const RED = '#f7768e';        // Hover color - high contrast

	// Create hollow frame geometry (picture frame shape) as wireframe
	const outerSize = 1;
	const innerSize = 0.85;
	const depth = 0.15;

	// Create shape with hole for hollow frame
	const shape = new THREE.Shape();
	shape.moveTo(-outerSize, -outerSize);
	shape.lineTo(outerSize, -outerSize);
	shape.lineTo(outerSize, outerSize);
	shape.lineTo(-outerSize, outerSize);
	shape.closePath();

	const hole = new THREE.Path();
	hole.moveTo(-innerSize, -innerSize);
	hole.lineTo(innerSize, -innerSize);
	hole.lineTo(innerSize, innerSize);
	hole.lineTo(-innerSize, innerSize);
	hole.closePath();
	shape.holes.push(hole);

	// Extrude to give depth
	const frameGeometry = new THREE.ExtrudeGeometry(shape, {
		depth: depth,
		bevelEnabled: false
	});
	frameGeometry.translate(0, 0, -depth / 2);

	// Create wireframe edges from the hollow frame
	const edgesGeometry = new THREE.EdgesGeometry(frameGeometry);

	// Corner positions for clickable squares
	const cornerOffset = outerSize - 0.08;
	const spherePositions = [
		{ pos: [cornerOffset, cornerOffset, 0] as [number, number, number], sigil: 'Monomania' },     // Top-right
		{ pos: [cornerOffset, -cornerOffset, 0] as [number, number, number], sigil: 'Faith' },        // Bottom-right
		{ pos: [-cornerOffset, -cornerOffset, 0] as [number, number, number], sigil: 'Nature' },      // Bottom-left
		{ pos: [-cornerOffset, cornerOffset, 0] as [number, number, number], sigil: 'Agency' }        // Top-left
	];

	// Corner squares for visual consistency with the star geometry
	// Using BoxGeometry for depth, aligned with the non-rotated frame
	const squareSize = 0.28;
	const squareDepth = 0.2;
	const squareGeometry = new THREE.BoxGeometry(squareSize, squareSize, squareDepth);
</script>

<!-- Camera -->
<T.PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />

<!-- Group for mouse tilt -->
<T.Group rotation.x={tiltX} rotation.y={tiltY} rotation.z={rotationZ}>
	<!-- Frame 1: Standard orientation (wireframe) -->
	<T.LineSegments geometry={edgesGeometry}>
		<T.LineBasicMaterial color={BLUE} />
	</T.LineSegments>

	<!-- Frame 2: Rotated 45° (wireframe) -->
	<T.LineSegments geometry={edgesGeometry} rotation.z={Math.PI / 4}>
		<T.LineBasicMaterial color={BLUE} />
	</T.LineSegments>

	<!-- Clickable corner boxes aligned with the non-rotated frame -->
	{#each spherePositions as { pos, sigil }}
		<T.Mesh
			geometry={squareGeometry}
			position={pos}
			onclick={() => onSphereClick?.(sigil)}
			onpointerenter={() => hoveredSphere = sigil}
			onpointerleave={() => hoveredSphere = null}
		>
			<T.MeshBasicMaterial color={hoveredSphere === sigil ? RED : BLUE} />
		</T.Mesh>
	{/each}
</T.Group>
