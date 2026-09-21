import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { FeedService, HIT_END, HIT_START } from '../../src/lib/server/forum/feed';
import { PostService } from '../../src/lib/server/forum/posts';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let posts: PostService;
let feed: FeedService;
const key = randomBytes(32);

beforeAll(async () => {
	sql = await freshDb();
	posts = new PostService({ sql, handleKey: key });
	feed = new FeedService({ sql, handleKey: key });
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
});

async function post(title: string, body: string) {
	const r = await posts.createPost(await makeAccount(sql), { category: 'hostel-mess', kind: 'grievance', title, body });
	if (!r.ok) throw new Error(r.error);
	return r.id;
}

describe('FeedService.search', () => {
	it('finds words in titles and bodies, including other word forms', async () => {
		const wifi = await post('WiFi drops every night', 'Complaint raised three times.');
		await post('Mess timings', 'Breakfast closes too early.');
		expect((await feed.search('wifi')).map((r) => r.id)).toEqual([wifi]);
		expect((await feed.search('complaints')).map((r) => r.id)).toEqual([wifi]);
	});

	it('ranks title matches above body matches', async () => {
		const inBody = await post('Water cooler broken', 'Also the mess food is cold.');
		const inTitle = await post('Mess food is cold', 'Every single day.');
		expect((await feed.search('mess food')).map((r) => r.id)).toEqual([inTitle, inBody]);
	});

	it('supports quoted phrases and exclusions', async () => {
		const a = await post('Mess food quality', 'Terrible.');
		const b = await post('Food in the mess hall', 'Also bad, and the wifi too.');
		expect((await feed.search('"mess food"')).map((r) => r.id)).toEqual([a]);
		expect((await feed.search('food -wifi')).map((r) => r.id)).toEqual([a]);
		expect((await feed.search('food')).map((r) => r.id).sort()).toEqual([a, b].sort());
	});

	it('marks the matching words for highlighting', async () => {
		await post('Laundry machines broken', 'The laundry room has been closed for a week.');
		const [hit] = await feed.search('laundry');
		expect(hit.titleMarked).toContain(`${HIT_START}Laundry${HIT_END}`);
		expect(hit.excerptMarked).toContain(`${HIT_START}laundry${HIT_END}`);
	});

	it('skips deleted and removed posts', async () => {
		const gone = await post('Hidden post about lifts', 'Lifts.');
		const removed = await post('Removed post about lifts', 'Lifts.');
		const kept = await post('Visible post about lifts', 'Lifts.');
		await sql`update posts set status = 'deleted', title = '', body = '' where id = ${gone}`;
		await sql`update posts set status = 'removed' where id = ${removed}`;
		expect((await feed.search('lifts')).map((r) => r.id)).toEqual([kept]);
	});

	it('returns nothing for empty, tiny or absurd queries, and never exposes accounts', async () => {
		await post('Something about exams', 'Exams.');
		expect(await feed.search('')).toEqual([]);
		expect(await feed.search('a')).toEqual([]);
		expect(await feed.search('x'.repeat(201))).toEqual([]);
		expect(await feed.search('!!! &&& |||')).toEqual([]);
		const accounts = await sql`select id from accounts`;
		const json = JSON.stringify(await feed.search('exams'));
		for (const a of accounts) expect(json).not.toContain(a.id);
	});
});
