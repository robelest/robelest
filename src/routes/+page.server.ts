import type { PageServerLoad } from './$types.js';

export const load = (async ({ setHeaders }) => {
	setHeaders({
		'cache-control': 'public, max-age=60, s-maxage=300'
	});

	return {};
}) satisfies PageServerLoad;
