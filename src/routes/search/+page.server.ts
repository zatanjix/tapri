import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
	if (!locals.accountId) redirect(303, '/welcome');
}
