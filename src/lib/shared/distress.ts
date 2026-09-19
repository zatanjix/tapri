/** Shows support resources; never blocks or hides anything. False positives are acceptable. */
const PATTERNS = [
	/\b(kill|hurt|harm)(ing)?\s+my\s*self\b/i,
	/\bself[-\s]?harm/i,
	/\bsuicid/i,
	/\bwant(ed)?\s+to\s+die\b/i,
	/\b(don'?t|do not)\s+want\s+to\s+(live|wake up|be alive|exist)\b/i,
	/\bno\s+(point|reason)\s+(in\s+)?(living|going on|to live)\b/i,
	/\bcan'?t\s+(go on|do this anymore|take (it|this) anymore)\b/i,
	/\bend(ing)?\s+(it\s+all|my\s+life)\b/i,
	/\bbetter\s+off\s+(dead|without me)\b/i
];

export const showsDistress = (text: string): boolean => PATTERNS.some((p) => p.test(text));
