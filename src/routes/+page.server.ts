import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api.js';

export const load = (async ({ setHeaders }) => {
	// Cache the page for 60 seconds, stale-while-revalidate for 5 minutes
	setHeaders({
		'cache-control': 'public, max-age=60, s-maxage=300'
	});

	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const journalEntries = await client.query(api.journal.list, { publishedOnly: true });

	return {
		journalEntries
	};
}) satisfies PageServerLoad;
