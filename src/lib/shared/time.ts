const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now", "5m", "3h", "2d", then "3 Sep". Uses UTC so server and browser agree. */
export function timeAgo(iso: string, now: number = Date.now()): string {
	const then = Date.parse(iso);
	const s = Math.floor((now - then) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)}m`;
	if (s < 86_400) return `${Math.floor(s / 3600)}h`;
	if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d`;
	const d = new Date(then);
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
