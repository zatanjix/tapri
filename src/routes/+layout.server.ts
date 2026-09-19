import { getApp } from '$lib/server/app';

export async function load({ locals }) {
	const signedIn = Boolean(locals.accountId);
	return {
		signedIn,
		categories: signedIn ? await (await getApp()).feed.categories() : [],
		sourceUrl: process.env.SOURCE_URL ?? null
	};
}
