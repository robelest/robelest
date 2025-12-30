<script lang="ts">
	import type { PageData } from './$types.js';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import { formatDate, formatShortDate } from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	const journalQuery = useQuery(
		api.journal.list,
		() => ({ publishedOnly: true }),
		() => ({ initialData: data.journalEntries })
	);

	// Multi-select tag filter state
	let selectedTags = $state<SvelteSet<string>>(new SvelteSet());
	let hasInitialized = $state(false);

	// Read tags from URL on mount
	onMount(() => {
		const tagsParam = $page.url.searchParams.get('tags');
		if (tagsParam && !hasInitialized) {
			const urlTags = tagsParam.split(',').map(t => decodeURIComponent(t.trim()));
			urlTags.forEach(tag => selectedTags.add(tag));
			hasInitialized = true;
		}
	});

	function toggleTag(tag: string) {
		if (selectedTags.has(tag)) {
			selectedTags.delete(tag);
		} else {
			selectedTags.add(tag);
		}
	}

	function clearTags() {
		selectedTags.clear();
	}

	// Extract all unique tags from entries
	const allTags = $derived(
		[...new Set(
			journalQuery.data?.flatMap(e => e.tags || []) || []
		)].sort()
	);

	// Filter entries by selected tags (AND logic - must match all)
	const filteredEntries = $derived(
		selectedTags.size > 0
			? journalQuery.data?.filter(e =>
					[...selectedTags].every(tag => e.tags?.includes(tag))
				)
			: journalQuery.data
	);

	// Separate featured (first) from rest
	const featured = $derived(filteredEntries?.[0]);
	const remainingEntries = $derived(filteredEntries?.slice(1) || []);

	// Scroll progress indicator
	let scrollContainer: HTMLElement | undefined = $state();
	let scrollProgress = $state(0);
	let showScrollIndicator = $state(false);

	function updateScroll() {
		if (!scrollContainer) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
		const maxScroll = scrollWidth - clientWidth;
		showScrollIndicator = maxScroll > 0;
		scrollProgress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
	}

	// Check overflow on mount and when tags change
	$effect(() => {
		if (scrollContainer && allTags) {
			// Small delay to ensure layout is complete
			setTimeout(updateScroll, 10);
		}
	});
</script>

<svelte:head>
	<title>Journal — Robel Estifanos</title>
	<meta name="description" content="Writing on software design, cognitive load, and building durable systems." />
	<meta property="og:title" content="Journal — Robel Estifanos" />
	<meta property="og:description" content="Writing on software design, cognitive load, and building durable systems." />
	<meta property="og:url" content="https://robelestifanos.com/journal" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="h-[100dvh] flex flex-col">
	<!-- Header with tag filters -->
	<header class="shrink-0 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
		<h1 class="text-2xl sm:text-3xl text-th-text mb-6" style="font-family: var(--font-display);">
			Journal
		</h1>

		<!-- Tag filter chips (multi-select, horizontal scroll) -->
		{#if allTags.length > 0}
			<div
				bind:this={scrollContainer}
				onscroll={updateScroll}
				class="flex gap-2 overflow-x-auto scrollbar-hide"
			>
				<button
					class="tag-chip"
					class:active={selectedTags.size === 0}
					onclick={clearTags}
				>
					All
				</button>
				{#each allTags as tag (tag)}
					<button
						class="tag-chip"
						class:active={selectedTags.has(tag)}
						onclick={() => toggleTag(tag)}
					>
						{tag}
					</button>
				{/each}
			</div>

			<!-- Scroll progress indicator -->
			{#if showScrollIndicator}
				<div class="scroll-track">
					<div
						class="scroll-thumb"
						style="left: {scrollProgress * 70}%"
					></div>
				</div>
			{/if}
		{/if}
	</header>

	<!-- Main content area -->
	<main class="flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6">
		{#if journalQuery.isLoading}
			<div class="flex items-center gap-3 text-th-muted" role="status">
				<div class="w-4 h-4 border-2 border-th-muted border-t-transparent rounded-full animate-spin"></div>
				<span class="text-sm">Loading...</span>
			</div>
		{:else if filteredEntries && filteredEntries.length > 0}
			<!-- Featured entry (most recent) -->
			{#if featured}
				<article class="shrink-0 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-th-border">
					<a href="/journal/{featured.slug}" class="group block">
						<span class="text-[0.625rem] uppercase tracking-widest text-th-muted mb-3 block">
							Latest
						</span>
						<h2 class="text-xl sm:text-2xl text-th-text group-hover:text-th-accent transition-colors mb-2" style="font-family: var(--font-display);">
							{featured.title}
						</h2>
						<time datetime={featured.publishDate} class="text-xs text-th-muted mb-4 block">
							{formatDate(featured.publishDate)}
						</time>
						{#if featured.description}
							<p class="text-sm text-th-subtle leading-relaxed max-w-xl" style="font-family: var(--font-display);">
								{featured.description}
							</p>
						{/if}
					</a>
				</article>
			{/if}

			<!-- Scrollable archive list -->
			{#if remainingEntries.length > 0}
				<section class="flex-1 min-h-0 flex flex-col">
					<h2 class="shrink-0 text-[0.625rem] uppercase tracking-widest text-th-muted mb-4">
						Archive
					</h2>
					<div class="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-4">
						<ul class="space-y-0">
							{#each remainingEntries as entry (entry.slug)}
								<li>
									<a
										href="/journal/{entry.slug}"
										class="group flex items-baseline justify-between gap-4 py-3 border-b border-th-border/50 hover:border-th-accent transition-colors"
									>
										<div class="flex items-baseline gap-4 min-w-0">
											<time
												datetime={entry.publishDate}
												class="text-xs text-th-muted tabular-nums shrink-0 w-14"
											>
												{formatShortDate(entry.publishDate)}
											</time>
											<h3 class="text-sm text-th-text group-hover:text-th-accent transition-colors truncate" style="font-family: var(--font-display);">
												{entry.title}
											</h3>
										</div>
										<span class="text-th-muted group-hover:text-th-accent transition-all opacity-0 group-hover:opacity-100 text-xs -translate-x-1 group-hover:translate-x-0" aria-hidden="true">
											→
										</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				</section>
			{/if}
		{:else if selectedTags.size > 0}
			<p class="text-th-muted text-sm">No entries match all selected tags.</p>
		{:else}
			<p class="text-th-muted text-sm">No entries yet.</p>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="shrink-0 w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-th-border" aria-label="Site information">
		<p class="text-xs sm:text-sm text-th-muted">Manhattan, NY</p>
	</footer>
</div>

<style>
	.tag-chip {
		padding: 0.25rem 0.625rem;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-th-muted);
		border: 1px solid var(--color-th-border);
		border-radius: 2px;
		background: transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* Hide scrollbar but keep functionality */
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	.tag-chip:hover {
		border-color: var(--color-th-accent);
		color: var(--color-th-accent);
	}

	.tag-chip.active {
		background: var(--color-th-text);
		color: var(--color-th-base);
		border-color: var(--color-th-text);
	}

	/* Scroll progress indicator */
	.scroll-track {
		height: 1px;
		background: var(--color-th-border);
		margin-top: 0.75rem;
		position: relative;
	}

	.scroll-thumb {
		position: absolute;
		height: 2px;
		width: 30%;
		background: var(--color-th-accent);
		top: -0.5px;
		transition: left 0.1s ease-out;
		border-radius: 1px;
	}
</style>
