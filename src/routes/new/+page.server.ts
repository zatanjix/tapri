import { redirect } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';

export async function load({ locals, url }) {
	if (!locals.accountId) redirect(303, '/welcome');
	return { preselect: url.searchParams.get('category'), imagesEnabled: (await getApp()).images !== null };
}
