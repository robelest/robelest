import { httpRouter } from "convex/server";
import { getMimeType } from "@convex-dev/self-hosting";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Custom static file handler with directory URL resolution.
 *
 * The default `registerStaticRoutes` from @convex-dev/self-hosting only does:
 *   1. Exact path match
 *   2. SPA fallback (no extension → /index.html)
 *
 * This handler adds multi-page SSG support by trying:
 *   1. Exact path (e.g., /journal.html)
 *   2. /path/index.html (e.g., /journal → /journal/index.html)
 *   3. /path.html (e.g., /journal → /journal.html)
 *   4. 404
 *
 * This is necessary because Hono's toSSG produces flat files:
 *   /journal → journal.html (not journal/index.html)
 */
const serveStaticFile = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	let path = url.pathname;

	// Normalize root
	if (path === "" || path === "/") {
		path = "/index.html";
	}

	// Helper to look up an asset from the self-hosting component
	const getAsset = async (assetPath: string) => {
		return await ctx.runQuery(components.selfHosting.lib.getByPath, {
			path: assetPath,
		});
	};

	// Try resolution chain
	let asset = await getAsset(path);

	// If no exact match and path has no file extension, try directory patterns
	if (!asset && !hasFileExtension(path)) {
		// Try /path/index.html
		asset = await getAsset(`${path}/index.html`);
		// Try /path.html
		if (!asset) {
			asset = await getAsset(`${path}.html`);
		}
	}

	// 404
	if (!asset) {
		return new Response("Not Found", {
			status: 404,
			headers: { "Content-Type": "text/plain" },
		});
	}

	// ETag / conditional request
	const etag = `"${asset.storageId}"`;
	const ifNoneMatch = request.headers.get("If-None-Match");
	if (ifNoneMatch === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				ETag: etag,
				"Cache-Control": isHashedAsset(path)
					? "public, max-age=31536000, immutable"
					: "public, max-age=0, must-revalidate",
			},
		});
	}

	// Serve from Convex storage
	const blob = await ctx.storage.get(asset.storageId);
	if (!blob) {
		return new Response("Storage error", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});
	}

	const cacheControl = isHashedAsset(path)
		? "public, max-age=31536000, immutable"
		: "public, max-age=0, must-revalidate";

	return new Response(blob, {
		status: 200,
		headers: {
			"Content-Type": asset.contentType || getMimeType(path),
			"Cache-Control": cacheControl,
			ETag: etag,
			"X-Content-Type-Options": "nosniff",
		},
	});
});

function hasFileExtension(path: string): boolean {
	const lastSegment = path.split("/").pop() || "";
	return lastSegment.includes(".") && !lastSegment.startsWith(".");
}

function isHashedAsset(path: string): boolean {
	return /[-.][\dA-Za-z_]{6,12}\.[a-z]+$/.test(path);
}

// Catch-all route for all GET requests
http.route({
	pathPrefix: "/",
	method: "GET",
	handler: serveStaticFile,
});

export default http;
