import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { PostService } from '../../src/lib/server/forum/posts';
import { ReportService } from '../../src/lib/server/forum/reports';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';

let sql: Sql;
let posts: PostService;
let reports: ReportService;
let alice: string;
let bob: string;
let postId: number;

beforeAll(async () => {
	sql = await freshDb();
	posts = new PostService({ sql, handleKey: randomBytes(32) });
	reports = new ReportService(sql);
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	[alice, bob] = [await makeAccount(sql), await makeAccount(sql)];
	const r = await posts.createPost(alice, { category: 'general', kind: 'conversation', title: 'A post to report', body: 'Body text.' });
	if (!r.ok) throw new Error(r.error);
	postId = r.id;
});

describe('ReportService.create', () => {
	it('records a report', async () => {
		expect(await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'spam', note: ' too much ' })).toEqual({ ok: true });
		const [row] = await sql`select * from reports`;
		expect(row).toMatchObject({ target_type: 'post', reason: 'spam', note: 'too much', handled: false });
	});

	it('accepts one report per person per thing', async () => {
		await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'spam' });
		expect(await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'hate' })).toEqual({ ok: false, error: 'already_reported' });
		expect(await reports.create(alice, { targetType: 'post', targetId: postId, reason: 'hate' })).toEqual({ ok: true });
	});

	it('rejects unknown targets and reasons', async () => {
		expect(await reports.create(bob, { targetType: 'post', targetId: 999_999, reason: 'spam' })).toEqual({ ok: false, error: 'not_found' });
		expect(await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'nonsense' })).toEqual({ ok: false, error: 'bad_request' });
	});

	it('limits how many reports one account can file per hour', async () => {
		for (let i = 0; i < 20; i++) {
			// a fresh author each time, so the hourly posting limit doesn't interfere
			const r = await posts.createPost(await makeAccount(sql), {
				category: 'general',
				kind: 'conversation',
				title: `Another post ${i}`,
				body: 'Body.'
			});
			if (!r.ok) throw new Error(r.error);
			expect(await reports.create(bob, { targetType: 'post', targetId: r.id, reason: 'spam' })).toEqual({ ok: true });
		}
		expect(await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'spam' })).toEqual({ ok: false, error: 'rate_limited' });
	});
});

describe('ReportService moderation', () => {
	it('lists open reports with what was reported, newest first', async () => {
		await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'danger', note: 'sounds serious' });
		const open = await reports.open();
		expect(open).toHaveLength(1);
		expect(open[0]).toMatchObject({ targetType: 'post', targetId: postId, reason: 'danger', note: 'sounds serious', title: 'A post to report' });
		expect(JSON.stringify(open)).not.toContain(bob);
	});

	it('removes a reported post and marks its reports handled', async () => {
		await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'hate' });
		expect(await reports.remove('post', postId)).toEqual({ ok: true });
		expect(await posts.getThread(alice, postId)).toBeNull();
		expect(await reports.open()).toHaveLength(0);
	});

	it('dismisses reports without touching the content', async () => {
		await reports.create(bob, { targetType: 'post', targetId: postId, reason: 'spam' });
		expect(await reports.dismiss('post', postId)).toEqual({ ok: true });
		expect(await reports.open()).toHaveLength(0);
		expect((await posts.getThread(alice, postId))?.post.title).toBe('A post to report');
	});
});
