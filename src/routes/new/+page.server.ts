import { redirect } from '@sveltejs/kit';

export function load({ locals, url }) {
	if (!locals.accountId) redirect(303, '/welcome');
	return { preselect: url.searchParams.get('category') };
}
