import { render } from "solid-js/web";
import { setupConvex, ConvexProvider } from "convex-solidjs";
import { UpdateBanner } from "./islands/UpdateBanner.js";

/**
 * Mount a Solid island into a container that may already have SSR content.
 * Replaces all existing children, then lets Solid render into the now-empty
 * container. This is the standard island-hydration handoff pattern.
 */
function mountIsland(container: Element, component: () => any): void {
	container.replaceChildren();
	render(component, container);
}

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

	// Mount UpdateBanner into #island-root when we have a Convex connection.
	// setupConvex is called inside the render callback so its onCleanup
	// registers under a reactive owner (Solid's render root).
	const islandRoot = document.getElementById("island-root");
	if (islandRoot && convexUrl) {
		render(() => {
			const client = setupConvex(convexUrl);
			return (
				<ConvexProvider client={client}>
					<UpdateBanner />
				</ConvexProvider>
			);
		}, islandRoot);
	}

	// Lazy-load TagFilter island if the mount point exists on this page.
	// The SSR content lives inside #tag-filter as a no-JS fallback;
	// mountIsland clears it before Solid renders the interactive version.
	const tagFilterEl = document.getElementById("tag-filter");
	if (tagFilterEl) {
		const tagsJson = tagFilterEl.getAttribute("data-tags");
		const entriesJson = tagFilterEl.getAttribute("data-entries");

		const { TagFilter } = await import("./islands/TagFilter.js");
		const tags: string[] = JSON.parse(tagsJson || "[]");
		const entries = JSON.parse(entriesJson || "[]");

		mountIsland(tagFilterEl, () => (
			<TagFilter allTags={tags} entries={entries} />
		));
	}
}

main();
