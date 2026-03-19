/**
 * scripts/create-icon.js
 *
 * Generates assets/icon.png at install time using only built-in
 * Node.js modules (zlib + fs). No native add-ons required.
 *
 * Icon design: 32×32 RGBA circle split into a blue left half
 * and orange right half, divided by a white 2px line — visually
 * representing the two sides of the court tracker toggle.
 */

'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

/* ── CRC32 (required by PNG spec for each chunk) ──────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len       = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = crc32(Buffer.concat([typeBytes, data]));
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

/* ── Build pixel data ─────────────────────────────────────────── */
const SIZE   = 32;
const RADIUS = SIZE / 2 - 2;
const CX     = (SIZE - 1) / 2;
const CY     = (SIZE - 1) / 2;

// RGBA color constants  [R, G, B, A]
const BLUE   = [0x5b, 0x8d, 0xf6, 0xff]; // #5b8df6 — left court
const ORANGE = [0xf6, 0x85, 0x5b, 0xff]; // #f6855b — right court
const WHITE  = [0xff, 0xff, 0xff, 0xff];
const CLEAR  = [0x00, 0x00, 0x00, 0x00]; // transparent (outside circle)

// Each scanline: 1 filter byte (0x00 = None) + SIZE × 4 bytes (RGBA)
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));

for (let y = 0; y < SIZE; y++) {
  const base = y * (1 + SIZE * 4);
  raw[base] = 0; // filter type: None

  for (let x = 0; x < SIZE; x++) {
    const dist  = Math.sqrt((x - CX) ** 2 + (y - CY) ** 2);
    const off   = base + 1 + x * 4;

    let color;
    if (dist > RADIUS) {
      color = CLEAR;                    // outside circle → transparent
    } else if (Math.abs(x - CX) < 1.2) {
      color = WHITE;                    // centre divider line → white
    } else if (x < CX) {
      color = BLUE;                     // left half → blue
    } else {
      color = ORANGE;                   // right half → orange
    }

    raw[off] = color[0]; raw[off + 1] = color[1];
    raw[off + 2] = color[2]; raw[off + 3] = color[3];
  }
}

/* ── Assemble PNG ─────────────────────────────────────────────── */
const idat = zlib.deflateSync(raw);

// IHDR: width, height, bit-depth=8, colour-type=6 (RGBA), comp=0, filter=0, interlace=0
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const png = Buffer.concat([
  PNG_SIG,
  makeChunk('IHDR', ihdr),
  makeChunk('IDAT', idat),
  makeChunk('IEND', Buffer.alloc(0)),
]);

/* ── Write to disk ────────────────────────────────────────────── */
const outDir  = path.join(__dirname, '..', 'assets');
const outPath = path.join(outDir, 'icon.png');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, png);
console.log('✓ Court Tracker icon generated:', outPath);
