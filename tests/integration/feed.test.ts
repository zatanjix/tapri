import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { FeedService } from '../../src/lib/server/forum/feed';
import { PostService, SYSTEM_ACCOUNT_ID } from '../../src/lib/server/forum/posts';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let posts: PostService;
let feed: FeedService;
let alice: string;
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
	alice = await makeAccount(sql);
});

async function post(title: string, extra: Partial<{ category: string; kind: string; body: string }> = {}) {
	const r = await posts.createPost(alice, { category: 'academics', kind: 'grievance', body: 'Details here.', title, ...extra });
	if (!r.ok) throw new Error(r.error);
	return r.id;
}

describe('FeedService', () => {
	it('lists categories in order', async () => {
		expect((await feed.categories()).map((c) => c.slug)[0]).toBe('academics');
	});

	it('filters by tab and category', async () => {
		const g = await post('A grievance here');
		const c = await post('A conversation here', { kind: 'conversation', category: 'wellbeing' });
		await posts.createReply(alice, g, { body: 'reply' });

		const ids = async (q: Parameters<FeedService['list']>[0]) => (await feed.list(q)).map((i) => i.id);
		expect(await ids({ tab: 'grievances', sort: 'new' })).toEqual([g]);
		expect(await ids({ tab: 'conversations', sort: 'new' })).toEqual([c]);
		expect(await ids({ tab: 'unanswered', sort: 'new' })).toEqual([c]);
		expect(await ids({ tab: 'all', sort: 'new', category: 'wellbeing' })).toEqual([c]);
	});

	it('sorts by new, affected and hot', async () => {
		const old = await post('Old but widespread');
		const recent = await post('Recent and small');
		await sql`update posts set published_on = now() - interval '3 days', metoo = 50 where id = ${old}`;
		await sql`update posts set metoo = 2 where id = ${recent}`;
		expect((await feed.list({ tab: 'all', sort: 'new' }))[0].id).toBe(recent);
		expect((await feed.list({ tab: 'all', sort: 'affected' }))[0].id).toBe(old);
		expect((await feed.list({ tab: 'all', sort: 'hot' }))[0].id).toBe(recent);
	});

	it('excludes deleted posts and never exposes account ids', async () => {
		const gone = await post('To be deleted');
		await post('Stays visible', { body: 'x'.repeat(400) });
		await posts.deletePost(alice, gone);
		const items = await feed.list({ tab: 'all', sort: 'new' });
		expect(items.map((i) => i.title)).toEqual(['Stays visible']);
		expect(items[0].excerpt.length).toBeLessThanOrEqual(281);
		expect(JSON.stringify(items)).not.toContain(alice);
	});

	it('uses the same handle for the author as the thread does', async () => {
		const id = await post('Handle check');
		const [item] = await feed.list({ tab: 'all', sort: 'new' });
		const thread = await posts.getThread(alice, id);
		expect(item.handle).toBe(thread!.post.handle);
	});

	it('ranks the most affected grievances of the past week', async () => {
		const a = await post('Mess food');
		const b = await post('Old issue');
		await post('A conversation', { kind: 'conversation' });
		await sql`update posts set metoo = 30 where id = ${a}`;
		await sql`update posts set metoo = 99, published_on = now() - interval '10 days' where id = ${b}`;
		expect((await feed.mostAffected()).map((i) => i.id)).toEqual([a]);
	});

	it('pages', async () => {
		for (let i = 0; i < 25; i++) {
			if (i % 5 === 0) alice = await makeAccount(sql); // stay under the hourly post limit
			await post(`Post number ${i}`);
		}
		expect(await feed.list({ tab: 'all', sort: 'new', page: 1 })).toHaveLength(20);
		expect(await feed.list({ tab: 'all', sort: 'new', page: 2 })).toHaveLength(5);
	});
});

describe('FeedService sort orders', () => {
	it('sorts oldest first and by top score', async () => {
		const first = await post('First post ever');
		const second = await post('Second post here');
		const third = await post('Third post later');
		await sql`update posts set published_on = now() - interval '3 hours' where id = ${first}`;
		await sql`update posts set published_on = now() - interval '2 hours', upvotes = 5, downvotes = 1 where id = ${second}`;
		await sql`update posts set published_on = now() - interval '1 hour', upvotes = 2 where id = ${third}`;
		expect((await feed.list({ tab: 'all', sort: 'old' })).map((i) => i.id)).toEqual([first, second, third]);
		expect((await feed.list({ tab: 'all', sort: 'new' })).map((i) => i.id)).toEqual([third, second, first]);
		expect((await feed.list({ tab: 'all', sort: 'top' })).map((i) => i.id)).toEqual([second, third, first]);
	});

	it('shows markdown posts as plain words in excerpts', async () => {
		await post('Formatted post', { body: '**Mess** food is [bad](https://example.org) $x^2$' });
		expect((await feed.list({ tab: 'all', sort: 'new' }))[0].excerpt).toBe('Mess food is bad x^2');
	});

	it('pins the two latest official posts from the last 14 days', async () => {
		await sql`
			insert into accounts (id, secret_hash, valid_until) values (${SYSTEM_ACCOUNT_ID}, decode(repeat('00', 32), 'hex'), '9999-12-31')
			on conflict (id) do nothing`;
		const official = async (title: string, category = 'general') => {
			const r = await posts.createOfficialPost({ category, title, body: 'From Tapri.' });
			if (!r.ok) throw new Error(r.error);
			return r.id;
		};
		const old = await official('An old announcement');
		await sql`update posts set published_on = now() - interval '15 days' where id = ${old}`;
		const a = await official('Photos are here');
		const b = await official('Markdown is here', 'feedback');
		const c = await official('Follow threads');
		expect((await feed.pinned()).map((i) => i.id)).toEqual([c, b]);
		expect((await feed.pinned('feedback')).map((i) => i.id)).toEqual([b]);
		await sql`update posts set status = 'removed' where id = ${c}`;
		expect((await feed.pinned()).map((i) => i.id)).toEqual([b, a]);
	});

	it('leaves out pinned posts from the list below', async () => {
		const x = await post('Stays in the list');
		const y = await post('Pinned above instead');
		expect((await feed.list({ tab: 'all', sort: 'new', exclude: [y] })).map((i) => i.id)).toEqual([x]);
	});
});
