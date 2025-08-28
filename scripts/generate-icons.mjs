import sharp from 'sharp';
import { mkdir, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const srcCandidates = [
  path.join(projectRoot, 'public', 'images', 'openlogo.png'),
  path.join(projectRoot, 'public', 'images', 'FFlogo.jpg'),
];
const iconsDir = path.join(projectRoot, 'public', 'icons');
const screenshotsDir = path.join(projectRoot, 'public', 'screenshots');

const brand = {
  fg: '#000000', // theme_color
  bg: '#ffffff', // background_color
};

const outputs = [
  { size: 192, out: path.join(iconsDir, 'icon-192-FF.png') },
  { size: 512, out: path.join(iconsDir, 'icon-512-FF.png') },
  { size: 180, out: path.join(iconsDir, 'apple-touch-icon-FF.png') },
];

const maskableOutputs = [
  { size: 192, out: path.join(iconsDir, 'icon-maskable-192-FF.png') },
  { size: 512, out: path.join(iconsDir, 'icon-maskable-512-FF.png') },
];

const screenshots = [
  { w: 1200, h: 800, label: 'Dashboard', out: path.join(screenshotsDir, 'app-wide-1200x800.png') },
  { w: 750, h: 1334, label: 'Home', out: path.join(screenshotsDir, 'app-mobile-750x1334.png') },
];

async function pickSource() {
  for (const p of srcCandidates) {
    try {
      await access(p);
      return p;
    } catch (_) {
      // try next
    }
  }
  return null; // no source
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function generateIconFromSource(inputPath, size, outPath) {
  // Use contain to preserve aspect ratio, padding transparent to square
  const pipeline = sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 });
  await pipeline.toFile(outPath);
  console.log(`✔ Wrote ${path.relative(projectRoot, outPath)} (${size}x${size})`);
}

async function generateMaskableFromSource(inputPath, size, outPath) {
  // Keep artwork in ~80% safe area for maskable icons
  const safe = Math.floor(size * 0.8);
  const resized = await sharp(inputPath)
    .resize(safe, safe, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const left = Math.floor((size - safe) / 2);
  const top = Math.floor((size - safe) / 2);

  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✔ Wrote ${path.relative(projectRoot, outPath)} maskable (${size}x${size})`);
}

function svgPlaceholderSquare(size, label) {
  const fontSize = Math.floor(size * 0.18); // large centered text
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brand.bg}"/>
  <text x="50%" y="50%" fill="${brand.fg}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

async function generatePlaceholderIcon(size, outPath, label) {
  const svg = svgPlaceholderSquare(size, label);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`✔ Wrote ${path.relative(projectRoot, outPath)} placeholder (${size}x${size})`);
}

function svgPlaceholderRect(w, h, label) {
  const fontSize = Math.floor(Math.min(w, h) * 0.12);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brand.bg}"/>
  <text x="50%" y="50%" fill="${brand.fg}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

async function generateScreenshotPlaceholder(w, h, label, outPath) {
  const svg = svgPlaceholderRect(w, h, label);
  await ensureDir(path.dirname(outPath));
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`✔ Wrote ${path.relative(projectRoot, outPath)} (${w}x${h})`);
}

async function main() {
  await ensureDir(iconsDir);
  await ensureDir(screenshotsDir);

  const src = await pickSource();
  if (src) {
    console.log(`Using source: ${path.relative(projectRoot, src)}`);
    for (const { size, out } of outputs) {
      await generateIconFromSource(src, size, out);
    }
    for (const { size, out } of maskableOutputs) {
      await generateMaskableFromSource(src, size, out);
    }
  } else {
    console.warn('No source logo found. Generating placeholder icons instead.');
    for (const { size, out } of outputs) {
      const label = size === 180 ? 'Apple Touch' : `${size}x${size}`;
      await generatePlaceholderIcon(size, out, label);
    }
    for (const { size, out } of maskableOutputs) {
      await generatePlaceholderIcon(size, out, `Maskable ${size}`);
    }
  }

  for (const { w, h, label, out } of screenshots) {
    await generateScreenshotPlaceholder(w, h, label, out);
  }

  console.log('All assets generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
