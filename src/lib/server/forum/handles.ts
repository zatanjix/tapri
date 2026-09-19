import { hmac } from '../crypto/encoding';

export const ADJECTIVES = [
	'Quiet', 'Amber', 'Slow', 'Grey', 'Pale', 'Bright', 'Still', 'Gentle', 'Calm', 'Brave', 'Clever', 'Curious',
	'Dusty', 'Early', 'Fuzzy', 'Golden', 'Hidden', 'Humble', 'Jolly', 'Kind', 'Lucky', 'Mellow', 'Misty', 'Nimble',
	'Patient', 'Plucky', 'Proud', 'Rapid', 'Rosy', 'Rustic', 'Shy', 'Silver', 'Sleepy', 'Snowy', 'Soft', 'Steady',
	'Sunny', 'Swift', 'Tidy', 'Tiny', 'Velvet', 'Warm', 'Wild', 'Wise', 'Witty', 'Young', 'Zesty', 'Cosy',
	'Breezy', 'Crisp', 'Dapper', 'Eager', 'Fancy', 'Frosty', 'Glad', 'Hazy', 'Lively', 'Merry', 'Noble', 'Polite',
	'Quick', 'Sturdy', 'Honest', 'Loyal'
];

export const ANIMALS = [
	'Heron', 'Finch', 'Otter', 'Wren', 'Moth', 'Kite', 'Carp', 'Owl', 'Sparrow', 'Myna', 'Parrot', 'Peacock',
	'Kingfisher', 'Hornbill', 'Egret', 'Crane', 'Robin', 'Bulbul', 'Koel', 'Pigeon', 'Crow', 'Squirrel', 'Mongoose',
	'Tortoise', 'Turtle', 'Gecko', 'Frog', 'Toad', 'Rabbit', 'Hare', 'Deer', 'Fox', 'Wolf', 'Bear', 'Panda', 'Tiger',
	'Lion', 'Leopard', 'Lynx', 'Badger', 'Beaver', 'Hedgehog', 'Mole', 'Bat', 'Dolphin', 'Whale', 'Seal', 'Crab',
	'Snail', 'Bee', 'Ant', 'Beetle', 'Butterfly', 'Dragonfly', 'Firefly', 'Ladybird', 'Lizard', 'Koala', 'Llama',
	'Yak', 'Camel', 'Goat', 'Buffalo', 'Elephant'
];

/** Derived, never stored: the same account gets a different name in every thread. */
export function baseHandle(key: Uint8Array, accountId: string, postId: number | string): string {
	const h = hmac(key, `${accountId}:${postId}`);
	return `${ADJECTIVES[h[0] % 64]} ${ANIMALS[h[1] % 64]}`;
}

/** Assigns names in order of first appearance; a repeated base name gets " 2", " 3", ... */
export class ThreadHandles {
	private byAccount = new Map<string, string>();
	private seen = new Map<string, number>();

	constructor(
		private key: Uint8Array,
		private postId: number | string
	) {}

	for(accountId: string): string {
		const known = this.byAccount.get(accountId);
		if (known) return known;
		const base = baseHandle(this.key, accountId, this.postId);
		const n = (this.seen.get(base) ?? 0) + 1;
		this.seen.set(base, n);
		const name = n === 1 ? base : `${base} ${n}`;
		this.byAccount.set(accountId, name);
		return name;
	}
}
