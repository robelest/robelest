<script lang="ts">
	import { ArrowLeft, MapPin } from '@lucide/svelte';
	import StarHero from '$lib/components/StarHero.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { onMount } from 'svelte';
	import { formatDate } from '$lib/utils/date';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { page } from '$app/stores';
	import { goto, replaceState } from '$app/navigation';
	import emptySvg from '$lib/assets/empty.svg';

	// Convex queries
	const postsQuery = useQuery(api.posts.list, { publishedOnly: true });

	// Essay Dialog state
	let selectedSigil = $state<string | null>(null);
	let dialogOpen = $state(false);

	// Journal Dialog state
	let journalOpen = $state(false);
	let selectedSlug = $state<string | null>(null);

	// Get selected post from Convex query
	const selectedPostQuery = useQuery(
		api.posts.getBySlug,
		() => selectedSlug ? { slug: selectedSlug } : 'skip'
	);

	// Time state for header (EST)
	let currentTime = $state('');

	// Essay content for each sigil
	const essays: Record<string, { subtitle: string; content: string }> = {
		Monomania: {
			subtitle: 'The Art of Singular Focus',
			content: `The singular focus that transforms ordinary effort into extraordinary achievement. It's the obsessive dedication to a craft, an idea, or a mission that separates those who merely participate from those who pioneer.

In a world of endless distractions, monomania is the rare gift of tunnel vision—the ability to see only the path forward while others scatter their attention across a thousand possibilities.

This is not mere discipline. It is the quiet madness of conviction, the willingness to sacrifice breadth for depth, to know one thing completely rather than many things superficially.

The great builders understood this. They did not divide themselves across projects—they became their projects. And in that becoming, they transcended the ordinary limits of human capability.`
		},
		Faith: {
			subtitle: 'Beyond the Visible',
			content: `Beyond religion, faith is the conviction in something greater than oneself. It's the belief that our work matters, that progress is possible, and that the future can be better than the past.

Faith sustains us through failure, guides us through uncertainty, and connects us to a tradition of those who built before us and those who will build after.

In the darkness of doubt, faith is not the absence of questions—it is the presence of commitment despite them. It is choosing to act when outcomes are uncertain, to build when destruction seems inevitable.

The Ethiopian tradition teaches that faith moves mountains not through magic, but through the accumulated weight of daily choices, each one a small act of belief made manifest.`
		},
		Nature: {
			subtitle: 'Patterns of Growth',
			content: `The understanding that we are not separate from the world but deeply embedded within it. Technology should amplify natural human connection, not replace it.

Nature reminds us of patience, of seasons, of growth that cannot be rushed. The best systems mimic natural patterns—resilient, adaptive, and beautiful in their simplicity.

A tree does not strain to grow. Water does not struggle to flow downhill. There is a wisdom in following the grain of reality rather than fighting against it.

Software that endures is software that works with human nature, not against it. It is organic architecture—structures that breathe, adapt, and evolve with those who use them.`
		},
		Agency: {
			subtitle: 'The Power to Create Change',
			content: `The fundamental belief that individuals can shape their circumstances. Agency is both the power and the responsibility to act, to decide, to create change.

Software that amplifies human compassion must first respect human agency—giving people tools, not cages; offering possibilities, not prescriptions.

Every interface is a philosophy made visible. It either expands what humans can do or constrains them. It either trusts their judgment or undermines it.

The goal is not to automate humanity but to augment it—to extend our reach without replacing our grasp, to sharpen our vision without blinding us to what machines cannot see.`
		}
	};

	function updateTime() {
		const now = new Date();
		currentTime = now.toLocaleTimeString('en-US', {
			timeZone: 'America/New_York',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	// Handle URL params for journal
	$effect(() => {
		const journalParam = $page.url.searchParams.get('journal');
		if (journalParam === 'open') {
			journalOpen = true;
			selectedSlug = null;
		} else if (journalParam) {
			journalOpen = true;
			selectedSlug = journalParam;
		}
	});

	onMount(() => {
		// Time initialization and live updates
		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	});

	function handleSphereClick(sigil: string) {
		selectedSigil = sigil;
		dialogOpen = true;
	}

	function handleDialogChange(open: boolean) {
		dialogOpen = open;
		if (!open) {
			selectedSigil = null;
		}
	}

	// Journal dialog handlers
	function handleJournalDialogChange(open: boolean) {
		journalOpen = open;
		if (!open) {
			selectedSlug = null;
			// Clear URL params when dialog closes
			goto('/', { replaceState: true });
		}
	}

	function handlePostClick(slug: string) {
		selectedSlug = slug;
		// Update URL to reflect selected post
		goto(`/?journal=${slug}`, { replaceState: true });
	}

	function handleBackToList() {
		selectedSlug = null;
		goto('/?journal=open', { replaceState: true });
	}

	function openJournal() {
		journalOpen = true;
		goto('/?journal=open', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Robel Estifanos - Founding Engineer</title>
	<meta
		name="description"
		content="Monomania. Faith. Nature. Agency. Founding engineer focused on social impact technology."
	/>
	<meta
		name="keywords"
		content="Robel Estifanos, founding engineer, social impact, technology, Ethiopian heritage, Trestle"
	/>
	<meta property="og:title" content="Robel Estifanos - Founding Engineer" />
	<meta property="og:description" content="Monomania. Faith. Nature. Agency." />
	<meta property="og:url" content="https://robelestifanos.com" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Robel Estifanos - Founding Engineer" />
</svelte:head>

<!-- Main centered container -->
<main class="h-screen flex items-center justify-center">
	<div class="scale-110 lg:scale-[1.35]">
		<StarHero onSphereClick={handleSphereClick} />
	</div>
</main>

<!-- Fixed Footer -->
<footer class="fixed bottom-0 left-0 right-0 z-50 px-6 lg:px-12 py-4 lg:py-6 flex justify-between items-center">
	<!-- Left: Location & Time -->
	<div class="flex items-center gap-2 italic text-base sm:text-lg lg:text-xl font-light tracking-tight text-tn-muted" style="font-family: var(--font-serif);">
		<span>Manhattan</span>
		<MapPin class="w-4 h-4 sm:w-5 sm:h-5 text-tn-teal" />
		<span>{currentTime}</span>
	</div>

	<!-- Right: Identity -->
	<div class="flex items-center gap-2 italic text-base sm:text-lg lg:text-xl font-light tracking-tight" style="font-family: var(--font-serif);">
		<button
			onclick={openJournal}
			class="text-tn-muted hover:text-tn-red transition-colors cursor-pointer"
		>
			Robel Estifanos
		</button>
		<a
			href="https://trestle.inc"
			target="_blank"
			rel="noopener noreferrer"
			class="text-tn-muted hover:text-tn-red transition-colors"
		>
			@ Trestle
		</a>
	</div>
</footer>

<!-- Essay Dialog -->
<Dialog.Root open={dialogOpen} onOpenChange={handleDialogChange}>
	<Dialog.Content>
		{#if selectedSigil && essays[selectedSigil]}
			<Dialog.Header class="mb-8">
				<Dialog.Title>{selectedSigil}</Dialog.Title>
				<Dialog.Description>{essays[selectedSigil].subtitle}</Dialog.Description>
			</Dialog.Header>

			<div class="essay-body">
				{essays[selectedSigil].content}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Journal Dialog -->
<Dialog.Root open={journalOpen} onOpenChange={handleJournalDialogChange}>
	<Dialog.Content>
		{#if selectedSlug && selectedPostQuery.data}
			<!-- Article View -->
			<button
				onclick={handleBackToList}
				class="flex items-center gap-2 text-tn-muted hover:text-tn-text transition-colors mb-8"
			>
				<ArrowLeft class="w-4 h-4" />
				<span class="text-sm">Back to Journal</span>
			</button>

			<Dialog.Header class="mb-8">
				<Dialog.Title>{selectedPostQuery.data.title}</Dialog.Title>
				<p class="text-tn-muted text-sm">{formatDate(selectedPostQuery.data.publishDate)}</p>
			</Dialog.Header>

			<div class="journal-body prose">
				{@html selectedPostQuery.data.content}
			</div>
		{:else if selectedSlug && selectedPostQuery.isLoading}
			<div class="flex justify-center py-12">
				<span class="text-tn-muted">Loading...</span>
			</div>
		{:else}
			<!-- List View -->
			<Dialog.Header class="mb-8">
				<Dialog.Title>Journal</Dialog.Title>
				<Dialog.Description>Thoughts on software and building better systems.</Dialog.Description>
			</Dialog.Header>

			{#if postsQuery.isLoading}
				<div class="flex justify-center py-12">
					<span class="text-tn-muted">Loading...</span>
				</div>
			{:else if !postsQuery.data || postsQuery.data.length === 0}
				<div class="flex justify-center items-center py-12">
					<img src={emptySvg} alt="No posts yet" class="w-48 h-48 opacity-60" />
				</div>
			{:else}
				<nav aria-label="Journal entries">
					<ul class="space-y-6">
						{#each postsQuery.data as post}
							<li>
								<button
									onclick={() => handlePostClick(post.slug)}
									class="block w-full text-left group hover:opacity-70 transition-opacity"
								>
									<div class="flex items-center gap-3 text-tn-muted text-sm mb-1">
										<time datetime={post.publishDate}>{formatDate(post.publishDate)}</time>
										<span aria-hidden="true">•</span>
										<span class="text-tn-text group-hover:text-tn-blue transition-colors font-medium">{post.title}</span>
									</div>
									{#if post.description}
										<p class="text-tn-muted text-sm">{post.description}</p>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	/* Content body styles */
	.essay-body,
	.journal-body {
		font-family: var(--font-serif);
		font-size: clamp(1.1rem, 1.5vw, 1.35rem);
		line-height: 1.9;
		color: var(--tn-text);
		max-width: 65ch;
	}

	.essay-body {
		white-space: pre-line;
	}
</style>
