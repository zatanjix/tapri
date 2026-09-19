import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, requireAccount } from '$lib/server/http';

export async function GET({ locals }) {
	if (!requireAccount(locals)) return fail('unauthorized');
	return json({ items: await (await getApp()).feed.mostAffected() });
}
