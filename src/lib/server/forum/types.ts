import type { Block } from '../../shared/markdown';

export type Kind = 'grievance' | 'conversation';
export type Status = 'published' | 'deleted' | 'removed';

export const LIMITS = {
	titleMin: 5,
	titleMax: 150,
	bodyMax: 10_000,
	replyMax: 5_000,
	excerpt: 280
} as const;

/** A post's image, served at /img/:id to signed-in members. */
export interface ImageRef {
	id: string;
	width: number;
	height: number;
}

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
	/** The body as formatted blocks, or null for posts written before markdown (shown as plain text). */
	doc: Block[] | null;
	images: ImageRef[];
	handle: string;
	publishedOn: string;
	upvotes: number;
	downvotes: number;
	metoo: number;
	replyCount: number;
	myVote: -1 | 0 | 1;
	canDownvote: boolean;
	metooed: boolean;
	following: boolean;
	mine: boolean;
	distress: boolean;
	official: boolean;
}

export interface ReplyView {
	id: number;
	parentId: number | null;
	handle: string;
	isOp: boolean;
	status: Status;
	body: string;
	doc: Block[] | null;
	publishedOn: string;
	upvotes: number;
	downvotes: number;
	myVote: -1 | 0 | 1;
	mine: boolean;
	distress: boolean;
	official: boolean;
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
	/** Only on the Following tab: replies since the viewer last opened the thread. */
	newReplies?: number;
	imageCount: number;
	distress: boolean;
	official: boolean;
}

export type Result<T, E extends string> = ({ ok: true } & T) | { ok: false; error: E };
