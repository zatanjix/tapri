import { randomBytes } from 'node:crypto';
import type { Sql } from '../../src/lib/server/db';

export async function makeAccount(sql: Sql): Promise<string> {
	const [row] = await sql`
		insert into accounts (secret_hash, valid_until) values (${randomBytes(32)}, '2099-01-01') returning id`;
	return row.id as string;
}
