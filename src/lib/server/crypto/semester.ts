const ID = /^(\d{4})-(spring|autumn)$/;

function parse(id: string): { year: number; term: 'spring' | 'autumn' } {
	const m = ID.exec(id);
	if (!m) throw new Error(`invalid semester id: ${id}`);
	return { year: Number(m[1]), term: m[2] as 'spring' | 'autumn' };
}

export function semesterId(date: Date = new Date()): string {
	return `${date.getUTCFullYear()}-${date.getUTCMonth() >= 6 ? 'autumn' : 'spring'}`;
}

export function semesterEnd(id: string): Date {
	const { year, term } = parse(id);
	return term === 'autumn' ? new Date(Date.UTC(year, 11, 31)) : new Date(Date.UTC(year, 5, 30));
}

export function nextSemester(id: string): string {
	const { year, term } = parse(id);
	return term === 'spring' ? `${year}-autumn` : `${year + 1}-spring`;
}
