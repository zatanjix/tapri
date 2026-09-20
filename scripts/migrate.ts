import { createSql } from '../src/lib/server/db';
import { migrate } from '../src/lib/server/migrate';

const url = process.env.DATABASE_URL;
if (!url) {
	if (process.env.VERCEL) {
		console.warn('DATABASE_URL is not set; skipping migrations');
		process.exit(0);
	}
	throw new Error('DATABASE_URL is not set');
}
const sql = createSql(url);
const applied = await migrate(sql);
console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date');
await sql.end();
