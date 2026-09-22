import { AccountService } from './accounts/service';
import { SessionService } from './accounts/sessions';
import {
	ensureHandleKey,
	importIssuerKeys,
	loadHandleKey,
	loadIssuerKeys,
	loadSemesterKey,
	type IssuerKeys
} from './crypto/keys';
import { semesterId } from './crypto/semester';
import { createSql, type Sql } from './db';
import { FeedService } from './forum/feed';
import { FollowService } from './forum/follows';
import { PostService } from './forum/posts';
import { ReactionService } from './forum/reactions';
import { ReportService } from './forum/reports';
import { DevConsoleMailer, ResendMailer, SmtpMailer, type Mailer } from './mail/mailer';
import { IpKeyer, RateLimiter } from './ratelimit';
import { VerifyService } from './verify/service';

export interface App {
	sql: Sql;
	keys: IssuerKeys;
	verify: VerifyService;
	accounts: AccountService;
	sessions: SessionService;
	posts: PostService;
	reactions: ReactionService;
	reports: ReportService;
	feed: FeedService;
	follows: FollowService;
	ipKeyer: IpKeyer;
	/** Best-effort, per server instance. Durable limits live in the services. */
	limits: { verifyStart: RateLimiter; verifyOtp: RateLimiter; signIn: RateLimiter; react: RateLimiter };
}

const env = (name: string): string | undefined => process.env[name] || undefined;

function required(name: string): string {
	const v = env(name);
	if (!v) throw new Error(`${name} is not set`);
	return v;
}

function mailer(): Mailer {
	switch (env('MAILER')) {
		case 'resend':
			return new ResendMailer(required('RESEND_API_KEY'), required('MAIL_FROM'));
		case 'smtp':
			return new SmtpMailer(required('MAIL_FROM'));
		default:
			if (process.env.NODE_ENV === 'production') throw new Error('MAILER must be resend or smtp in production');
			return new DevConsoleMailer();
	}
}

/** Keys come from environment variables on hosted platforms, or from files in KEYS_DIR locally. */
async function loadKeys(): Promise<{ keys: IssuerKeys; semesterKey: Buffer; handleKey: Buffer }> {
	const keyId = env('ISSUER_KEY_ID') ?? semesterId();
	const privateKey = env('ISSUER_PRIVATE_KEY');
	if (privateKey) {
		return {
			keys: await importIssuerKeys(keyId, required('ISSUER_PUBLIC_KEY'), privateKey),
			semesterKey: Buffer.from(required('SEMESTER_KEY'), 'base64url'),
			handleKey: Buffer.from(required('HANDLE_KEY'), 'base64url')
		};
	}
	const dir = required('KEYS_DIR');
	await ensureHandleKey(dir);
	return {
		keys: await loadIssuerKeys(dir, keyId),
		semesterKey: await loadSemesterKey(dir, keyId),
		handleKey: await loadHandleKey(dir)
	};
}

async function build(): Promise<App> {
	const sql = createSql(required('DATABASE_URL'));
	const { keys, semesterKey, handleKey } = await loadKeys();
	return {
		sql,
		keys,
		verify: new VerifyService({
			sql,
			keys,
			semesterKey,
			mailer: mailer(),
			// Only honoured while the site is locked behind a passphrase.
			testEmail: env('ACCESS_PASSPHRASE') ? env('TEST_EMAIL') : undefined
		}),
		accounts: new AccountService({ sql, keys }),
		sessions: new SessionService(sql),
		posts: new PostService({ sql, handleKey }),
		reactions: new ReactionService(sql),
		reports: new ReportService(sql),
		feed: new FeedService({ sql, handleKey }),
		follows: new FollowService(sql),
		ipKeyer: new IpKeyer(),
		limits: {
			verifyStart: new RateLimiter(5, 60 * 60_000),
			verifyOtp: new RateLimiter(30, 60 * 60_000),
			signIn: new RateLimiter(20, 60 * 60_000),
			react: new RateLimiter(300, 60 * 60_000)
		}
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
