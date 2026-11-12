// Generates PWA icons as PNGs with no dependencies (raw RGBA + zlib).
// Dumbbell glyph in emerald on the app canvas color.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const BG = [10, 10, 11, 255]; // #0A0A0B
const FG = [16, 185, 129, 255]; // #10B981

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Rounded-rect coverage test in unit space [0,1].
function inRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  if (dx <= 0 || dy <= 0) return Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh;
  return dx * dx + dy * dy <= r * r;
}

function render(size, { maskable = false, rounded = true } = {}) {
  const SS = 4;
  const W = size * SS;
  const buf = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.72 : 1; // maskable safe zone
  const cornerR = rounded && !maskable ? 0.22 : 0;

  // Dumbbell geometry in unit space, centered at (0.5, 0.5).
  const u = (v) => 0.5 + (v - 0.5) * scale;
  const shapes = [
    // bar
    { cx: 0.5, cy: 0.5, hw: 0.30, hh: 0.035, r: 0.03 },
    // inner plates
    { cx: 0.245, cy: 0.5, hw: 0.045, hh: 0.17, r: 0.03 },
    { cx: 0.755, cy: 0.5, hw: 0.045, hh: 0.17, r: 0.03 },
    // outer plates
    { cx: 0.145, cy: 0.5, hw: 0.035, hh: 0.115, r: 0.025 },
    { cx: 0.855, cy: 0.5, hw: 0.035, hh: 0.115, r: 0.025 },
  ].map((s) => ({
    cx: u(s.cx), cy: u(s.cy), hw: s.hw * scale, hh: s.hh * scale, r: s.r * scale,
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgCount = 0;
      let fgCount = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x * SS + sx + 0.5) / W;
          const py = (y * SS + sy + 0.5) / W;
          const inside = cornerR === 0 || inRoundRect(px, py, 0.5, 0.5, 0.5, 0.5, cornerR);
          if (!inside) continue;
          bgCount++;
          for (const s of shapes) {
            if (inRoundRect(px, py, s.cx, s.cy, s.hw, s.hh, s.r)) {
              fgCount++;
              break;
            }
          }
        }
      }
      const total = SS * SS;
      const i = (y * size + x) * 4;
      const bgA = bgCount / total;
      const fgA = fgCount / total;
      // fg over bg over transparent
      const outA = fgA + bgA * (1 - fgA);
      if (outA === 0) {
        buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0;
      } else {
        for (let c = 0; c < 3; c++) {
          buf[i + c] = Math.round((FG[c] * fgA + BG[c] * bgA * (1 - fgA)) / outA);
        }
        buf[i + 3] = Math.round(outA * 255);
      }
    }
  }
  return encodePNG(size, size, buf);
}

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-512.png', 512, { maskable: true }],
  ['apple-touch-180.png', 180, { rounded: false }],
];

for (const [name, size, opts] of targets) {
  fs.writeFileSync(path.join(outDir, name), render(size, opts));
  console.log(`wrote public/icons/${name} (${size}x${size})`);
}