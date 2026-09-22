import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { PostService } from '../../src/lib/server/forum/posts';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let posts: PostService;
let alice: string;
let bob: string;
let carol: string;

beforeAll(async () => {
	sql = await freshDb();
	posts = new PostService({ sql, handleKey: randomBytes(32) });
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	[alice, bob, carol] = [await makeAccount(sql), await makeAccount(sql), await makeAccount(sql)];
});

const grievance = { category: 'hostel-mess', kind: 'grievance', title: 'WiFi drops every night', body: 'Whole wing, since August.' };

async function created(account = alice, input = grievance) {
	const r = await posts.createPost(account, input);
	if (!r.ok) throw new Error(r.error);
	return r.id;
}

describe('PostService.createPost', () => {
	it('validates category, kind, title and body', async () => {
		expect(await posts.createPost(alice, { ...grievance, category: 'nope' })).toEqual({ ok: false, error: 'unknown_category' });
		expect(await posts.createPost(alice, { ...grievance, kind: 'rant' })).toEqual({ ok: false, error: 'invalid_kind' });
		expect(await posts.createPost(alice, { ...grievance, title: 'hey' })).toEqual({ ok: false, error: 'invalid_title' });
		expect(await posts.createPost(alice, { ...grievance, body: ' ' })).toEqual({ ok: false, error: 'invalid_body' });
		expect(await posts.createPost(alice, { ...grievance, body: 'x'.repeat(10_001) })).toEqual({ ok: false, error: 'invalid_body' });
	});

	it('trims and stores a valid post', async () => {
		const id = await created(alice, { ...grievance, title: '  WiFi drops every night  ' });
		const thread = await posts.getThread(alice, id);
		expect(thread!.post.title).toBe('WiFi drops every night');
		expect(thread!.post.mine).toBe(true);
		expect(thread!.post.category).toEqual({ slug: 'hostel-mess', name: 'Hostel & Mess' });
	});
});

describe('PostService replies and threads', () => {
	it('nests one level, marks OP and keeps handles consistent', async () => {
		const id = await created();
		const r1 = await posts.createReply(bob, id, { body: 'Same in my wing.' });
		if (!r1.ok) throw new Error(r1.error);
		const r2 = await posts.createReply(alice, id, { body: 'Raised it thrice.', parentId: r1.id });
		if (!r2.ok) throw new Error(r2.error);
		expect(await posts.createReply(carol, id, { body: 'Too deep', parentId: r2.id })).toEqual({ ok: false, error: 'too_deep' });

		const t = (await posts.getThread(carol, id))!;
		expect(t.post.replyCount).toBe(2);
		expect(t.replies).toHaveLength(1);
		const [top] = t.replies;
		expect(top.isOp).toBe(false);
		expect(top.children[0].isOp).toBe(true);
		expect(top.children[0].handle).toBe(t.post.handle);
		expect(top.handle).not.toBe(t.post.handle);
		expect(t.viewerHandle).not.toBe(t.post.handle);
		expect(t.viewerHandle).not.toBe(top.handle);
	});

	it('rejects replies to missing posts and parents from other threads', async () => {
		const a = await created();
		const b = await created(bob);
		const r = await posts.createReply(bob, a, { body: 'hi' });
		if (!r.ok) throw new Error(r.error);
		expect(await posts.createReply(bob, 999_999, { body: 'hi' })).toEqual({ ok: false, error: 'not_found' });
		expect(await posts.createReply(bob, b, { body: 'hi', parentId: r.id })).toEqual({ ok: false, error: 'not_found' });
	});

	it('sorts top-level replies by upvotes, then oldest first', async () => {
		const id = await created();
		const first = await posts.createReply(bob, id, { body: 'first' });
		const second = await posts.createReply(carol, id, { body: 'second' });
		if (!first.ok || !second.ok) throw new Error('reply failed');
		await sql`update replies set upvotes = 5 where id = ${second.id}`;
		const t = (await posts.getThread(alice, id))!;
		expect(t.replies.map((r) => r.body)).toEqual(['second', 'first']);
	});

	it('never exposes account ids', async () => {
		const id = await created();
		await posts.createReply(bob, id, { body: 'Same here' });
		const json = JSON.stringify(await posts.getThread(carol, id));
		for (const acct of [alice, bob, carol]) expect(json).not.toContain(acct);
	});

	it('flags distress on posts and replies', async () => {
		const id = await created(alice, { category: 'wellbeing', kind: 'conversation', title: 'Hard week', body: "I can't do this anymore" });
		await posts.createReply(bob, id, { body: 'Talk to someone tonight, please.' });
		const t = (await posts.getThread(bob, id))!;
		expect(t.post.distress).toBe(true);
		expect(t.replies[0].distress).toBe(false);
	});
});

describe('PostService.delete', () => {
	it('lets authors delete their own post, hiding the thread', async () => {
		const id = await created();
		expect(await posts.deletePost(bob, id)).toEqual({ ok: false, error: 'not_found' });
		expect(await posts.deletePost(alice, id)).toEqual({ ok: true });
		expect(await posts.getThread(alice, id)).toBeNull();
	});

	it('keeps a placeholder for a deleted reply and its children', async () => {
		const id = await created();
		const r = await posts.createReply(bob, id, { body: 'parent' });
		if (!r.ok) throw new Error(r.error);
		await posts.createReply(carol, id, { body: 'child', parentId: r.id });
		expect(await posts.deleteReply(bob, r.id)).toEqual({ ok: true });
		const t = (await posts.getThread(alice, id))!;
		expect(t.replies[0]).toMatchObject({ status: 'deleted', body: '' });
		expect(t.replies[0].children[0].body).toBe('child');
		expect(t.post.replyCount).toBe(1);
	});
});

describe('PostService limits', () => {
	it('limits posts and replies per account per hour', async () => {
		for (let i = 0; i < 5; i++) await created(alice, { ...grievance, title: `Post number ${i}` });
		expect(await posts.createPost(alice, grievance)).toEqual({ ok: false, error: 'rate_limited' });
		expect((await posts.createPost(bob, grievance)).ok).toBe(true);

		const id = await created(bob);
		for (let i = 0; i < 30; i++) await posts.createReply(carol, id, { body: `reply ${i}` });
		expect(await posts.createReply(carol, id, { body: 'one too many' })).toEqual({ ok: false, error: 'rate_limited' });
	});
});

describe('PostService formatting', () => {
	it('formats new posts and replies as markdown', async () => {
		const id = await created(alice, { ...grievance, body: 'Since **August**' });
		await posts.createReply(bob, id, { body: 'same, `ping` fails' });
		const thread = await posts.getThread(bob, id);
		expect(thread?.post.doc).toEqual([{ t: 'p', c: [{ t: 'text', v: 'Since ' }, { t: 'strong', c: [{ t: 'text', v: 'August' }] }] }]);
		expect(thread?.replies[0].doc?.[0]).toEqual({ t: 'p', c: [{ t: 'text', v: 'same, ' }, { t: 'code', v: 'ping' }, { t: 'text', v: ' fails' }] });
	});

	it('leaves posts written before markdown as plain text', async () => {
		const id = await created(alice, { ...grievance, body: 'Old *post*' });
		await sql`update posts set format = 'plain' where id = ${id}`;
		const thread = await posts.getThread(bob, id);
		expect(thread?.post.doc).toBeNull();
		expect(thread?.post.body).toBe('Old *post*');
	});

	it('gives deleted replies no content', async () => {
		const id = await created();
		const r = await posts.createReply(bob, id, { body: '**secret**' });
		if (!r.ok) throw new Error(r.error);
		await posts.deleteReply(bob, r.id);
		expect((await posts.getThread(alice, id))?.replies[0].doc).toBeNull();
	});
});
