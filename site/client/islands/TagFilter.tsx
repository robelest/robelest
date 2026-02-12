import React, { useState, useMemo } from "react";

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

/** Convert "YYYY-MM-DD" → "MM-DD-YYYY" */
function formatDate(d: string): string {
	const [year, month, day] = d.split("-");
	return `${month}-${day}-${year}`;
}

const displayFont: React.CSSProperties = {
	fontFamily: "var(--font-display)",
};

// ── Component ───────────────────────────────────────────────────────────────

export function TagFilter({ allTags, entries }: TagFilterProps) {
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

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

	const clearTags = () => setActiveTags(new Set());

	// AND logic: entry must contain ALL selected tags
	const filtered = useMemo(() => {
		if (activeTags.size === 0) return entries;
		return entries.filter((entry) =>
			[...activeTags].every((tag) => entry.tags?.includes(tag)),
		);
	}, [entries, activeTags]);

	const featured = filtered[0] ?? null;
	const archive = filtered.slice(1);

	return (
		<>
			{/* Tag chips */}
			<div className="flex flex-wrap gap-2 mb-8">
				<button
					type="button"
					className={`tag-chip${activeTags.size === 0 ? " active" : ""}`}
					onClick={clearTags}
				>
					All
				</button>
				{allTags.map((tag) => (
					<button
						type="button"
						key={tag}
						className={`tag-chip${activeTags.has(tag) ? " active" : ""}`}
						onClick={() => toggleTag(tag)}
					>
						{tag}
					</button>
				))}
			</div>

			{/* Filtered entries */}
			{filtered.length === 0 ? (
				<p className="text-th-muted text-sm py-8">
					No entries match the selected tags.
				</p>
			) : (
				<>
					{/* Featured / Latest entry */}
					{featured && (
						<article className="border-b border-th-border pb-8 mb-8">
							<span
								className="text-[0.625rem] uppercase tracking-[0.1em] text-th-muted"
								style={displayFont}
							>
								Latest
							</span>
							<h2 className="text-2xl mt-2 mb-3" style={displayFont}>
								<a
									href={`/journal/${featured.slug}`}
									className="text-th-text hover:text-th-accent transition-colors"
								>
									{featured.title}
								</a>
							</h2>
							<time
								className="text-xs text-th-muted tracking-wide"
								dateTime={featured.publishDate}
							>
								{formatDate(featured.publishDate)}
							</time>
							{featured.description && (
								<p className="text-sm text-th-subtle mt-3 leading-relaxed max-w-2xl">
									{featured.description}
								</p>
							)}
						</article>
					)}

					{/* Archive list */}
					{archive.length > 0 && (
						<section>
							<h2
								className="text-[0.625rem] uppercase tracking-[0.1em] text-th-muted mb-4"
								style={displayFont}
							>
								Archive
							</h2>
							<ul className="divide-y divide-th-border">
								{archive.map((entry) => (
									<li key={entry.slug}>
										<a
											href={`/journal/${entry.slug}`}
											className="flex items-baseline justify-between py-3 group text-th-text hover:text-th-accent transition-colors"
										>
											<time
												className="text-xs text-th-muted w-24 shrink-0 tabular-nums"
												dateTime={entry.publishDate}
											>
												{formatDate(entry.publishDate)}
											</time>
											<h3
												className="text-sm flex-1 group-hover:text-th-accent transition-colors"
												style={displayFont}
											>
												{entry.title}
											</h3>
											<span className="text-th-muted text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
												→
											</span>
										</a>
									</li>
								))}
							</ul>
						</section>
					)}
				</>
			)}
		</>
	);
}
