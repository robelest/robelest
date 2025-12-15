import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

export const upsert = mutation({
	args: {
		slug: v.string(),
		title: v.string(),
		description: v.optional(v.string()),
		content: v.string(), // Markdown content
		pdfStorageId: v.id("_storage"),
		publishDate: v.string(),
		published: v.boolean(),
		featured: v.optional(v.boolean()),
		tags: v.optional(v.array(v.string())),
		category: v.optional(v.string()),
		pageCount: v.optional(v.number()),
		fileSize: v.optional(v.number()),
		contentHash: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("journal")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();

		const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId);
		if (!pdfUrl) throw new Error("Failed to get PDF URL");

		const data = {
			...args,
			pdfUrl,
			lastSyncedAt: new Date().toISOString(),
		};

		if (existing) {
			// Delete old PDF if storage ID changed
			if (existing.pdfStorageId !== args.pdfStorageId) {
				await ctx.storage.delete(existing.pdfStorageId);
			}
			await ctx.db.patch(existing._id, data);
			return { action: "updated" as const, id: existing._id };
		} else {
			const id = await ctx.db.insert("journal", data);
			return { action: "created" as const, id };
		}
	},
});

export const remove = mutation({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const entry = await ctx.db
			.query("journal")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();

		if (entry) {
			await ctx.storage.delete(entry.pdfStorageId);
			await ctx.db.delete(entry._id);
			return { action: "deleted" as const, id: entry._id };
		}
		return { action: "not_found" as const };
	},
});

export const list = query({
	args: { publishedOnly: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		if (args.publishedOnly) {
			return await ctx.db
				.query("journal")
				.withIndex("by_published", (q) => q.eq("published", true))
				.order("desc")
				.collect();
		}
		return await ctx.db.query("journal").order("desc").collect();
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("journal")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();
	},
});

export const listSlugs = query({
	args: {},
	handler: async (ctx) => {
		const entries = await ctx.db.query("journal").collect();
		return entries.map((e) => e.slug);
	},
});
