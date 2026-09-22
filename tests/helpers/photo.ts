import { crc32 } from 'node:zlib';
import sharp from 'sharp';

const u16 = (n: number) => Buffer.from([n & 0xff, n >> 8]);
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const entry = (tag: number, type: number, count: number, value: Buffer) =>
	Buffer.concat([u16(tag), u16(type), u32(count), Buffer.concat([value, Buffer.alloc(4)]).subarray(0, 4)]);
const segment = (marker: number, body: Buffer) => {
	const len = Buffer.alloc(2);
	len.writeUInt16BE(body.length + 2);
	return Buffer.concat([Buffer.from([0xff, marker]), len, body]);
};

/** A little-endian TIFF with a camera make, orientation 6 and GPS latitude 19°7'42"N (IIT Bombay). */
function exif(): Buffer {
	const make = Buffer.from('TapriCam\0');
	const ifd0 = Buffer.concat([
		u16(3),
		entry(0x010f, 2, make.length, u32(50)),
		entry(0x0112, 3, 1, u16(6)),
		entry(0x8825, 4, 1, u32(60)),
		u32(0)
	]);
	const gps = Buffer.concat([u16(2), entry(0x0001, 2, 2, Buffer.from('N\0')), entry(0x0002, 5, 3, u32(90)), u32(0)]);
	const rationals = Buffer.concat([u32(19), u32(1), u32(7), u32(1), u32(4200), u32(100)]);
	const tiff = Buffer.concat([Buffer.from('II'), u16(42), u32(8), ifd0, make, Buffer.alloc(1), gps, rationals]);
	return Buffer.concat([Buffer.from('Exif\0\0'), tiff]);
}

/** A 64×32 JPEG carrying EXIF (GPS, camera, orientation 6), XMP, a comment and a Display P3 profile. */
export async function photoWithMetadata(): Promise<Buffer> {
	const jpeg = await sharp({ create: { width: 64, height: 32, channels: 3, background: { r: 200, g: 120, b: 40 } } })
		.withIccProfile('p3')
		.jpeg()
		.toBuffer();
	const xmp = Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0'), Buffer.from('<x:xmpmeta><rdf:Description where="SECRET-HOSTEL-ROOM"/></x:xmpmeta>')]);
	const extra = Buffer.concat([segment(0xe1, exif()), segment(0xe1, xmp), segment(0xfe, Buffer.from('SECRET-COMMENT'))]);
	return Buffer.concat([jpeg.subarray(0, 2), extra, jpeg.subarray(2)]);
}

/** A PNG whose header claims 100,000 × 100,000 pixels. */
export function pixelBomb(): Buffer {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(100_000, 0);
	ihdr.writeUInt32BE(100_000, 4);
	ihdr.set([8, 2, 0, 0, 0], 8);
	const chunk = (type: string, data: Buffer) => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const body = Buffer.concat([Buffer.from(type), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body));
		return Buffer.concat([len, body, crc]);
	};
	return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IEND', Buffer.alloc(0))]);
}
