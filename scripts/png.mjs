// A dependency-free PNG encoder (zlib deflate + CRC32 chunks), shared by
// scripts/build-og.mjs (truecolor RGB) and scripts/build-grain.mjs (indexed
// color with a tRNS alpha table).
import zlib from "zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function header(w, h, colorType) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colorType;
  return ihdr;
}

/** Rows of `bpp`-byte pixels, each prefixed with filter type 0 (none). */
function scanlines(w, h, bpp, data) {
  const stride = w * bpp;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return raw;
}

/** Truecolor RGB: `data` is w * h * 3 bytes. */
export function png({ w, h, data: rgb }) {
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header(w, h, 2)),
    chunk("IDAT", zlib.deflateSync(scanlines(w, h, 3, rgb), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Indexed color: `data` is w * h palette indices, `palette` is [[r, g, b, a]].
 * Alpha goes in a tRNS chunk, so a few-level alpha texture stays tiny.
 */
export function pngIndexed({ w, h, data, palette }) {
  const plte = Buffer.from(palette.flatMap(([r, g, b]) => [r, g, b]));
  const trns = Buffer.from(palette.map(([, , , a]) => a));
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header(w, h, 3)),
    chunk("PLTE", plte),
    chunk("tRNS", trns),
    chunk("IDAT", zlib.deflateSync(scanlines(w, h, 1, data), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
