export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** JSON fetch to Tapri's own API. Never throws: network failures come back as `error: 'network'`. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
	try {
		const res = await fetch(path, {
			method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
			headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
			body: init.body === undefined ? undefined : JSON.stringify(init.body)
		});
		const data = await res.json().catch(() => ({}));
		return res.ok ? { ok: true, data: data as T } : { ok: false, status: res.status, error: data.error ?? 'unknown' };
	} catch {
		return { ok: false, status: 0, error: 'network' };
	}
}

export const toB64u = (bytes: Uint8Array): string =>
	btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function fromB64u(text: string): Uint8Array<ArrayBuffer> {
	const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}
