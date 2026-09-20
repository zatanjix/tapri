import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fail, readJson, requireAccount } from '$lib/server/http';

export async function POST({ locals, request }) {
	const accountId = requireAccount(locals);
	if (!accountId) return fail('unauthorized');
	const body = await readJson(request);
	const type = body?.targetType;
	const id = body?.targetId;
	if ((type !== 'post' && type !== 'reply') || typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
		return fail('bad_request');
	if (typeof body?.reason !== 'string') return fail('bad_request');
	const note = typeof body?.note === 'string' ? body.note : '';

	const result = await (await getApp()).reports.create(accountId, { targetType: type, targetId: id, reason: body.reason, note });
	return result.ok ? json({ ok: true }) : fail(result.error);
}
