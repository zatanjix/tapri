export type Kind = 'grievance' | 'conversation';
export type Status = 'published' | 'deleted' | 'removed';

export const LIMITS = {
	titleMin: 5,
	titleMax: 150,
	bodyMax: 10_000,
	replyMax: 5_000,
	excerpt: 280
} as const;

export interface CategoryRef {
	slug: string;
	name: string;
}

/** Views never contain account ids. Handles are the only identity shown. */
export interface PostView {
	id: number;
	category: CategoryRef;
	kind: Kind;
	title: string;
	body: string;
	handle: string;
	publishedOn: string;
	upvotes: number;
	metoo: number;
	replyCount: number;
	voted: boolean;
	metooed: boolean;
	mine: boolean;
	distress: boolean;
}

export interface ReplyView {
	id: number;
	parentId: number | null;
	handle: string;
	isOp: boolean;
	status: Status;
	body: string;
	publishedOn: string;
	upvotes: number;
	voted: boolean;
	mine: boolean;
	distress: boolean;
	children: ReplyView[];
}

export interface ThreadView {
	post: PostView;
	replies: ReplyView[];
	viewerHandle: string;
}

export interface FeedItem {
	id: number;
	category: CategoryRef;
	kind: Kind;
	title: string;
	excerpt: string;
	handle: string;
	publishedOn: string;
	upvotes: number;
	metoo: number;
	replyCount: number;
	distress: boolean;
}

export type Result<T, E extends string> = ({ ok: true } & T) | { ok: false; error: E };
