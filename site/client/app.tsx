import { render } from "solid-js/web";
import { setupConvex, ConvexProvider } from "convex-solidjs";
import { UpdateBanner } from "./islands/UpdateBanner.js";

/**
 * Resolve the Convex deployment URL.
 * 1. Try @convex-dev/self-hosting's getConvexUrl() (works on *.convex.site)
 * 2. Fall back to a <meta name="convex-url"> tag in the HTML
 * 3. Return null if neither is available (dev / plain static hosting)
 */
async function resolveConvexUrl(): Promise<string | null> {
	try {
		const { getConvexUrl } = await import("@convex-dev/self-hosting");
		return getConvexUrl();
	} catch {
		// Not on a .convex.site domain — fall through
	}

	const meta = document.querySelector<HTMLMetaElement>(
		'meta[name="convex-url"]',
	);
	return meta?.content || null;
}

async function main() {
	const convexUrl = await resolveConvexUrl();

	// Mount UpdateBanner into #island-root when we have a Convex connection
	const islandRoot = document.getElementById("island-root");
	if (islandRoot && convexUrl) {
		const client = setupConvex(convexUrl);
		render(
			() => (
				<ConvexProvider client={client}>
					<UpdateBanner />
				</ConvexProvider>
			),
			islandRoot,
		);
	}

	// Lazy-load TagFilter island if the mount point exists on this page
	const tagFilterEl = document.getElementById("tag-filter");
	if (tagFilterEl) {
		const tagsJson = tagFilterEl.getAttribute("data-tags");
		const entriesJson = tagFilterEl.getAttribute("data-entries");

		const { TagFilter } = await import("./islands/TagFilter.js");
		const tags: string[] = JSON.parse(tagsJson || "[]");
		const entries = JSON.parse(entriesJson || "[]");

		render(
			() => <TagFilter allTags={tags} entries={entries} />,
			tagFilterEl,
		);
	}
}

main();
