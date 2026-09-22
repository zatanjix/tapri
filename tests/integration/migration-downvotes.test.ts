import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createSql, type Sql } from '../../src/lib/server/db';
import { migrate } from '../../src/lib/server/migrate';

const URL = process.env.DATABASE_URL_TEST ?? 'postgres://tapri:tapri@localhost:5433/tapri_test';
let sql: Sql;
let dir: string;

afterAll(async () => {
	await sql?.end();
	if (dir) await rm(dir, { recursive: true, force: true });
});

/** Simulates production: data exists under the old schema, then the downvote migration runs. */
describe('downvote migration on existing data', () => {
	it('keeps every existing vote as an upvote and every count intact', async () => {
		sql = createSql(URL);
		await sql`drop schema public cascade`;
		await sql`create schema public`;

		dir = await mkdtemp(join(tmpdir(), 'tapri-mig-'));
		for (const f of (await readdir('migrations')).filter((f) => f < '006')) await cp(join('migrations', f), join(dir, f));
		await migrate(sql, dir);

		const [acct] = await sql`insert into accounts (secret_hash, valid_until) values (${randomBytes(32)}, '2099-01-01') returning id`;
		const [post] = await sql`
			insert into posts (category_id, account_id, kind, title, body, upvotes)
			select id, ${acct.id}, 'grievance', 'Existing post', 'Body', 1 from categories where slug = 'academics' returning id`;
		await sql`insert into votes (account_id, target_type, target_id) values (${acct.id}, 'post', ${post.id})`;

		const stepDir = await mkdtemp(join(tmpdir(), 'tapri-mig6-'));
		for (const f of (await readdir('migrations')).filter((f) => f < '007')) await cp(join('migrations', f), join(stepDir, f));
		expect(await migrate(sql, stepDir)).toEqual(['006_downvotes.sql']);
		await rm(stepDir, { recursive: true, force: true });

		const [vote] = await sql`select value from votes`;
		const [p] = await sql`select upvotes, downvotes, title from posts`;
		expect(vote.value).toBe(1);
		expect(p).toEqual({ upvotes: 1, downvotes: 0, title: 'Existing post' });
	});
});

describe('search migration on existing data', () => {
	it('indexes posts that already exist', async () => {
		const [acct] = await sql`insert into accounts (secret_hash, valid_until) values (${randomBytes(32)}, '2099-01-01') returning id`;
		await sql`
			insert into posts (category_id, account_id, kind, title, body)
			select id, ${acct.id}, 'grievance', 'Mess food complaints', 'The dal is watery every day' from categories where slug = 'hostel-mess'`;
		const stepDir = await mkdtemp(join(tmpdir(), 'tapri-mig7-'));
		for (const f of (await readdir('migrations')).filter((f) => f < '008')) await cp(join('migrations', f), join(stepDir, f));
		expect(await migrate(sql, stepDir)).toEqual(['007_search.sql']);
		await rm(stepDir, { recursive: true, force: true });
		const hits = await sql`select title from posts where search @@ websearch_to_tsquery('english', 'complaint')`;
		expect(hits.map((h) => h.title)).toContain('Mess food complaints');
	});
});

describe('official-posts migration on existing data', () => {
	it('marks every existing post and reply as not official, and adds a system account', async () => {
		const stepDir = await mkdtemp(join(tmpdir(), 'tapri-mig8-'));
		for (const f of (await readdir('migrations')).filter((f) => f < '009')) await cp(join('migrations', f), join(stepDir, f));
		expect(await migrate(sql, stepDir)).toEqual(['008_official.sql']);
		await rm(stepDir, { recursive: true, force: true });
		const official = await sql`select count(*)::int as n from posts where official`;
		const total = await sql`select count(*)::int as n from posts`;
		expect(official[0].n).toBe(0);
		expect(total[0].n).toBeGreaterThan(0);
		const [system] = await sql`select status, valid_until::text as v from accounts where id = '00000000-0000-0000-0000-000000000001'`;
		expect(system).toEqual({ status: 'active', v: '9999-12-31' });
	});
});

describe('follows migration on existing data', () => {
	it('adds an empty follows table and leaves posts untouched', async () => {
		const [before] = await sql`select count(*)::int as n, sum(reply_count)::int as r from posts`;
		expect(await migrate(sql)).toContain('009_follows.sql');
		const [after] = await sql`select count(*)::int as n, sum(reply_count)::int as r from posts`;
		expect(after).toEqual(before);
		const [{ n }] = await sql`select count(*)::int as n from follows`;
		expect(n).toBe(0);
	});
});
