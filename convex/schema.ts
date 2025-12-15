import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	journal: defineTable({
		title: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
		content: v.string(), // Markdown content
		pdfStorageId: v.id("_storage"),
		pdfUrl: v.string(),
		publishDate: v.string(),
		published: v.boolean(),
		featured: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
		category: v.optional(v.string()),
		pageCount: v.optional(v.number()),
		fileSize: v.optional(v.number()),
		contentHash: v.optional(v.string()),
		lastSyncedAt: v.optional(v.string()),
	})
		.index("by_slug", ["slug"])
		.index("by_published", ["published", "publishDate"])
		.index("by_category", ["category", "publishDate"]),
});
