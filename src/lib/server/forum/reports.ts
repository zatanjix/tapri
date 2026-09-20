import type { Sql } from '../db';
import type { Result } from './types';

export const REASONS = ['hate', 'identifying', 'spam', 'danger', 'other'] as const;
export type Reason = (typeof REASONS)[number];
export type TargetType = 'post' | 'reply';

/** Per account per hour, so reporting can't be used to flood the queue. */
export const HOURLY_REPORT_LIMIT = 20;
const NOTE_MAX = 300;

export interface NewReport {
	targetType: TargetType;
	targetId: number;
	reason: string;
	note?: string;
}

export type ReportError = 'bad_request' | 'not_found' | 'already_reported' | 'rate_limited';

export interface OpenReport {
	targetType: TargetType;
	targetId: number;
	reason: Reason;
	note: string;
	reportedOn: string;
	times: number;
	/** The reported content, so it can be judged without hunting for it. */
	title: string;
	body: string;
	postId: number;
	status: string;
}

const TABLE: Record<TargetType, string> = { post: 'posts', reply: 'replies' };

/** Reports name content, never people: no reporter is ever exposed outside the database. */
export class ReportService {
	constructor(private sql: Sql) {}

	async create(accountId: string, input: NewReport): Promise<Result<object, ReportError>> {
		if (!REASONS.includes(input.reason as Reason)) return { ok: false, error: 'bad_request' };
		if (input.targetType !== 'post' && input.targetType !== 'reply') return { ok: false, error: 'bad_request' };
		const note = (input.note ?? '').trim().slice(0, NOTE_MAX);

		const [target] = await this.sql`
			select 1 from ${this.sql(TABLE[input.targetType])} where id = ${input.targetId} and status = 'published'`;
		if (!target) return { ok: false, error: 'not_found' };

		const [{ n }] = await this.sql`
			select count(*)::int as n from reports
			where reporter_id = ${accountId} and reported_on > now() - interval '1 hour'`;
		if (n >= HOURLY_REPORT_LIMIT) return { ok: false, error: 'rate_limited' };

		const inserted = await this.sql`
			insert into reports (target_type, target_id, reason, note, reporter_id)
			values (${input.targetType}, ${input.targetId}, ${input.reason}, ${note}, ${accountId})
			on conflict do nothing returning 1`;
		return inserted.length ? { ok: true } : { ok: false, error: 'already_reported' };
	}

	/** One row per reported thing, with how many people reported it. */
	async open(): Promise<OpenReport[]> {
		const rows = await this.sql`
			select r.target_type, r.target_id, min(r.reason) as reason, max(r.note) as note,
			       max(r.reported_on) as reported_on, count(*)::int as times,
			       coalesce(p.title, '') as title,
			       coalesce(p.body, rep.body, '') as body,
			       coalesce(p.id, rep.post_id) as post_id,
			       coalesce(p.status, rep.status, 'gone') as status
			from reports r
			left join posts p on r.target_type = 'post' and p.id = r.target_id
			left join replies rep on r.target_type = 'reply' and rep.id = r.target_id
			where r.handled = false
			group by r.target_type, r.target_id, p.title, p.body, p.id, p.status, rep.body, rep.post_id, rep.status
			order by max(r.reported_on) desc
			limit 100`;
		return rows.map((r) => ({
			targetType: r.target_type,
			targetId: Number(r.target_id),
			reason: r.reason,
			note: r.note,
			reportedOn: new Date(r.reported_on).toISOString(),
			times: r.times,
			title: r.title,
			body: r.body,
			postId: Number(r.post_id),
			status: r.status
		}));
	}

	async remove(targetType: TargetType, targetId: number): Promise<Result<object, 'not_found'>> {
		const done = await this.sql.begin(async (tx) => {
			const rows = await tx`
				update ${this.sql(TABLE[targetType])} set status = 'removed'
				where id = ${targetId} and status = 'published' returning 1`;
			await tx`update reports set handled = true where target_type = ${targetType} and target_id = ${targetId}`;
			return rows.length > 0;
		});
		return done ? { ok: true } : { ok: false, error: 'not_found' };
	}

	async dismiss(targetType: TargetType, targetId: number): Promise<Result<object, 'not_found'>> {
		const rows = await this.sql`
			update reports set handled = true
			where target_type = ${targetType} and target_id = ${targetId} and handled = false returning 1`;
		return rows.length ? { ok: true } : { ok: false, error: 'not_found' };
	}
}
