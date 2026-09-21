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

		expect(await migrate(sql)).toEqual(['006_downvotes.sql']);

		const [vote] = await sql`select value from votes`;
		const [p] = await sql`select upvotes, downvotes, title from posts`;
		expect(vote.value).toBe(1);
		expect(p).toEqual({ upvotes: 1, downvotes: 0, title: 'Existing post' });
	});
});
