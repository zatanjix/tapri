const IITB = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)*iitb\.ac\.in$/;

/** Returns the lowercased address if it is on iitb.ac.in or a subdomain, else null. */
export function normalizeEmail(raw: string): string | null {
	const email = raw.trim().toLowerCase();
	return email.length <= 254 && IITB.test(email) ? email : null;
}
