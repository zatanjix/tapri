import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { FeedService } from '../../src/lib/server/forum/feed';
import { FollowService, MAX_FOLLOWS } from '../../src/lib/server/forum/follows';
import { PostService } from '../../src/lib/server/forum/posts';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let posts: PostService;
let follows: FollowService;
let feed: FeedService;
let alice: string;
let bob: string;
let postId: number;
const key = randomBytes(32);

beforeAll(async () => {
	sql = await freshDb();
	posts = new PostService({ sql, handleKey: key });
	follows = new FollowService(sql);
	feed = new FeedService({ sql, handleKey: key });
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	[alice, bob] = [await makeAccount(sql), await makeAccount(sql)];
	const r = await posts.createPost(alice, { category: 'academics', kind: 'grievance', title: 'Two quizzes on Friday', body: 'Again.' });
	if (!r.ok) throw new Error(r.error);
	postId = r.id;
});

const reply = async (who: string, body = 'same') => {
	const r = await posts.createReply(who, postId, { body });
	if (!r.ok) throw new Error(r.error);
	return r.id;
};
const following = (who: string) => feed.list({ tab: 'following', sort: 'hot', viewerId: who });

describe('FollowService', () => {
	it('toggles a follow on and off', async () => {
		expect(await follows.toggle(bob, postId)).toEqual({ ok: true, active: true });
		expect((await posts.getThread(bob, postId))?.post.following).toBe(true);
		expect(await follows.toggle(bob, postId)).toEqual({ ok: true, active: false });
		expect((await posts.getThread(bob, postId))?.post.following).toBe(false);
	});

	it('refuses missing and deleted posts', async () => {
		expect(await follows.toggle(bob, 999_999)).toEqual({ ok: false, error: 'not_found' });
		await posts.deletePost(alice, postId);
		expect(await follows.toggle(bob, postId)).toEqual({ ok: false, error: 'not_found' });
	});

	it('caps how many threads one account follows by hand', async () => {
		const ids = await sql`
			insert into posts (category_id, account_id, kind, title, body)
			select c.id, ${alice}, 'grievance', 'Filler post', 'x' from categories c, generate_series(1, ${MAX_FOLLOWS})
			where c.slug = 'general' returning id`;
		await sql`insert into follows ${sql(ids.map((r) => ({ account_id: bob, post_id: r.id })))}`;
		expect(await follows.toggle(bob, postId)).toEqual({ ok: false, error: 'too_many' });
	});

	it('follows your own post and threads you reply to', async () => {
		expect((await posts.getThread(alice, postId))?.post.following).toBe(true);
		await reply(bob);
		expect((await posts.getThread(bob, postId))?.post.following).toBe(true);
	});

	it('counts new replies until the thread is opened', async () => {
		await follows.toggle(bob, postId);
		await reply(alice, 'one');
		await reply(alice, 'two');
		expect((await following(bob))[0].newReplies).toBe(2);
		await posts.getThread(bob, postId);
		expect((await following(bob))[0].newReplies).toBe(0);
	});

	it("doesn't count your own reply as new", async () => {
		await reply(bob, 'mine');
		expect((await following(bob))[0].newReplies).toBe(0);
		await reply(alice, 'theirs');
		expect((await following(bob))[0].newReplies).toBe(1);
	});

	it('never counts below zero after replies are deleted', async () => {
		const r = await reply(alice, 'soon gone');
		await follows.toggle(bob, postId);
		await posts.deleteReply(alice, r);
		expect((await following(bob))[0].newReplies).toBe(0);
	});

	it('lists only followed, published posts, most recent activity first', async () => {
		const other = await posts.createPost(alice, { category: 'general', kind: 'conversation', title: 'Another thread', body: 'x' });
		if (!other.ok) throw new Error(other.error);
		await follows.toggle(bob, postId);
		await follows.toggle(bob, other.id);
		await reply(alice, 'bump the first one');
		expect((await following(bob)).map((i) => i.id)).toEqual([postId, other.id]);
		expect((await following(alice)).map((i) => i.id).sort()).toEqual([postId, other.id].sort());
		await posts.deletePost(alice, postId);
		expect((await following(bob)).map((i) => i.id)).toEqual([other.id]);
	});

	it('gives nothing without a viewer, and other tabs carry no counts', async () => {
		expect(await feed.list({ tab: 'following', sort: 'hot' })).toEqual([]);
		expect((await feed.list({ tab: 'all', sort: 'new' }))[0].newReplies).toBeUndefined();
	});
});
