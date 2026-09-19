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
	it('toggles an upvote on a post', async () => {
		expect(await reactions.toggleVote(bob, 'post', postId)).toEqual({ ok: true, active: true, count: 1 });
		expect(await reactions.toggleVote(bob, 'post', postId)).toEqual({ ok: true, active: false, count: 0 });
	});

	it('toggles an upvote on a reply', async () => {
		const r = await posts.createReply(alice, postId, { body: 'Raised with DUGC' });
		if (!r.ok) throw new Error(r.error);
		expect(await reactions.toggleVote(bob, 'reply', r.id)).toEqual({ ok: true, active: true, count: 1 });
	});

	it('toggles "affects me too" and counts across accounts', async () => {
		expect(await reactions.toggleMetoo(bob, postId)).toEqual({ ok: true, active: true, count: 1 });
		expect(await reactions.toggleMetoo(alice, postId)).toEqual({ ok: true, active: true, count: 2 });
		expect(await reactions.toggleMetoo(bob, postId)).toEqual({ ok: true, active: false, count: 1 });
	});

	it('rejects missing or deleted targets', async () => {
		expect(await reactions.toggleVote(bob, 'post', 999_999)).toEqual({ ok: false, error: 'not_found' });
		await posts.deletePost(alice, postId);
		expect(await reactions.toggleMetoo(bob, postId)).toEqual({ ok: false, error: 'not_found' });
	});
});
