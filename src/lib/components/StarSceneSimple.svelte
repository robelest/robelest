<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	// Auto-rotation state
	let rotation = $state(0);

	// Noticeable but smooth rotation
	const ROTATION_SPEED = 0.008;

	// Animation loop
	useTask(() => {
		rotation += ROTATION_SPEED;
	});

	// Light theme accent color (terracotta)
	const ACCENT = '#c25d3a';

	// Hollow frame geometry
	const outerSize = 1;
	const innerSize = 0.85;
	const depth = 0.12;

	// Create shape with hole
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

	// Extrude for depth
	const frameGeometry = new THREE.ExtrudeGeometry(shape, {
		depth: depth,
		bevelEnabled: false
	});
	frameGeometry.translate(0, 0, -depth / 2);

	// Wireframe edges
	const edgesGeometry = new THREE.EdgesGeometry(frameGeometry);
</script>

<!-- Camera -->
<T.PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />

<!-- Rotating group with both frames -->
<T.Group rotation.z={rotation}>
	<!-- Frame 1: Standard orientation -->
	<T.LineSegments geometry={edgesGeometry}>
		<T.LineBasicMaterial color={ACCENT} />
	</T.LineSegments>

	<!-- Frame 2: Rotated 45° -->
	<T.LineSegments geometry={edgesGeometry} rotation.z={Math.PI / 4}>
		<T.LineBasicMaterial color={ACCENT} />
	</T.LineSegments>
</T.Group>
