// Pure Node.js PNG icon generator — no npm dependencies required
// Usage: node generate-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 for PNG chunk checksums
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// 5x5 pixel-art glyphs
const GLYPHS = {
  F: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
  C: [
    [0,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [0,1,1,1,1],
  ]
};

function createIcon(width, height, options = {}) {
  const {
    bgHex = '#1A1A18',
    fgHex = '#D4A017',
    text = 'FC',
    radiusFactor = 0.2
  } = options;

  const bgR = parseInt(bgHex.slice(1,3),16), bgG = parseInt(bgHex.slice(3,5),16), bgB = parseInt(bgHex.slice(5,7),16);
  const fgR = parseInt(fgHex.slice(1,3),16), fgG = parseInt(fgHex.slice(3,5),16), fgB = parseInt(fgHex.slice(5,7),16);
  const radius = Math.round(Math.min(width,height) * radiusFactor);

  const pixels = new Uint8Array(width * height * 4);

  // Fill background with rounded corners
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let alpha = 255;

      // Corner rounding check
      if (x < radius && y < radius) {
        const dx = x - radius + 1, dy = y - radius + 1;
        if (dx*dx + dy*dy > radius*radius) alpha = 0;
      } else if (x >= width - radius && y < radius) {
        const dx = x - (width - radius), dy = y - radius + 1;
        if (dx*dx + dy*dy > radius*radius) alpha = 0;
      } else if (x < radius && y >= height - radius) {
        const dx = x - radius + 1, dy = y - (height - radius);
        if (dx*dx + dy*dy > radius*radius) alpha = 0;
      } else if (x >= width - radius && y >= height - radius) {
        const dx = x - (width - radius), dy = y - (height - radius);
        if (dx*dx + dy*dy > radius*radius) alpha = 0;
      }

      pixels[idx] = bgR; pixels[idx+1] = bgG; pixels[idx+2] = bgB; pixels[idx+3] = alpha;
    }
  }

  // Draw "FC" glyphs centered
  const ROWS = 5, COLS = 5;
  const cellSize = Math.max(1, Math.round(Math.min(width,height) * 0.28 / ROWS));
  const glyphH = ROWS * cellSize;
  const glyphW = COLS * cellSize;
  const gap = Math.max(2, Math.round(Math.min(width,height) * 0.04));
  const totalW = text.length * glyphW + (text.length - 1) * gap;
  const startX = Math.round((width - totalW) / 2);
  const startY = Math.round((height - glyphH) / 2);

  for (let li = 0; li < text.length; li++) {
    const glyph = GLYPHS[text[li]];
    if (!glyph) continue;
    const offX = startX + li * (glyphW + gap);
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        if (!glyph[gy][gx]) continue;
        for (let cy = 0; cy < cellSize; cy++) {
          for (let cx = 0; cx < cellSize; cx++) {
            const px = offX + gx * cellSize + cx;
            const py = startY + gy * cellSize + cy;
            if (px < 0 || px >= width || py < 0 || py >= height) continue;
            const idx = (py * width + px) * 4;
            if (pixels[idx+3] === 0) continue; // outside rounded corner
            pixels[idx] = fgR; pixels[idx+1] = fgG; pixels[idx+2] = fgB; pixels[idx+3] = 255;
          }
        }
      }
    }
  }

  // Encode as PNG
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      row[1 + x*4] = pixels[src];   row[1 + x*4+1] = pixels[src+1];
      row[1 + x*4+2] = pixels[src+2]; row[1 + x*4+3] = pixels[src+3];
    }
    rawRows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rawRows), { level: 9 });
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // RGBA, no interlace

  const PNG_SIG = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  return Buffer.concat([PNG_SIG, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

// Ensure icons directory exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Generate app icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  const png = createIcon(size, size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`✓ icons/icon-${size}.png`);
});

// Generate screenshot placeholder (390x844)
const screenshot = createIcon(390, 844, { radiusFactor: 0.04, bgHex: '#1A1A18', fgHex: '#D4A017' });
fs.writeFileSync(path.join(iconsDir, 'screenshot-mobile.png'), screenshot);
console.log('✓ icons/screenshot-mobile.png');

console.log('\nDone! All icons generated in icons/');
