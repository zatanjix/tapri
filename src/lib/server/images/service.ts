import { randomBytes } from 'node:crypto';
import type { Sql } from '../db';
import type { ProcessedImage } from './process';
import type { ImageStore } from './store';

export interface StoredImage {
	id: string;
	width: number;
	height: number;
	bytes: number;
}

export class ImageService {
	constructor(private deps: { sql: Sql; store: ImageStore }) {}

	/** Stores processed images under fresh random ids. If any upload fails, the others are removed. */
	async upload(images: ProcessedImage[]): Promise<StoredImage[]> {
		const stored = images.map((img) => ({ id: randomBytes(16).toString('base64url'), width: img.width, height: img.height, bytes: img.bytes.length }));
		const results = await Promise.allSettled(images.map((img, i) => this.deps.store.put(stored[i].id, img.bytes)));
		if (results.some((r) => r.status === 'rejected')) {
			await this.discard(stored.map((s) => s.id));
			throw new Error('image upload failed');
		}
		return stored;
	}

	async discard(ids: string[]): Promise<void> {
		await this.deps.store.delete(ids).catch(() => {});
	}

	/** An image's bytes, only while its post is published. */
	async open(id: string): Promise<ReadableStream<Uint8Array> | null> {
		const [row] = await this.deps.sql`
			select 1 from post_images i join posts p on p.id = i.post_id
			where i.id = ${id} and p.status = 'published'`;
		return row ? this.deps.store.get(id) : null;
	}

	/**
	 * Permanently deletes the files of posts that were deleted or removed. Runs after every deletion
	 * and whenever the admin page opens, so a failed attempt is retried.
	 */
	async purge(): Promise<number> {
		const { sql, store } = this.deps;
		const rows = await sql`
			select i.id from post_images i join posts p on p.id = i.post_id
			where p.status <> 'published' limit 500`;
		if (!rows.length) return 0;
		const ids = rows.map((r) => r.id as string);
		await store.delete(ids);
		await sql`delete from post_images where id in ${sql(ids)}`;
		return ids.length;
	}
}
