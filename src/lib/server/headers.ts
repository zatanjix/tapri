const HEADERS: Record<string, string> = {
	// Nothing is sent to other sites. Same-origin is kept because browsers blank the Origin
	// header of form posts under 'no-referrer', which breaks CSRF protection.
	'referrer-policy': 'same-origin',
	'x-content-type-options': 'nosniff',
	'x-robots-tag': 'noindex, nofollow',
	'x-frame-options': 'DENY',
	'cross-origin-opener-policy': 'same-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
};

/** Applied to every response. The Content-Security-Policy is set by SvelteKit (see vite.config.ts). */
export function withSecurityHeaders(response: Response): Response {
	for (const [name, value] of Object.entries(HEADERS)) response.headers.set(name, value);
	return response;
}
