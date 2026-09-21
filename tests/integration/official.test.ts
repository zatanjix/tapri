import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../src/lib/server/accounts/sessions';
import type { Sql } from '../../src/lib/server/db';
import { FeedService } from '../../src/lib/server/forum/feed';
import { OFFICIAL_HANDLE, PostService, SYSTEM_ACCOUNT_ID } from '../../src/lib/server/forum/posts';
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
	await sql`
		insert into accounts (id, secret_hash, valid_until) values (${SYSTEM_ACCOUNT_ID}, decode(repeat('00', 32), 'hex'), '9999-12-31')
		on conflict (id) do nothing`;
	alice = await makeAccount(sql);
});

describe('official posts', () => {
	it('shows official posts as Tapri, in threads and feeds', async () => {
		const r = await posts.createOfficialPost({ category: 'feedback', title: 'Downvotes are live', body: 'As requested.' });
		if (!r.ok) throw new Error(r.error);
		const thread = (await posts.getThread(alice, r.id))!;
		expect(thread.post).toMatchObject({ handle: OFFICIAL_HANDLE, official: true, mine: false });
		const [item] = await feed.list({ tab: 'all', sort: 'new' });
		expect(item).toMatchObject({ handle: OFFICIAL_HANDLE, official: true });
	});

	it('replies officially in someone else’s thread', async () => {
		const p = await posts.createPost(alice, { category: 'feedback', kind: 'conversation', title: 'Add downvotes please', body: 'Same as title.' });
		if (!p.ok) throw new Error(p.error);
		const r = await posts.createOfficialReply(p.id, { body: 'Done, live now.' });
		if (!r.ok) throw new Error(r.error);
		const [reply] = (await posts.getThread(alice, p.id))!.replies;
		expect(reply).toMatchObject({ handle: OFFICIAL_HANDLE, official: true, isOp: false, body: 'Done, live now.' });
	});

	it('keeps ordinary posts ordinary, and no user can take the official name', async () => {
		const p = await posts.createPost(alice, { category: 'general', kind: 'conversation', title: 'I am the dev, trust me', body: 'Honest.' });
		if (!p.ok) throw new Error(p.error);
		const t = (await posts.getThread(alice, p.id))!;
		expect(t.post.official).toBe(false);
		expect(t.post.handle).not.toBe(OFFICIAL_HANDLE);
	});

	it('cannot be signed into', async () => {
		const sessions = new SessionService(sql);
		expect(await sessions.signIn('0000-0000-0000-0000-0000-0000')).toBeNull();
	});
});
