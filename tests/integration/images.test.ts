import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/lib/server/db';
import { FeedService } from '../../src/lib/server/forum/feed';
import { PostService } from '../../src/lib/server/forum/posts';
import { ReportService } from '../../src/lib/server/forum/reports';
import { ImageService } from '../../src/lib/server/images/service';
import { MemoryImageStore } from '../../src/lib/server/images/store';
import { makeAccount } from '../helpers/accounts';
import { clearData, freshDb } from '../helpers/db';
import { photoWithMetadata } from '../helpers/photo';

let sql: Sql;
let store: MemoryImageStore;
let images: ImageService;
let posts: PostService;
let feed: FeedService;
let reports: ReportService;
let alice: string;
let photo: Buffer;
const key = randomBytes(32);
const input = { category: 'hostel-mess', kind: 'grievance', title: 'Leaking ceiling in the corridor', body: 'See photos.' };

beforeAll(async () => {
	sql = await freshDb();
	photo = await photoWithMetadata();
	feed = new FeedService({ sql, handleKey: key });
	reports = new ReportService(sql);
});
afterAll(async () => {
	await sql.end();
});
beforeEach(async () => {
	await clearData(sql);
	store = new MemoryImageStore();
	images = new ImageService({ sql, store });
	posts = new PostService({ sql, handleKey: key, images });
	alice = await makeAccount(sql);
});

async function postWith(n: number) {
	const r = await posts.createPost(alice, input, Array(n).fill(photo));
	if (!r.ok) throw new Error(r.error);
	return r.id;
}

async function bytesOf(stream: ReadableStream<Uint8Array> | null) {
	return Buffer.from(await new Response(stream).arrayBuffer());
}

describe('posts with images', () => {
	it('stores processed images, in order, with their sizes', async () => {
		const id = await postWith(2);
		const thread = await posts.getThread(alice, id);
		expect(thread?.post.images).toHaveLength(2);
		expect(thread?.post.images[0]).toMatchObject({ width: 32, height: 64 });
		expect(store.files.size).toBe(2);
		const stored = await bytesOf(await images.open(thread!.post.images[0].id));
		const meta = await sharp(stored).metadata();
		expect(meta.format).toBe('webp');
		expect(meta.exif).toBeUndefined();
		expect(stored.toString('latin1')).not.toContain('SECRET');
	});

	it('counts images in the feed', async () => {
		await postWith(3);
		expect((await feed.list({ tab: 'all', sort: 'new' }))[0].imageCount).toBe(3);
	});

	it('refuses a fifth image, and anything that is not an image, storing nothing', async () => {
		expect(await posts.createPost(alice, input, Array(5).fill(photo))).toEqual({ ok: false, error: 'too_many_images' });
		expect(await posts.createPost(alice, input, [photo, Buffer.from('<svg/>')])).toEqual({ ok: false, error: 'invalid_image' });
		expect(store.files.size).toBe(0);
		const [{ n }] = await sql`select count(*)::int as n from posts`;
		expect(n).toBe(0);
	});

	it('refuses images when no image storage is configured', async () => {
		const bare = new PostService({ sql, handleKey: key });
		expect(await bare.createPost(alice, input, [photo])).toEqual({ ok: false, error: 'images_unavailable' });
		expect(await bare.createPost(alice, input)).toMatchObject({ ok: true });
	});

	it('creates no post when storage fails', async () => {
		store.failPuts = true;
		await expect(posts.createPost(alice, input, [photo])).rejects.toThrow();
		const [{ n }] = await sql`select count(*)::int as n from posts`;
		expect(n).toBe(0);
		expect(store.files.size).toBe(0);
	});

	it('permanently deletes images when the author deletes the post', async () => {
		const id = await postWith(2);
		const [first] = (await posts.getThread(alice, id))!.post.images;
		await posts.deletePost(alice, id);
		expect(await images.open(first.id)).toBeNull();
		expect(await images.purge()).toBe(2);
		expect(store.files.size).toBe(0);
		const [{ n }] = await sql`select count(*)::int as n from post_images`;
		expect(n).toBe(0);
	});

	it('permanently deletes images when a post is removed', async () => {
		const id = await postWith(1);
		await reports.remove('post', id);
		await images.purge();
		expect(store.files.size).toBe(0);
	});

	it('leaves published posts alone when purging', async () => {
		await postWith(1);
		expect(await images.purge()).toBe(0);
		expect(store.files.size).toBe(1);
	});
});
