<script lang="ts">
	import StarHeader from '$lib/components/StarHeader.svelte';
</script>

<svelte:head>
	<title>Robel Estifanos</title>
	<meta
		name="description"
		content="Technical lead at Trestle. Focused on reducing cognitive load and designing durable software."
	/>
	<meta name="keywords" content="Robel Estifanos, Trestle, software engineering, technical leadership" />
	<meta property="og:title" content="Robel Estifanos" />
	<meta property="og:description" content="Technical lead at Trestle. Focused on reducing cognitive load and designing durable software." />
	<meta property="og:url" content="https://robelestifanos.com" />
	<meta property="og:image" content="https://robelestifanos.com/logo512.png" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Robel Estifanos" />
	<meta name="twitter:description" content="Technical lead at Trestle. Focused on reducing cognitive load and designing durable software." />
	<meta name="twitter:image" content="https://robelestifanos.com/logo512.png" />
</svelte:head>

<div class="min-h-[100dvh] flex flex-col">
	<!-- Header -->
	<header class="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
		<nav class="flex items-center justify-between" aria-label="Main navigation">
			<span class="text-lg sm:text-xl md:text-2xl text-th-text" style="font-family: var(--font-display);">
				Robel Estifanos
			</span>
			<StarHeader />
		</nav>
	</header>

	<!-- Main Content -->
	<main class="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6">
		<!-- About Section -->
		<section class="mb-8 sm:mb-12">
			<p class="text-sm sm:text-base leading-relaxed text-th-text" style="font-family: var(--font-display);">
				From enterprise infrastructure to building on the ground, I focus on environments where software quality and judgment actually matter. I now lead technical direction <a href="https://trestle.inc" target="_blank" rel="noopener noreferrer" class="hover:underline underline-offset-2">@Trestle</a>, building a system of record designed around the authentic workflows of frontline staff. As AI collapses the cost of automation, I've shifted my focus to the new frontier: reducing cognitive load and designing software that remains durable over time.
			</p>
		</section>

		<!-- Elsewhere Section -->
		<section id="elsewhere" class="mb-8 sm:mb-12" aria-labelledby="elsewhere-heading">
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

		<!-- Archive Section -->
		<section id="archive" aria-labelledby="archive-heading">
			<h2 id="archive-heading" class="text-xs sm:text-sm font-medium text-th-muted uppercase tracking-widest mb-4 sm:mb-6">
				Archive
			</h2>
			<ul class="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm sm:text-base" role="list">
				<li>
					<a
						href="/journal"
						class="text-th-text hover:text-th-accent transition-colors"
					>
						Journal
					</a>
				</li>
				<li>
					<span class="text-th-muted">Lab</span>
				</li>
				<li>
					<span class="text-th-muted">Studio</span>
				</li>
			</ul>
		</section>
	</main>

	<!-- Footer -->
	<footer class="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-th-border mt-auto" aria-label="Site information">
		<p class="text-xs sm:text-sm text-th-muted">
			Manhattan, NY
		</p>
	</footer>
</div>
