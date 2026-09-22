/**
 * Runs in the browser before anything is uploaded. Drawing a photo onto a canvas and exporting it
 * keeps only the pixels: location, camera, time and every other kind of metadata stay on this
 * device. (The server strips everything again anyway, whatever arrives.)
 */
const MAX_EDGE = 2048;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
	try {
		// 'from-image' applies the camera's rotation, so the photo isn't sideways once metadata is gone.
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		// Some browsers only decode certain formats (like iPhone HEIC photos) through <img>.
		const url = URL.createObjectURL(file);
		try {
			const img = new Image();
			img.src = url;
			await img.decode();
			return img;
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
	new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

/** A metadata-free WebP (or JPEG where the browser can't make WebP), at most 2048px on its longest side. */
export async function prepareImage(file: File): Promise<Blob | null> {
	try {
		const source = await decode(file);
		const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
		const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
		const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(w * scale));
		canvas.height = Math.max(1, Math.round(h * scale));
		canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
		if ('close' in source) source.close();
		const webp = await toBlob(canvas, 'image/webp');
		return webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg');
	} catch {
		return null;
	}
}
