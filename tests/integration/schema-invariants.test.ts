import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { freshDb } from '../helpers/db';

let sql: Sql;
beforeAll(async () => {
	sql = await freshDb();
});
afterAll(async () => {
	await sql.end();
});

async function columns() {
	return sql<{ table_name: string; column_name: string }[]>`
		select table_name, column_name from information_schema.columns
		where table_schema = 'public'`;
}

describe('anonymity invariants', () => {
	it('creates the identity tables', async () => {
		const tables = new Set((await columns()).map((c) => c.table_name));
		for (const t of ['accounts', 'sessions', 'issuances', 'spent_tokens', 'categories', 'posts', 'replies', 'votes', 'metoos'])
			expect(tables).toContain(t);
	});

	it('never pairs email-derived data with an account id', async () => {
		const byTable = new Map<string, Set<string>>();
		for (const c of await columns()) {
			if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Set());
			byTable.get(c.table_name)!.add(c.column_name);
		}
		for (const [table, cols] of byTable) {
			const hasEmail = [...cols].some((c) => c.includes('email'));
			expect(hasEmail && cols.has('account_id'), `${table} links email to account`).toBe(false);
		}
	});

	it('issuances holds only the email HMAC and semester', async () => {
		const cols = (await columns()).filter((c) => c.table_name === 'issuances').map((c) => c.column_name);
		expect(cols.sort()).toEqual(['email_hmac', 'semester']);
	});

	it('has no IP, user-agent, raw email or created_at columns', async () => {
		const banned = /(^ip$|^ip_|_ip$|ip_addr|user_agent|created_at|^email$)/;
		const hits = (await columns()).filter((c) => banned.test(c.column_name));
		expect(hits).toEqual([]);
	});

	it('seeds the categories in order', async () => {
		const rows = await sql`select slug from categories order by sort_order`;
		expect(rows.map((r) => r.slug)).toEqual([
			'academics', 'hostel-mess', 'wellbeing', 'harassment', 'administration', 'placements', 'general', 'feedback'
		]);
	});
});
