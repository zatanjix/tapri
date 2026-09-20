import { json } from '@sveltejs/kit';
import { getApp } from '$lib/server/app';
import { fromB64u } from '$lib/server/crypto/encoding';
import { MailError } from '$lib/server/mail/mailer';
import { fail, readBody } from '$lib/server/http';

export async function POST({ request, getClientAddress }) {
	const app = await getApp();
	if (!app.limits.verifyStart.take(app.ipKeyer.keyFor(getClientAddress()))) return fail('rate_limited');
	const body = await readBody(request, ['email', 'blindedMsg', 'keyId'] as const);
	if (!body) return fail('bad_request');
	try {
		const result = await app.verify.start(body.email, fromB64u(body.blindedMsg), body.keyId);
		return result.ok ? json({ pendingId: result.pendingId }) : fail(result.error);
	} catch (e) {
		const mail = e instanceof MailError;
		console.error(mail ? 'mail send failed' : 'verification failed', e instanceof Error ? e.message : e);
		return fail(mail ? 'mail_failed' : 'unavailable');
	}
}
