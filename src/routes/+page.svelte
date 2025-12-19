<script lang="ts">
	import type { PageData } from './$types.js';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { formatDate } from '$lib/utils/date';
	import StarHeader from '$lib/components/StarHeader.svelte';

	let { data }: { data: PageData } = $props();

	// Use initialData from server load to avoid loading flash, then stay reactive
	const journalQuery = useQuery(
		api.journal.list,
		() => ({ publishedOnly: true }),
		() => ({ initialData: data.journalEntries })
	);

	// Derived state for whether we have entries
	const hasEntries = $derived(journalQuery.data && journalQuery.data.length > 0);
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
	<meta property="og:image" content="https://robelestifanos.com/logo512.png" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Robel Estifanos" />
	<meta name="twitter:description" content="Founding engineer building software that amplifies human compassion." />
	<meta name="twitter:image" content="https://robelestifanos.com/logo512.png" />
</svelte:head>

<div class="h-[100dvh] flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="shrink-0 w-full max-w-[640px] mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
		<nav class="flex items-center justify-between" aria-label="Main navigation">
			<span class="text-lg sm:text-xl md:text-2xl text-th-text" style="font-family: var(--font-display);">
				Robel Estifanos
			</span>
			<StarHeader />
		</nav>
	</header>

	<!-- Main Content -->
	<main class="flex-1 min-h-0 flex flex-col w-full max-w-[640px] mx-auto px-4 sm:px-6 overflow-hidden">
		<!-- About Section -->
		<section class="shrink-0 mb-8 sm:mb-12">
			<p class="text-base sm:text-lg leading-relaxed text-th-text mb-3" style="font-family: var(--font-display);">
				Founding engineer at <a href="https://trestle.inc" target="_blank" rel="noopener noreferrer" class="hover:underline underline-offset-2">Trestle</a>,
				building software that amplifies human compassion.
			</p>
			<p class="text-sm sm:text-base leading-relaxed text-th-muted">
				Based in Manhattan. Interested in craft, clarity, and tools that respect human agency.
			</p>
		</section>

		<!-- Elsewhere Section -->
		<section id="elsewhere" class="shrink-0 mb-8 sm:mb-12" aria-labelledby="elsewhere-heading">
			<h2 id="elsewhere-heading" class="text-xs sm:text-sm font-medium text-th-muted uppercase tracking-widest mb-4 sm:mb-6">
				Elsewhere
			</h2>
			<ul class="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm sm:text-base text-th-text" role="list">
				<li>
					<a
						href="https://github.com/robelest"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-th-accent transition-colors"
						aria-label="GitHub profile (opens in new tab)"
					>
						GitHub<span class="sr-only"> (opens in new tab)</span>
					</a>
				</li>
				<li>
					<a
						href="https://twitter.com/robelestifanos_"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-th-accent transition-colors"
						aria-label="Twitter profile (opens in new tab)"
					>
						Twitter<span class="sr-only"> (opens in new tab)</span>
					</a>
				</li>
				<li>
					<a
						href="https://linkedin.com/in/robelest"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-th-accent transition-colors"
						aria-label="LinkedIn profile (opens in new tab)"
					>
						LinkedIn<span class="sr-only"> (opens in new tab)</span>
					</a>
				</li>
				<li>
					<a
						href="mailto:robel@trestle.inc"
						class="hover:text-th-accent transition-colors"
						aria-label="Send email to robel@trestle.inc"
					>
						Email
					</a>
				</li>
			</ul>
		</section>

		<!-- Journal Section (only if entries exist) -->
		{#if hasEntries}
			<section id="journal" class="flex-1 min-h-0 flex flex-col" aria-labelledby="journal-heading">
				<h2 id="journal-heading" class="shrink-0 text-xs sm:text-sm font-medium text-th-muted uppercase tracking-widest mb-4 sm:mb-6">
					Journal
				</h2>
				<div class="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
					<ul class="space-y-3">
						{#each journalQuery.data as entry}
							<li>
								<a
									href="/journal/{entry.slug}"
									class="group flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
								>
									<time
										datetime={entry.publishDate}
										class="text-sm text-th-muted tabular-nums shrink-0"
									>
										{formatDate(entry.publishDate)}
									</time>
									<span class="text-th-text group-hover:text-th-accent transition-colors">
										{entry.title}
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
	<footer class="shrink-0 w-full max-w-[640px] mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-th-border" aria-label="Site information">
		<p class="text-xs sm:text-sm text-th-muted">
			Manhattan, NY
		</p>
	</footer>
</div>
