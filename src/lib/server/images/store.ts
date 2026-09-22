import { del, get, put } from '@vercel/blob';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Where processed images live. Ids are random and contain nothing about the post or its author. */
export interface ImageStore {
	put(id: string, bytes: Uint8Array): Promise<void>;
	get(id: string): Promise<ReadableStream<Uint8Array> | null>;
	delete(ids: string[]): Promise<void>;
}

export const IMAGE_ID = /^[A-Za-z0-9_-]{22}$/;

const stream = (bytes: Uint8Array) => new Blob([new Uint8Array(bytes)]).stream();

export class MemoryImageStore implements ImageStore {
	files = new Map<string, Uint8Array>();
	failPuts = false;

	async put(id: string, bytes: Uint8Array) {
		if (this.failPuts) throw new Error('store unavailable');
		this.files.set(id, bytes);
	}
	async get(id: string) {
		const bytes = this.files.get(id);
		return bytes ? stream(bytes) : null;
	}
	async delete(ids: string[]) {
		for (const id of ids) this.files.delete(id);
	}
}

/** Local development only. */
export class FsImageStore implements ImageStore {
	constructor(private dir: string) {}

	async put(id: string, bytes: Uint8Array) {
		await mkdir(this.dir, { recursive: true });
		await writeFile(join(this.dir, `${id}.webp`), bytes);
	}
	async get(id: string) {
		try {
			return stream(await readFile(join(this.dir, `${id}.webp`)));
		} catch {
			return null;
		}
	}
	async delete(ids: string[]) {
		await Promise.all(ids.map((id) => rm(join(this.dir, `${id}.webp`), { force: true })));
	}
}

/**
 * Vercel Blob, private access: files can only be read with the project's credentials, which only
 * Tapri's server has. Browsers never see these URLs; images are streamed through /img/:id.
 */
export class BlobImageStore implements ImageStore {
	private path = (id: string) => `images/${id}.webp`;

	async put(id: string, bytes: Uint8Array) {
		await put(this.path(id), Buffer.from(bytes), { access: 'private', addRandomSuffix: false, contentType: 'image/webp' });
	}
	async get(id: string) {
		const result = await get(this.path(id), { access: 'private' });
		return result?.statusCode === 200 ? result.stream : null;
	}
	async delete(ids: string[]) {
		if (ids.length) await del(ids.map(this.path));
	}
}
