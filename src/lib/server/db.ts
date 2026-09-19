import postgres from 'postgres';

export type Sql = postgres.Sql;

export function createSql(url: string): Sql {
	return postgres(url, { max: 10, onnotice: () => {} });
}
