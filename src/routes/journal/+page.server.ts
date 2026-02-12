import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api.js';

export const load = (async () => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	const journalEntries = await client.query(api.journal.list, { publishedOnly: true });

	return {
		journalEntries
	};
}) satisfies PageServerLoad;
