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
	rate_limited: 429
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
