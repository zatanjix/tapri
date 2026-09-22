import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, readJson, requireAccount } from '$lib/server/http';
import { IMAGE_LIMITS } from '$lib/server/images/process';

const FIELDS = ['category', 'kind', 'title', 'body'] as const;
type Fields = Record<(typeof FIELDS)[number], string>;

/** JSON for text-only posts; multipart form data when photos are attached (field `images`). */
async function readPost(request: Request): Promise<{ fields: Fields; images: Uint8Array[] } | 'too_large' | null> {
	if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
		const body = await readJson(request);
		if (!body || FIELDS.some((f) => typeof body[f] !== 'string')) return null;
		return { fields: body as Fields, images: [] };
	}
	if (Number(request.headers.get('content-length') ?? Infinity) > IMAGE_LIMITS.maxRequestBytes) return 'too_large';
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return null;
	}
	const fields = Object.fromEntries(FIELDS.map((f) => [f, form.get(f)]));
	if (FIELDS.some((f) => typeof fields[f] !== 'string')) return null;
	const files = form.getAll('images');
	if (files.some((f) => !(f instanceof File))) return null;
	const images = await Promise.all((files as File[]).map(async (f) => new Uint8Array(await f.arrayBuffer())));
	return { fields: fields as Fields, images };
}

export async function POST({ locals, request }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const app = await getApp();
	const parsed = await readPost(request);
	if (parsed === 'too_large') return fail('too_large');
	if (!parsed) return fail('bad_request');
	let result;
	try {
		result = await app.posts.createPost(accountId, parsed.fields, parsed.images);
	} catch {
		// Image storage was unreachable; nothing was posted and any stored files were removed.
		return fail('unavailable');
	}
	return result.ok ? json({ id: result.id }, { status: 201 }) : fail(result.error);
}
