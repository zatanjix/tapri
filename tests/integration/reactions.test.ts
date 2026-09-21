import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { PostService } from '../../src/lib/server/forum/posts';
import { ReactionService } from '../../src/lib/server/forum/reactions';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let posts: PostService;
let reactions: ReactionService;
let alice: string;
let bob: string;
let postId: number;

beforeAll(async () => {
	sql = await freshDb();
	posts = new PostService({ sql, handleKey: randomBytes(32) });
	reactions = new ReactionService(sql);
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

describe('ReactionService', () => {
	it('upvotes, and a second upvote takes it back', async () => {
		expect(await reactions.vote(bob, 'post', postId, 1)).toEqual({ ok: true, vote: 1, upvotes: 1, downvotes: 0 });
		expect(await reactions.vote(bob, 'post', postId, 1)).toEqual({ ok: true, vote: 0, upvotes: 0, downvotes: 0 });
	});

	it('downvotes, and switching direction moves the vote', async () => {
		expect(await reactions.vote(bob, 'post', postId, -1)).toEqual({ ok: true, vote: -1, upvotes: 0, downvotes: 1 });
		expect(await reactions.vote(bob, 'post', postId, 1)).toEqual({ ok: true, vote: 1, upvotes: 1, downvotes: 0 });
		expect(await reactions.vote(bob, 'post', postId, -1)).toEqual({ ok: true, vote: -1, upvotes: 0, downvotes: 1 });
		expect(await reactions.vote(bob, 'post', postId, -1)).toEqual({ ok: true, vote: 0, upvotes: 0, downvotes: 0 });
	});

	it('votes on replies', async () => {
		const r = await posts.createReply(alice, postId, { body: 'Raised with DUGC' });
		if (!r.ok) throw new Error(r.error);
		expect(await reactions.vote(bob, 'reply', r.id, -1)).toEqual({ ok: true, vote: -1, upvotes: 0, downvotes: 1 });
	});

	it('does not allow downvotes in Wellbeing, on posts or replies', async () => {
		const w = await posts.createPost(alice, { category: 'wellbeing', kind: 'conversation', title: 'Rough week here', body: 'Hard.' });
		if (!w.ok) throw new Error(w.error);
		expect(await reactions.vote(bob, 'post', w.id, -1)).toEqual({ ok: false, error: 'not_allowed' });
		expect((await reactions.vote(bob, 'post', w.id, 1)).ok).toBe(true);
		const r = await posts.createReply(alice, w.id, { body: 'thanks all' });
		if (!r.ok) throw new Error(r.error);
		expect(await reactions.vote(bob, 'reply', r.id, -1)).toEqual({ ok: false, error: 'not_allowed' });
	});

	it('toggles "affects me too" and counts across accounts', async () => {
		expect(await reactions.toggleMetoo(bob, postId)).toEqual({ ok: true, active: true, count: 1 });
		expect(await reactions.toggleMetoo(alice, postId)).toEqual({ ok: true, active: true, count: 2 });
		expect(await reactions.toggleMetoo(bob, postId)).toEqual({ ok: true, active: false, count: 1 });
	});

	it('rejects missing or deleted targets', async () => {
		expect(await reactions.vote(bob, 'post', 999_999, 1)).toEqual({ ok: false, error: 'not_found' });
		await posts.deletePost(alice, postId);
		expect(await reactions.toggleMetoo(bob, postId)).toEqual({ ok: false, error: 'not_found' });
	});
});
