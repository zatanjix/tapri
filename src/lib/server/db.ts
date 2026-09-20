import postgres from 'postgres';

export type Sql = postgres.Sql;

export function createSql(url: string): Sql {
	// Neon's pooled endpoint is PgBouncer in transaction mode: no prepared statements,
	// and each serverless instance needs only a couple of connections.
	const pooled = url.includes('-pooler.');
	return postgres(url, {
		max: pooled ? 3 : 10,
		prepare: !pooled,
		idle_timeout: pooled ? 20 : undefined,
		onnotice: () => {}
	});
}
