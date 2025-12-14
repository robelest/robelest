<script lang="ts">
	import { Canvas } from '@threlte/core';
	import StarSceneSimple from './StarSceneSimple.svelte';
</script>

<!-- Small animated 3D star for header -->
<div
	class="w-8 h-8 sm:w-10 sm:h-10 opacity-50"
	aria-hidden="true"
>
	<Canvas>
		<StarSceneSimple />
	</Canvas>
</div>
