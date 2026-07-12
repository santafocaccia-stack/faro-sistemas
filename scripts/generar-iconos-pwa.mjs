/**
 * Genera los íconos PWA (public/icons/) desde un SVG con la "G" de Gesto:
 * mismo lenguaje que el logo del sidebar (gradiente primario → naranja oscuro).
 * Uso: node scripts/generar-iconos-pwa.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// pad = margen interno (zona segura maskable ~20% por lado usa pad grande)
function svgG(size, { pad = 0, radius = 0.225 } = {}) {
  const s = size - pad * 2;
  const r = Math.round(s * radius);
  const fontSize = Math.round(s * 0.62);
  const cx = size / 2;
  // dominant-baseline=central centra la G verticalmente
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF7518"/>
      <stop offset="1" stop-color="#C2410C"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${s}" height="${s}" rx="${r}" fill="url(#g)"/>
  <text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central"
        font-family="Segoe UI, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#ffffff">G</text>
</svg>`);
}

const jobs = [
  { file: 'icon-192.png',          size: 192, opts: {} },
  { file: 'icon-512.png',          size: 512, opts: {} },
  // maskable: la G ocupa el 100% del lienzo (el SO recorta el círculo/squircle)
  { file: 'icon-maskable-512.png', size: 512, opts: { radius: 0 } },
  { file: 'apple-touch-icon.png',  size: 180, opts: { radius: 0 } }, // iOS redondea solo
];

for (const { file, size, opts } of jobs) {
  await sharp(svgG(size, opts)).png().toFile(join(OUT, file));
  console.log('✅', file);
}
