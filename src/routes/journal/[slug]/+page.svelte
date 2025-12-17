<script lang="ts">
	import type { PageData } from './$types.js';
	import { page } from '$app/stores';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../../convex/_generated/api';
	import { formatDate } from '$lib/utils/date';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { Download } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';

	let { data }: { data: PageData } = $props();

	// Initialize mermaid with neutral theme
	mermaid.initialize({
		startOnLoad: false,
		theme: 'neutral',
		fontFamily: 'inherit',
	});

	const slug = $derived($page.params.slug);

	// Use initialData from server load to avoid loading flash, then stay reactive
	const entryQuery = useQuery(
		api.journal.getBySlug,
		() => (slug ? { slug } : "skip"),
		() => ({ initialData: data.entry })
	);

	// Table of contents state
	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let tocItems = $state<TocItem[]>([]);
	let activeId = $state<string>('');
	let contentEl: HTMLElement | undefined = $state();

	// Render markdown to HTML
	const renderedContent = $derived(
		entryQuery.data?.content ? renderMarkdown(entryQuery.data.content) : ''
	);

	// Extract headings and run mermaid after content renders
	$effect(() => {
		if (renderedContent && contentEl) {
			// Wait for DOM to update
			setTimeout(async () => {
				// Extract headings for TOC
				const headings = contentEl?.querySelectorAll('h1, h2, h3');
				const items: TocItem[] = [];

				headings?.forEach((heading, index) => {
					// Create ID if not present
					if (!heading.id) {
						heading.id = `heading-${index}`;
					}
					items.push({
						id: heading.id,
						text: heading.textContent || '',
						level: parseInt(heading.tagName[1])
					});
				});

				tocItems = items;

				// Render mermaid diagrams
				const mermaidElements = contentEl?.querySelectorAll('.mermaid');
				if (mermaidElements && mermaidElements.length > 0) {
					try {
						await mermaid.run({ nodes: mermaidElements as NodeListOf<HTMLElement> });
					} catch (e) {
						console.error('Mermaid rendering error:', e);
					}
				}
			}, 100);
		}
	});

	// Intersection observer for active heading
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{
				rootMargin: '-20% 0% -60% 0%',
				threshold: 0
			}
		);

		// Observe headings when they exist
		const checkHeadings = () => {
			const headings = contentEl?.querySelectorAll('h1, h2, h3');
			if (headings && headings.length > 0) {
				headings.forEach((heading) => observer.observe(heading));
			} else {
				setTimeout(checkHeadings, 200);
			}
		};
		checkHeadings();

		return () => observer.disconnect();
	});

	// Format file size for display
	function formatFileSize(bytes: number | undefined): string {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<svelte:head>
	{#if entryQuery.data}
		<title>{entryQuery.data.title} — Robel Estifanos</title>
		<meta name="description" content={entryQuery.data.description || entryQuery.data.title} />
		<meta property="og:title" content={entryQuery.data.title} />
		<meta property="og:description" content={entryQuery.data.description || entryQuery.data.title} />
		<meta property="og:type" content="article" />
	{:else}
		<title>Journal — Robel Estifanos</title>
	{/if}
	<!-- KaTeX CSS for math rendering -->
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css" crossorigin="anonymous" />
</svelte:head>

<div class="min-h-screen">
	<main class="w-full max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-20">
		{#if entryQuery.isLoading}
			<div class="flex items-center gap-3 text-th-muted">
				<div class="w-4 h-4 border-2 border-th-muted border-t-transparent rounded-full animate-spin"></div>
				<span class="text-sm">Loading...</span>
			</div>
		{:else if entryQuery.data}
			<!-- Header section -->
			<header class="mb-8 sm:mb-10 max-w-2xl">
				<h1 class="text-lg sm:text-xl md:text-2xl text-th-text mb-3 sm:mb-4 leading-tight" style="font-family: 'Crimson Pro', Georgia, serif;">
					{entryQuery.data.title}
				</h1>

				<div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-th-muted">
					<time datetime={entryQuery.data.publishDate} class="uppercase tracking-wide">
						{formatDate(entryQuery.data.publishDate)}
					</time>

					{#if entryQuery.data.fileSize}
						<span class="text-th-border">·</span>
						<span>{formatFileSize(entryQuery.data.fileSize)}</span>
					{/if}

					{#if entryQuery.data.category}
						<span class="text-th-border">·</span>
						<span class="uppercase tracking-wide">{entryQuery.data.category}</span>
					{/if}

					<span class="text-th-border">·</span>
					<a
						href={entryQuery.data.pdfUrl}
						download
						class="inline-flex items-center gap-1.5 text-th-accent hover:text-th-accent-hover transition-colors"
					>
						<Download class="w-3.5 h-3.5" />
						<span>PDF</span>
					</a>
				</div>

				{#if entryQuery.data.description}
					<p class="text-th-subtle mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed" style="font-family: 'Crimson Pro', Georgia, serif; font-style: italic;">
						{entryQuery.data.description}
					</p>
				{/if}
			</header>

			<!-- Two-column layout -->
			<div class="journal-layout">
				<!-- Main content -->
				<article class="typst-content min-w-0" bind:this={contentEl}>
					{@html renderedContent}
				</article>

				<!-- Sidebar TOC -->
				{#if tocItems.length > 0}
					<aside class="journal-sidebar">
						<nav class="journal-toc">
							<span class="toc-label">Contents</span>
							{#each tocItems as item}
								<button
									type="button"
									onclick={() => scrollToHeading(item.id)}
									class="toc-item toc-h{item.level}"
									class:active={activeId === item.id}
								>
									{item.text}
								</button>
							{/each}
						</nav>
					</aside>
				{/if}
			</div>

			<!-- Tags at bottom -->
			{#if entryQuery.data.tags && entryQuery.data.tags.length > 0}
				<div class="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-th-border max-w-2xl">
					<span class="text-xs uppercase tracking-wider text-th-muted mr-2 sm:mr-3">Tagged</span>
					{#each entryQuery.data.tags as tag}
						<span class="inline-block text-xs px-2 py-0.5 bg-th-surface text-th-muted rounded mr-1.5 sm:mr-2 mb-2">
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="text-center py-12">
				<p class="text-th-muted mb-4 text-sm">Entry not found.</p>
				<a href="/" class="text-th-accent hover:underline text-sm">Return home</a>
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="w-full max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 border-t border-th-border">
		<p class="text-xs text-th-muted uppercase tracking-wider">
			Manhattan, NY
		</p>
	</footer>
</div>

<style>
	.toc-item {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		color: #8c8780;
		padding: 0.25rem 0;
		font-size: 0.75rem;
		line-height: 1.5;
		transition: color 0.15s ease;
	}

	.toc-item:hover,
	.toc-item.active {
		color: #c25d3a;
	}

	.toc-h1 {
		font-weight: 500;
		color: #1a1816;
	}

	.toc-h2 {
		font-weight: 500;
	}

	.toc-h3 {
		padding-left: 0.75rem;
		font-size: 0.6875rem;
	}
</style>
