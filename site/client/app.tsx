import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { UpdateBanner } from "@convex-dev/self-hosting/react";
import { api } from "../../convex/_generated/api.js";

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

	// Mount UpdateBanner into #react-root when we have a Convex connection
	const reactRoot = document.getElementById("react-root");
	if (reactRoot && convexUrl) {
		const convex = new ConvexReactClient(convexUrl);
		const root = ReactDOM.createRoot(reactRoot);
		root.render(
			<ConvexProvider client={convex}>
				<UpdateBanner
					getCurrentDeployment={
						(api as any).staticHosting.getCurrentDeployment
					}
				/>
			</ConvexProvider>,
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

		const root = ReactDOM.createRoot(tagFilterEl);
		root.render(<TagFilter allTags={tags} entries={entries} />);
	}
}

main();
