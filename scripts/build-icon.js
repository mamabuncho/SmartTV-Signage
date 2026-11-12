import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

async function buildIcon() {
  const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>

  <!-- TV Outer Frame -->
  <rect x="20" y="32" width="216" height="152" rx="20" fill="url(#bgGrad)" stroke="#3b82f6" stroke-width="6"/>
  
  <!-- TV Screen -->
  <rect x="32" y="44" width="192" height="128" rx="12" fill="url(#screenGrad)"/>

  <!-- Play Symbol -->
  <polygon points="112,84 156,108 112,132" fill="#ffffff"/>

  <!-- Signal Waves -->
  <circle cx="128" cy="108" r="48" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>

  <!-- TV Stand Base -->
  <path d="M104,184 L152,184 L164,216 L92,216 Z" fill="#334155"/>
  <rect x="76" y="212" width="104" height="12" rx="6" fill="#64748b"/>
</svg>
`;

  // Generate multi-size PNGs (16, 32, 48, 64, 128, 256)
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = [];

  for (const s of sizes) {
    const pngBuf = await sharp(Buffer.from(svg)).resize(s, s).png().toBuffer();
    images.push({ size: s, data: pngBuf });
  }

  // Calculate offsets for multi-icon ICO structure
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + (entrySize * images.length);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = Icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // Width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.data.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset
    entries.push(entry);
    offset += img.data.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...images.map(i => i.data)]);
  fs.writeFileSync('app.ico', icoBuffer);
  console.log(`Generated app.ico with ${images.length} resolutions (16px to 256px), total size: ${icoBuffer.length} bytes.`);
}

buildIcon().catch(console.error);
