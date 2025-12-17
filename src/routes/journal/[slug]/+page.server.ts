import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../convex/_generated/api.js';
import { error } from '@sveltejs/kit';

export const load = (async ({ params, setHeaders }) => {
	// Cache journal entries for 5 minutes
	setHeaders({
		'cache-control': 'public, max-age=300, s-maxage=600'
	});

	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const entry = await client.query(api.journal.getBySlug, { slug: params.slug });

	if (!entry) {
		error(404, 'Entry not found');
	}

	return { entry };
}) satisfies PageServerLoad;
