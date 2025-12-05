import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
	args: { publishedOnly: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		if (args.publishedOnly) {
			return await ctx.db
				.query("posts")
				.withIndex("by_published", (q) => q.eq("published", true))
				.order("desc")
				.collect();
		}
		return await ctx.db.query("posts").order("desc").collect();
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("posts")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();
	},
});
