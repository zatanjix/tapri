import { AccountService } from './accounts/service';
import { SessionService } from './accounts/sessions';
import { ensureHandleKey, loadHandleKey, loadIssuerKeys, loadSemesterKey, type IssuerKeys } from './crypto/keys';
import { semesterId } from './crypto/semester';
import { createSql, type Sql } from './db';
import { FeedService } from './forum/feed';
import { PostService } from './forum/posts';
import { ReactionService } from './forum/reactions';
import { DevConsoleMailer, SmtpMailer, type Mailer } from './mail/mailer';
import { IpKeyer, RateLimiter } from './ratelimit';
import { PendingStore } from './verify/pending';
import { VerifyService, type PendingVerification } from './verify/service';

export interface App {
	sql: Sql;
	keys: IssuerKeys;
	verify: VerifyService;
	accounts: AccountService;
	sessions: SessionService;
	posts: PostService;
	reactions: ReactionService;
	feed: FeedService;
	ipKeyer: IpKeyer;
	limits: {
		verifyStart: RateLimiter;
		verifyOtp: RateLimiter;
		signIn: RateLimiter;
		post: RateLimiter;
		reply: RateLimiter;
		react: RateLimiter;
	};
}

function required(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`${name} is not set`);
	return v;
}

function mailer(): Mailer {
	if (process.env.MAILER === 'smtp') return new SmtpMailer(required('MAIL_FROM'));
	if (process.env.NODE_ENV === 'production') throw new Error('MAILER=smtp is required in production');
	return new DevConsoleMailer();
}

async function build(): Promise<App> {
	const dir = required('KEYS_DIR');
	const keyId = process.env.ISSUER_KEY_ID ?? semesterId();
	const sql = createSql(required('DATABASE_URL'));
	const keys = await loadIssuerKeys(dir, keyId);
	await ensureHandleKey(dir);
	const handleKey = await loadHandleKey(dir);
	const pending = new PendingStore<PendingVerification>(10 * 60_000);
	const limits = {
		verifyStart: new RateLimiter(5, 60 * 60_000), // 5 codes per hour per network
		verifyOtp: new RateLimiter(30, 60 * 60_000),
		signIn: new RateLimiter(20, 60 * 60_000),
		post: new RateLimiter(5, 60 * 60_000),
		reply: new RateLimiter(30, 60 * 60_000),
		react: new RateLimiter(300, 60 * 60_000)
	};

	const minute = setInterval(() => {
		pending.sweep();
		for (const l of Object.values(limits)) l.sweep();
	}, 60_000);
	minute.unref();

	const sessions = new SessionService(sql);
	const hourly = setInterval(() => void sessions.purgeExpired(), 60 * 60_000);
	hourly.unref();

	return {
		sql,
		keys,
		verify: new VerifyService({ sql, keys, semesterKey: await loadSemesterKey(dir, keyId), mailer: mailer(), pending }),
		accounts: new AccountService({ sql, keys }),
		sessions,
		posts: new PostService({ sql, handleKey }),
		reactions: new ReactionService(sql),
		feed: new FeedService({ sql, handleKey }),
		ipKeyer: new IpKeyer(),
		limits
	};
}

let app: Promise<App> | undefined;

/** Builds once; a failed build is not cached, so fixing the environment doesn't need a restart. */
export function getApp(): Promise<App> {
	app ??= build().catch((e) => {
		app = undefined;
		throw e;
	});
	return app;
}
