<script lang="ts">
	import { page } from '$app/stores';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../../convex/_generated/api';
	import { formatDate } from '$lib/utils/date';
	import { ArrowLeft } from '@lucide/svelte';

	const slug = $derived($page.params.slug);
	const postQuery = useQuery(
		api.posts.getBySlug,
		() => ({ slug })
	);
</script>

<svelte:head>
	{#if postQuery.data}
		<title>{postQuery.data.title} — Robel Estifanos</title>
		<meta name="description" content={postQuery.data.description || postQuery.data.title} />
		<meta property="og:title" content={postQuery.data.title} />
		<meta property="og:description" content={postQuery.data.description || postQuery.data.title} />
		<meta property="og:type" content="article" />
	{:else}
		<title>Journal — Robel Estifanos</title>
	{/if}
</svelte:head>

<div class="min-h-screen flex flex-col">
	<main class="flex-1 w-full max-w-[640px] mx-auto px-6 py-16 sm:py-24">
		<!-- Back link -->
		<a
			href="/"
			class="inline-flex items-center gap-2 text-th-muted hover:text-th-accent transition-colors mb-12 text-sm group"
		>
			<ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
			<span>Back</span>
		</a>

		{#if postQuery.isLoading}
			<p class="text-th-muted">Loading...</p>
		{:else if postQuery.data}
			<article>
				<header class="mb-12">
					<h1 class="text-2xl sm:text-3xl text-th-text mb-3" style="font-family: var(--font-display);">
						{postQuery.data.title}
					</h1>
					<time datetime={postQuery.data.publishDate} class="text-sm text-th-muted">
						{formatDate(postQuery.data.publishDate)}
					</time>
				</header>

				<div class="prose">
					{@html postQuery.data.content}
				</div>
			</article>
		{:else}
			<div class="text-center py-12">
				<p class="text-th-muted mb-4">Post not found.</p>
				<a href="/" class="text-th-accent hover:underline">Return home</a>
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="w-full max-w-[640px] mx-auto px-6 py-8 border-t border-th-border">
		<p class="text-sm text-th-muted">
			Manhattan, NY
		</p>
	</footer>
</div>
