import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Sql } from './db';

export async function migrate(sql: Sql, dir = join(process.cwd(), 'migrations')): Promise<string[]> {
	await sql`create table if not exists schema_migrations (name text primary key)`;
	const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name as string));
	const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
	const applied: string[] = [];
	for (const file of files) {
		if (done.has(file)) continue;
		const text = await readFile(join(dir, file), 'utf8');
		await sql.begin(async (tx) => {
			await tx.unsafe(text);
			await tx`insert into schema_migrations (name) values (${file})`;
		});
		applied.push(file);
	}
	return applied;
}
