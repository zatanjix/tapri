import { error } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { IMAGE_ID } from '$lib/server/images/store';

/** Images are members-only, like posts: served here, never from a public storage URL. */
export async function GET({ locals, params }) {
	if (!locals.accountId) error(404, 'Not found');
	if (!IMAGE_ID.test(params.id)) error(404, 'Not found');
	const stream = await (await getApp()).images?.open(params.id);
	if (!stream) error(404, 'Not found');
	return new Response(stream, {
		headers: {
			'content-type': 'image/webp',
			// Kept only in this browser, for a day, so removals take effect for everyone soon after.
			'cache-control': 'private, max-age=86400',
			'content-disposition': 'inline; filename="tapri-photo.webp"'
		}
	});
}
