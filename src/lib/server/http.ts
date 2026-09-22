import { json } from '@sveltejs/kit';

const STATUS: Record<string, number> = {
	invalid_email: 400,
	invalid_token: 400,
	invalid_secret: 400,
	wrong_code: 400,
	bad_request: 400,
	unauthorized: 401,
	wrong_key: 409,
	already_claimed: 409,
	already_spent: 409,
	secret_taken: 409,
	no_account: 404,
	expired: 410,
	too_many_attempts: 429,
	rate_limited: 429,
	mail_failed: 502,
	unavailable: 503,
	already_reported: 409,
	not_allowed: 403,
	not_found: 404,
	too_deep: 400,
	unknown_category: 400,
	invalid_kind: 400,
	invalid_title: 400,
	invalid_body: 400,
	too_many: 409,
	too_many_images: 400,
	invalid_image: 400,
	images_unavailable: 503,
	too_large: 413
};

export const statusFor = (error: string): number => STATUS[error] ?? 400;

export const fail = (error: string) => json({ error }, { status: statusFor(error) });

const MAX_FIELD = 4096;

/** Parses a JSON body whose listed fields must all be non-empty strings of bounded length. */
export async function readBody<K extends string>(request: Request, fields: readonly K[]): Promise<Record<K, string> | null> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return null;
	}
	if (!body || typeof body !== 'object') return null;
	const out = {} as Record<K, string>;
	for (const f of fields) {
		const v = (body as Record<string, unknown>)[f];
		if (typeof v !== 'string' || v.length === 0 || v.length > MAX_FIELD) return null;
		out[f] = v;
	}
	return out;
}

export const requireAccount = (locals: { accountId: string | null }): string | null => locals.accountId;

export function idParam(raw: string): number | null {
	return /^[1-9]\d{0,15}$/.test(raw) ? Number(raw) : null;
}

/** Parses a JSON object body, or null. For bodies with optional or non-string fields. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
	try {
		const body = await request.json();
		return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}
