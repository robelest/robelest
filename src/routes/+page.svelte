<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { formatDate } from '$lib/utils/date';
	import StarHeader from '$lib/components/StarHeader.svelte';

	const postsQuery = useQuery(api.posts.list, { publishedOnly: true });

	// Derived state for whether we have posts
	const hasPosts = $derived(postsQuery.data && postsQuery.data.length > 0);
</script>

<svelte:head>
	<title>Robel Estifanos</title>
	<meta
		name="description"
		content="Founding engineer building software that amplifies human compassion."
	/>
	<meta name="keywords" content="Robel Estifanos, founding engineer, Trestle, software" />
	<meta property="og:title" content="Robel Estifanos" />
	<meta property="og:description" content="Founding engineer building software that amplifies human compassion." />
	<meta property="og:url" content="https://robelestifanos.com" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Robel Estifanos" />
</svelte:head>

<div class="h-[100dvh] flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="shrink-0 w-full max-w-[640px] mx-auto px-6 pt-12 sm:pt-16 pb-6">
		<nav class="flex items-center justify-between">
			<span class="text-xl sm:text-2xl text-th-text" style="font-family: var(--font-display);">
				Robel Estifanos
			</span>
			<StarHeader />
		</nav>
	</header>

	<!-- Main Content -->
	<main class="flex-1 min-h-0 flex flex-col w-full max-w-[640px] mx-auto px-6 overflow-hidden">
		<!-- About Section -->
		<section class="shrink-0 mb-10 sm:mb-12">
			<p class="text-lg sm:text-xl leading-relaxed text-th-text mb-3" style="font-family: var(--font-display);">
				Founding engineer at <a href="https://trestle.inc" target="_blank" rel="noopener noreferrer" class="hover:underline underline-offset-2">Trestle</a>,
				building software that amplifies human compassion.
			</p>
			<p class="text-base leading-relaxed text-th-muted">
				Based in Manhattan. Interested in craft, clarity, and tools that respect human agency.
			</p>
		</section>

		<!-- Elsewhere Section -->
		<section id="elsewhere" class="shrink-0 mb-10 sm:mb-12">
			<h2 class="text-sm font-medium text-th-muted uppercase tracking-widest mb-6">
				Elsewhere
			</h2>
			<ul class="flex flex-wrap gap-x-6 gap-y-2 text-th-text">
				<li>
					<a
						href="https://github.com/robelest"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-th-accent transition-colors"
					>
						GitHub
					</a>
				</li>
				<li>
					<a
						href="https://twitter.com/robelestifanos_"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-th-accent transition-colors"
					>
						Twitter
					</a>
				</li>
				<li>
					<a
						href="https://linkedin.com/in/robelest"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-th-accent transition-colors"
					>
						LinkedIn
					</a>
				</li>
				<li>
					<a
						href="mailto:robel@trestle.inc"
						class="hover:text-th-accent transition-colors"
					>
						Email
					</a>
				</li>
			</ul>
		</section>

		<!-- Journal Section (only if posts exist) -->
		{#if hasPosts}
			<section id="journal" class="flex-1 min-h-0 flex flex-col">
				<h2 class="shrink-0 text-sm font-medium text-th-muted uppercase tracking-widest mb-6">
					Journal
				</h2>
				<div class="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
					<ul class="space-y-3">
						{#each postsQuery.data as post}
							<li>
								<a
									href="/journal/{post.slug}"
									class="group flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
								>
									<time
										datetime={post.publishDate}
										class="text-sm text-th-muted tabular-nums shrink-0"
									>
										{formatDate(post.publishDate)}
									</time>
									<span class="text-th-text group-hover:text-th-accent transition-colors">
										{post.title}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</section>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="shrink-0 w-full max-w-[640px] mx-auto px-6 py-6 border-t border-th-border">
		<p class="text-sm text-th-muted">
			Manhattan, NY
		</p>
	</footer>
</div>
