import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { IMAGE_LIMITS, processImage } from '../../src/lib/server/images/process';
import { photoWithMetadata, pixelBomb } from '../helpers/photo';

describe('processImage', () => {
	it('starts from a photo that really carries metadata', async () => {
		const photo = await photoWithMetadata();
		const meta = await sharp(photo).metadata();
		expect(meta.exif).toBeDefined();
		expect(meta.xmp).toBeDefined();
		expect(meta.icc).toBeDefined();
		expect(meta.orientation).toBe(6);
		expect(photo.toString('latin1')).toContain('SECRET-COMMENT');
		expect(photo.toString('latin1')).toContain('SECRET-HOSTEL-ROOM');
	});

	it('removes every kind of metadata and applies the orientation', async () => {
		const out = await processImage(await photoWithMetadata());
		expect(out).not.toBeNull();
		const meta = await sharp(out!.bytes).metadata();
		expect(meta.format).toBe('webp');
		for (const field of ['exif', 'xmp', 'icc', 'iptc', 'orientation', 'comments'] as const) expect(meta[field], field).toBeUndefined();
		expect([out!.width, out!.height]).toEqual([32, 64]);
		const raw = out!.bytes.toString('latin1');
		for (const trace of ['SECRET', 'TapriCam', 'Exif', 'ns.adobe.com', 'EXIF', 'XMP ', 'ICCP']) expect(raw, trace).not.toContain(trace);
	});

	it('scales large images down to the size limit', async () => {
		const big = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#888' } }).png().toBuffer();
		const out = await processImage(big);
		expect([out!.width, out!.height]).toEqual([IMAGE_LIMITS.maxEdge, 683]);
	});

	it('keeps small images at their size', async () => {
		const small = await sharp({ create: { width: 40, height: 30, channels: 4, background: '#0000' } }).png().toBuffer();
		expect(await processImage(small)).toMatchObject({ width: 40, height: 30 });
	});

	it('refuses things that are not images, and pixel bombs', async () => {
		expect(await processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
		expect(await processImage(Buffer.from('not an image at all'))).toBeNull();
		expect(await processImage(pixelBomb())).toBeNull();
	});
});
