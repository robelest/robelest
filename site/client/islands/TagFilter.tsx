import { createSignal, For, Show } from "solid-js";

// ── Types ───────────────────────────────────────────────────────────────────

interface JournalEntrySummary {
	slug: string;
	title: string;
	description?: string;
	publishDate: string;
	tags?: string[];
	featured?: boolean;
	fileSize?: number;
}

interface TagFilterProps {
	allTags: string[];
	entries: JournalEntrySummary[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert "YYYY-MM-DD" to "MM-DD-YYYY" */
function formatDate(d: string): string {
	const [year, month, day] = d.split("-");
	return `${month}-${day}-${year}`;
}

const displayFont = { "font-family": "var(--font-display)" };

// ── Component ───────────────────────────────────────────────────────────────

export function TagFilter(props: TagFilterProps) {
	const [activeTags, setActiveTags] = createSignal<Set<string>>(new Set());

	const toggleTag = (tag: string) => {
		setActiveTags((prev) => {
			const next = new Set(prev);
			if (next.has(tag)) {
				next.delete(tag);
			} else {
				next.add(tag);
			}
			return next;
		});
	};

	const clearTags = () => setActiveTags(new Set<string>());

	// AND logic: entry must contain ALL selected tags
	const filtered = () => {
		const tags = activeTags();
		if (tags.size === 0) return props.entries;
		return props.entries.filter((entry) =>
			[...tags].every((tag) => entry.tags?.includes(tag)),
		);
	};

	const featured = () => filtered()[0] ?? null;
	const archive = () => filtered().slice(1);

	return (
		<>
			{/* Tag chips */}
			<div class="flex flex-wrap gap-2 mb-8">
				<button
					type="button"
					class={`tag-chip${activeTags().size === 0 ? " active" : ""}`}
					onClick={clearTags}
				>
					All
				</button>
				<For each={props.allTags}>
					{(tag) => (
						<button
							type="button"
							class={`tag-chip${activeTags().has(tag) ? " active" : ""}`}
							onClick={() => toggleTag(tag)}
						>
							{tag}
						</button>
					)}
				</For>
			</div>

			{/* Filtered entries */}
			<Show
				when={filtered().length > 0}
				fallback={
					<p class="text-th-muted text-sm py-8">
						No entries match the selected tags.
					</p>
				}
			>
				{/* Featured / Latest entry */}
				<Show when={featured()}>
					{(entry) => (
						<article class="border-b border-th-border pb-8 mb-8">
							<span
								class="text-[0.625rem] uppercase tracking-[0.1em] text-th-muted"
								style={displayFont}
							>
								Latest
							</span>
							<h2 class="text-2xl mt-2 mb-3" style={displayFont}>
								<a
									href={`/journal/${entry().slug}`}
									class="text-th-text hover:text-th-accent transition-colors"
								>
									{entry().title}
								</a>
							</h2>
							<time
								class="text-xs text-th-muted tracking-wide"
								dateTime={entry().publishDate}
							>
								{formatDate(entry().publishDate)}
							</time>
							<Show when={entry().description}>
								{(desc) => (
									<p class="text-sm text-th-subtle mt-3 leading-relaxed max-w-2xl">
										{desc()}
									</p>
								)}
							</Show>
						</article>
					)}
				</Show>

				{/* Archive list */}
				<Show when={archive().length > 0}>
					<section>
						<h2
							class="text-[0.625rem] uppercase tracking-[0.1em] text-th-muted mb-4"
							style={displayFont}
						>
							Archive
						</h2>
						<ul class="divide-y divide-th-border">
							<For each={archive()}>
								{(entry) => (
									<li>
										<a
											href={`/journal/${entry.slug}`}
											class="flex items-baseline justify-between py-3 group text-th-text hover:text-th-accent transition-colors"
										>
											<time
												class="text-xs text-th-muted w-24 shrink-0 tabular-nums"
												dateTime={entry.publishDate}
											>
												{formatDate(entry.publishDate)}
											</time>
											<h3
												class="text-sm flex-1 group-hover:text-th-accent transition-colors"
												style={displayFont}
											>
												{entry.title}
											</h3>
											<span class="text-th-muted text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
												&rarr;
											</span>
										</a>
									</li>
								)}
							</For>
						</ul>
					</section>
				</Show>
			</Show>
		</>
	);
}
