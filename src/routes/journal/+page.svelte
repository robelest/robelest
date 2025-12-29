<script lang="ts">
	import type { PageData } from './$types.js';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import { formatDate } from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	const journalQuery = useQuery(
		api.journal.list,
		() => ({ publishedOnly: true }),
		() => ({ initialData: data.journalEntries })
	);
</script>

<svelte:head>
	<title>Journal — Robel Estifanos</title>
	<meta name="description" content="Writing on software design, cognitive load, and building durable systems." />
	<meta property="og:title" content="Journal — Robel Estifanos" />
	<meta property="og:description" content="Writing on software design, cognitive load, and building durable systems." />
	<meta property="og:url" content="https://robelestifanos.com/journal" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="min-h-[100dvh] flex flex-col">
	<main class="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-20">
		{#if journalQuery.isLoading}
			<div class="flex items-center gap-3 text-th-muted" role="status">
				<div class="w-4 h-4 border-2 border-th-muted border-t-transparent rounded-full animate-spin"></div>
				<span class="text-sm">Loading...</span>
			</div>
		{:else if journalQuery.data && journalQuery.data.length > 0}
			<ul class="space-y-8 sm:space-y-10">
				{#each journalQuery.data as entry}
					<li class="border-b border-th-border pb-8 sm:pb-10 last:border-b-0">
						<a href="/journal/{entry.slug}" class="group block">
							<h2 class="text-base sm:text-lg text-th-text group-hover:text-th-accent transition-colors mb-1" style="font-family: var(--font-display);">
								{entry.title}
							</h2>
							<time
								datetime={entry.publishDate}
								class="text-xs sm:text-sm text-th-muted uppercase tracking-wide"
							>
								{formatDate(entry.publishDate)}
							</time>
							{#if entry.description}
								<p class="mt-3 text-sm text-th-subtle leading-relaxed max-w-lg" style="font-family: var(--font-display);">
									{entry.description}
								</p>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-th-muted text-sm">No entries yet.</p>
		{/if}
	</main>

	<footer class="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 border-t border-th-border mt-auto" aria-label="Site information">
		<p class="text-xs sm:text-sm text-th-muted">
			Manhattan, NY
		</p>
	</footer>
</div>
