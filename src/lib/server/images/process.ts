import sharp from 'sharp';

export const IMAGE_LIMITS = {
	perPost: 4,
	/** Longest side after processing. */
	maxEdge: 2048,
	/** Refused before decoding: stops "pixel bombs" that are tiny files but enormous images. */
	maxInputPixels: 40_000_000,
	/** Whole upload request, under Vercel's 4.5 MB limit. Browsers shrink photos well below this. */
	maxRequestBytes: 4_400_000
} as const;

const FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);

export interface ProcessedImage {
	bytes: Buffer;
	width: number;
	height: number;
}

// Serverless functions are short-lived; don't hold decoded images in memory between requests.
sharp.cache(false);

/**
 * Decodes an upload and encodes it again as WebP. Only pixels survive: sharp writes no EXIF, GPS,
 * XMP, IPTC, comments or colour profile unless asked to, and we never ask. Orientation is applied
 * to the pixels first. Returns null for anything that isn't a supported, sane image.
 */
export async function processImage(input: Uint8Array): Promise<ProcessedImage | null> {
	try {
		const meta = await sharp(input, { limitInputPixels: IMAGE_LIMITS.maxInputPixels }).metadata();
		if (!meta.format || !FORMATS.has(meta.format)) return null;
		const { data, info } = await sharp(input, { limitInputPixels: IMAGE_LIMITS.maxInputPixels, failOn: 'error', pages: 1 })
			.rotate()
			.resize({ width: IMAGE_LIMITS.maxEdge, height: IMAGE_LIMITS.maxEdge, fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 82 })
			.toBuffer({ resolveWithObject: true });
		return { bytes: data, width: info.width, height: info.height };
	} catch {
		return null;
	}
}
