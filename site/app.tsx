import { Hono } from 'hono';
import { ssgParams } from 'hono/ssg';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import { renderMarkdown } from './lib/markdown';
import { formatDate } from './lib/date';

// ---------------------------------------------------------------------------
// Convex client — used at build time only
// ---------------------------------------------------------------------------
const convex = new ConvexHttpClient(process.env.PUBLIC_CONVEX_URL!);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatFileSize(bytes: number | undefined): string {
	if (!bytes) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = new Hono();

// ═══════════════════════════════════════════════════════════════════════════
// GET / — Home page
// ═══════════════════════════════════════════════════════════════════════════
app.get('/', (c) => {
	const aboutHtml =
		'From enterprise infrastructure to building on the ground, I focus on environments where software quality and judgment actually matter. I now lead technical direction <a href="https://trestle.inc" target="_blank" rel="noopener noreferrer" class="hover:underline underline-offset-2">@Trestle</a>, building a system of record designed around the authentic workflows of frontline staff. As AI collapses the cost of automation, I\u2019ve shifted my focus to the new frontier: reducing cognitive load and designing software that remains durable over time.';

	return c.html(
		<Layout
			title="Robel Estifanos"
			description="Technical lead at Trestle. Focused on reducing cognitive load and designing durable software."
			ogUrl="https://robelestifanos.com"
		>
			<div class="min-h-[100dvh] flex flex-col">
				<Header />

				<main class="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6">
					{/* About */}
					<section class="mb-8 sm:mb-12">
						<p
							class="text-sm sm:text-base leading-relaxed text-th-text"
							style="font-family: var(--font-display);"
							dangerouslySetInnerHTML={{ __html: aboutHtml }}
						/>
					</section>

					{/* Elsewhere */}
					<section id="elsewhere" class="mb-8 sm:mb-12" aria-labelledby="elsewhere-heading">
						<h2
							id="elsewhere-heading"
							class="text-xs sm:text-sm font-medium text-th-muted uppercase tracking-widest mb-4 sm:mb-6"
						>
							Elsewhere
						</h2>
						<ul
							class="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm sm:text-base text-th-text"
							role="list"
						>
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

					{/* Archive */}
					<section id="archive" aria-labelledby="archive-heading">
						<h2
							id="archive-heading"
							class="text-xs sm:text-sm font-medium text-th-muted uppercase tracking-widest mb-4 sm:mb-6"
						>
							Archive
						</h2>
						<ul
							class="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm sm:text-base"
							role="list"
						>
							<li>
								<a href="/journal" class="text-th-text hover:text-th-accent transition-colors">
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

				<Footer />
			</div>
		</Layout>,
	);
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /journal — Journal list page
// ═══════════════════════════════════════════════════════════════════════════
app.get('/journal', async (c) => {
	const entries = await convex.query(api.journal.list, { publishedOnly: true });

	// Collect unique tags across all entries
	const allTags = [...new Set(entries.flatMap((e) => e.tags || []))].sort();

	// Featured = most recent (first in desc-sorted list)
	const featured = entries[0] ?? null;
	const remaining = entries.slice(1);

	// Serialise a lightweight summary for the client-side tag filter island
	const clientEntries = entries.map((e) => ({
		slug: e.slug,
		title: e.title,
		publishDate: e.publishDate,
		description: e.description ?? null,
		tags: e.tags ?? [],
		featured: e.featured ?? false,
	}));

	return c.html(
		<Layout
			title="Journal — Robel Estifanos"
			description="Writing on software design, cognitive load, and building durable systems."
			ogUrl="https://robelestifanos.com/journal"
		>
			<div class="h-[100dvh] flex flex-col">
				<header class="shrink-0 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
					<h1
						class="text-2xl sm:text-3xl text-th-text mb-6"
						style="font-family: var(--font-display);"
					>
						Journal
					</h1>
				</header>

				{/* Tag filter island mount + SSR fallback content.
				    When React mounts via createRoot, it replaces the inner HTML. */}
				<main
					id="tag-filter"
					class="flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6"
					data-tags={JSON.stringify(allTags)}
					data-entries={JSON.stringify(clientEntries)}
				>
					{entries.length > 0 ? (
						<>
							{/* Featured entry */}
							{featured && (
								<article class="shrink-0 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-th-border">
									<a href={`/journal/${featured.slug}`} class="group block">
										<span class="text-[0.625rem] uppercase tracking-widest text-th-muted mb-3 block">
											Latest
										</span>
										<h2
											class="text-xl sm:text-2xl text-th-text group-hover:text-th-accent transition-colors mb-2"
											style="font-family: var(--font-display);"
										>
											{featured.title}
										</h2>
										<time
											datetime={featured.publishDate}
											class="text-xs text-th-muted mb-4 block"
										>
											{formatDate(featured.publishDate)}
										</time>
										{featured.description && (
											<p
												class="text-sm text-th-subtle leading-relaxed max-w-xl"
												style="font-family: var(--font-display);"
											>
												{featured.description}
											</p>
										)}
									</a>
								</article>
							)}

							{/* Archive list */}
							{remaining.length > 0 && (
								<section class="flex-1 min-h-0 flex flex-col">
									<h2 class="shrink-0 text-[0.625rem] uppercase tracking-widest text-th-muted mb-4">
										Archive
									</h2>
									<div class="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-4">
										<ul class="space-y-0">
											{remaining.map((entry) => (
												<li>
													<a
														href={`/journal/${entry.slug}`}
														class="group flex items-baseline justify-between gap-4 py-3 border-b border-th-border/50 hover:border-th-accent transition-colors"
													>
														<div class="flex items-baseline gap-4 min-w-0">
															<time
																datetime={entry.publishDate}
																class="text-xs text-th-muted tabular-nums shrink-0 whitespace-nowrap"
															>
																{formatDate(entry.publishDate)}
															</time>
															<h3
																class="text-sm text-th-text group-hover:text-th-accent transition-colors truncate"
																style="font-family: var(--font-display);"
															>
																{entry.title}
															</h3>
														</div>
														<span
															class="text-th-muted group-hover:text-th-accent transition-all opacity-0 group-hover:opacity-100 text-xs -translate-x-1 group-hover:translate-x-0"
															aria-hidden="true"
														>
															→
														</span>
													</a>
												</li>
											))}
										</ul>
									</div>
								</section>
							)}
						</>
					) : (
						<p class="text-th-muted text-sm">No entries yet.</p>
					)}
				</main>

				<Footer />
			</div>
		</Layout>,
	);
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /journal/:slug — Journal detail page
// ═══════════════════════════════════════════════════════════════════════════
app.get(
	'/journal/:slug',
	ssgParams(async () => {
		const slugs = await convex.query(api.journal.listSlugs, {});
		return slugs.map((slug) => ({ slug }));
	}),
	async (c) => {
		const slug = c.req.param('slug');
		const entry = await convex.query(api.journal.getBySlug, { slug });

		if (!entry) {
			return c.html(
				<Layout title="Not Found — Robel Estifanos" ogUrl={`https://robelestifanos.com/journal/${slug}`}>
					<div class="min-h-screen">
						<main class="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
							<div class="text-center py-12">
								<p class="text-th-muted mb-4 text-sm">Entry not found.</p>
								<a href="/" class="text-th-accent hover:underline text-sm">
									Return home
								</a>
							</div>
						</main>
						<Footer />
					</div>
				</Layout>,
				404,
			);
		}

		const renderedContent = renderMarkdown(entry.content);

		return c.html(
			<Layout
				title={`${entry.title} — Robel Estifanos`}
				description={entry.description || entry.title}
				ogUrl={`https://robelestifanos.com/journal/${entry.slug}`}
				ogType="article"
			>
				<div class="min-h-screen">
					<main class="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
						{/* Header */}
						<header class="mb-8 sm:mb-10 max-w-2xl">
							<h1
								class="text-lg sm:text-xl md:text-2xl text-th-text mb-3 sm:mb-4 leading-tight"
								style="font-family: 'Crimson Pro', Georgia, serif;"
							>
								{entry.title}
							</h1>

							{/* Tags */}
							{entry.tags && entry.tags.length > 0 && (
								<div class="flex flex-wrap items-center gap-2 mb-3">
									{entry.tags.map((tag) => (
										<a
											href={`/journal?tags=${encodeURIComponent(tag)}`}
											class="tag-link"
										>
											{tag}
										</a>
									))}
								</div>
							)}

							{/* Meta row: date · file size · PDF download */}
							<div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-th-muted">
								<time datetime={entry.publishDate} class="uppercase tracking-wide">
									{formatDate(entry.publishDate)}
								</time>

								{entry.fileSize && (
									<>
										<span class="text-th-border" aria-hidden="true">
											·
										</span>
										<span>{formatFileSize(entry.fileSize)}</span>
									</>
								)}

								<span class="text-th-border" aria-hidden="true">
									·
								</span>
								<a
									href={entry.pdfUrl}
									download
									class="inline-flex items-center gap-1.5 text-th-accent hover:text-th-accent-hover transition-colors"
									aria-label={`Download PDF version of ${entry.title}`}
								>
									{/* Inline download icon (no Lucide dependency) */}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="7 10 12 15 17 10" />
										<line x1="12" y1="15" x2="12" y2="3" />
									</svg>
									<span>PDF</span>
								</a>
							</div>

							{/* Description */}
							{entry.description && (
								<p
									class="text-th-subtle mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed"
									style="font-family: 'Crimson Pro', Georgia, serif; font-style: italic;"
								>
									{entry.description}
								</p>
							)}
						</header>

						{/* Article body */}
						<article
							class="typst-content"
							dangerouslySetInnerHTML={{ __html: renderedContent }}
						/>
					</main>

					<Footer />
				</div>
			</Layout>,
		);
	},
);

export default app;
