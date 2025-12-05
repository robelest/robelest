import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	posts: defineTable({
		title: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
		content: v.string(),
		publishDate: v.string(),
		published: v.boolean(),
		featured: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
	})
		.index("by_slug", ["slug"])
		.index("by_published", ["published", "publishDate"]),
});
