import { createSql, type Sql } from '../../src/lib/server/db';
import { migrate } from '../../src/lib/server/migrate';

const URL = process.env.DATABASE_URL_TEST ?? 'postgres://tapri:tapri@localhost:5433/tapri_test';

export async function freshDb(): Promise<Sql> {
	const sql = createSql(URL);
	await sql`drop schema public cascade`;
	await sql`create schema public`;
	await migrate(sql);
	return sql;
}

export async function clearData(sql: Sql): Promise<void> {
	await sql`truncate accounts, sessions, issuances, spent_tokens, verifications, reports cascade`;
}
