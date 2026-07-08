// Genera los íconos de Aurora como PNG reales, a mano, sin ninguna dependencia
// de imágenes (no hay ImageMagick/Inkscape/sharp disponibles en esta máquina).
// Usa únicamente `node:zlib` (deflate, nativo) para el chunk IDAT del PNG.
// Se corre una sola vez (`node scripts/generate-icons.mjs`); el resultado se
// commitea como asset estático en `public/icons/`.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  const ihdr = chunk('IHDR', ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro: ninguno
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = chunk('IDAT', deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * El ícono de Aurora: el mismo degradé cálido del hero (`hero-amber`) con un
 * resplandor circular al centro — sin texto (evita tener que rasterizar
 * tipografía a mano). `safeZoneRatio` achica el resplandor para las variantes
 * "maskable" (Android puede recortar en círculo — todo lo importante debe
 * caber en el 80% central) y para el splash de iOS (formato angosto).
 */
function auroraIcon(width, height, { safeZoneRatio = 1 } = {}) {
  const rgba = Buffer.alloc(width * height * 4);
  const top = [246, 230, 200]; // #f6e6c8
  const bottom = [253, 250, 246]; // #fdfaf6
  const glow = [201, 168, 118]; // #c9a876
  const cx = width / 2;
  const cy = height / 2;
  const glowRadius = (Math.min(width, height) / 2) * 0.62 * safeZoneRatio;

  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const bgR = top[0] + (bottom[0] - top[0]) * t;
    const bgG = top[1] + (bottom[1] - top[1]) * t;
    const bgB = top[2] + (bottom[2] - top[2]) * t;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / glowRadius;
      const strength = Math.max(0, 1 - dist);
      const r = bgR + (glow[0] - bgR) * strength;
      const g = bgG + (glow[1] - bgG) * strength;
      const b = bgB + (glow[2] - bgB) * strength;
      const i = (y * width + x) * 4;
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', width: 192, height: 192, safeZoneRatio: 1 },
  { file: 'icon-512.png', width: 512, height: 512, safeZoneRatio: 1 },
  { file: 'icon-maskable-192.png', width: 192, height: 192, safeZoneRatio: 0.7 },
  { file: 'icon-maskable-512.png', width: 512, height: 512, safeZoneRatio: 0.7 },
  { file: 'apple-touch-icon.png', width: 180, height: 180, safeZoneRatio: 1 },
  // Un único splash genérico (no la matriz completa por dispositivo de iOS —
  // desproporcionado para una app personal de 2 personas; ver README).
  { file: 'apple-splash.png', width: 1170, height: 2532, safeZoneRatio: 0.35 },
];

for (const { file, width, height, safeZoneRatio } of targets) {
  const png = encodePng(width, height, auroraIcon(width, height, { safeZoneRatio }));
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`✓ ${file} (${width}x${height}, ${png.length} bytes)`);
}
