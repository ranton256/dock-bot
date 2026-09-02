'use strict';

// Minimal PNG decoder: 8-bit truecolour with alpha, no interlacing.
//
// Deliberately independent of the generator. It shares no palette, no frame
// data, and no code with the encoder, because a validator fed by the encoder's
// own in-memory data only proves the encoder agrees with itself. This reads the
// bytes that ship.

const zlib = require('node:zlib');
const fs = require('node:fs');

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buf) {
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (buf[i] !== SIGNATURE[i]) throw new Error('not a PNG: bad signature');
  }

  let offset = 8;
  let header = null;
  const idatParts = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = data;
    else if (type === 'IDAT') idatParts.push(data);
    else if (type === 'IEND') { offset += length + 12; break; }
    offset += length + 12;
  }

  if (!header) throw new Error('no IHDR chunk');

  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8];
  const colorType = header[9];
  const interlace = header[12];

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  if (colorType !== 6) throw new Error(`unsupported colour type ${colorType}`);
  if (interlace !== 0) throw new Error('interlaced PNG not supported');
  if (idatParts.length === 0) throw new Error('no IDAT chunk');

  const raw = zlib.inflateSync(Buffer.concat(idatParts));
  const bpp = 4;
  const stride = width * bpp;
  const expected = height * (stride + 1);
  if (raw.length !== expected) {
    throw new Error(`inflated ${raw.length} bytes, expected ${expected}`);
  }

  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const value = raw[rowStart + x];
      const a = x >= bpp ? pixels[y * stride + x - bpp] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? pixels[(y - 1) * stride + x - bpp] : 0;
      let out;
      switch (filter) {
        case 0: out = value; break;
        case 1: out = value + a; break;
        case 2: out = value + b; break;
        case 3: out = value + ((a + b) >> 1); break;
        case 4: out = value + paeth(a, b, c); break;
        default: throw new Error(`unknown filter type ${filter} on row ${y}`);
      }
      pixels[y * stride + x] = out & 0xff;
    }
  }

  return { width, height, pixels };
}

function decodeFile(path) {
  return decodePNG(fs.readFileSync(path));
}

// Returns [r, g, b, a] at (x, y).
function pixelAt(image, x, y) {
  const i = (y * image.width + x) * 4;
  return [image.pixels[i], image.pixels[i + 1], image.pixels[i + 2], image.pixels[i + 3]];
}

module.exports = { decodePNG, decodeFile, pixelAt };
