import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  table[i] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([t, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

function createSpiceIconPNG(width, height, isMaskable = false) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.45 : width * 0.46;
  const innerRadius = radius * 0.88;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: Deep Spice Brown (#451a03 / #78350f)
      let r = 120;
      let g = 53;
      let b = 15;
      let a = 255;

      // Slight vertical gradient for rich premium leather / cinnamon bark tone
      const gradientFactor = y / height;
      r = Math.floor(100 + gradientFactor * 40);
      g = Math.floor(40 + gradientFactor * 25);
      b = Math.floor(10 + gradientFactor * 10);

      // Golden ring (#f59e0b)
      if (dist >= innerRadius && dist <= radius) {
        r = 245;
        g = 158;
        b = 11;
      } else if (dist < innerRadius) {
        // Inner badge: Dark Royal Spice Amber (#5b2207)
        r = 91;
        g = 34;
        b = 7;

        // Draw Stylized Spice Diamond / Star in center
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const diamondSize = radius * 0.55;
        if (adx / diamondSize + ady / diamondSize <= 1.0) {
          // Warm gold center (#fbbf24)
          r = 251;
          g = 191;
          b = 36;

          // Inner core accent (#78350f)
          if (adx / (diamondSize * 0.45) + ady / (diamondSize * 0.45) <= 1.0) {
            r = 180;
            g = 83;
            b = 9;
          }
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSpiceIconPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSpiceIconPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSpiceIconPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSpiceIconPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createSpiceIconPNG(64, 64, false));

// Also write crisp SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#grad)" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="url(#gold)" stroke-width="20" />
  <circle cx="256" cy="256" r="150" fill="#291102" />
  <path d="M256 140 L330 256 L256 372 L182 256 Z" fill="url(#gold)" />
  <path d="M256 190 L295 256 L256 322 L217 256 Z" fill="#78350f" />
  <text x="256" y="272" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle">NA</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');

console.log('✅ Generated PWA icons in /public successfully:');
console.log(' - pwa-192x192.png');
console.log(' - pwa-512x512.png');
console.log(' - pwa-maskable-512x512.png');
console.log(' - apple-touch-icon.png');
console.log(' - favicon.ico');
console.log(' - favicon.svg');
