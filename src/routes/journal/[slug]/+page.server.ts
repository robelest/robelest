import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad, EntryGenerator } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../convex/_generated/api.js';
import { error } from '@sveltejs/kit';

// Enumerate all slugs at build time for adapter-static prerendering
export const entries: EntryGenerator = async () => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const slugs = await client.query(api.journal.listSlugs, {});
	return slugs.map((slug: string) => ({ slug }));
};

export const load = (async ({ params }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const entry = await client.query(api.journal.getBySlug, { slug: params.slug });

	if (!entry) {
		error(404, 'Entry not found');
	}

	return { entry };
}) satisfies PageServerLoad;
