// Generates MUEDial PWA icons from the existing Hoo brand mark.
//
// Source: public/images/hoo-icon.webp (2048×2048, opaque cream background — the
// canonical Hoo character mark). We prefer this over public/logo.svg because the
// logo is a wide wordmark (1800×1130) that does not square cleanly.
//
// Outputs (PWA Phase 0):
//   public/icons/dial-icon-192.png          — manifest "any" 192
//   public/icons/dial-icon-512.png          — manifest "any" 512
//   public/icons/dial-icon-maskable-512.png — manifest "maskable" 512 (extra safe-zone padding)
//   public/icons/apple-touch-icon-180.png   — iOS home-screen icon
//
// Run: node scripts/gen-pwa-icons.mjs
import sharp from 'sharp';

const SRC = 'public/images/hoo-icon.webp';
const OUT = 'public/icons';

// Cream background sampled from the source corners (uniform rgb(245,224,189)).
const CREAM = { r: 245, g: 224, b: 189, alpha: 1 };

async function plain(size, file) {
  await sharp(SRC).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`);
  console.log(`✓ ${file} (${size}×${size})`);
}

async function maskable(size, file) {
  // Maskable safe zone = inner 80%. The owl already fills ~85% of the source frame,
  // so we shrink the whole mark to 80% of the canvas and pad with the cream bg → the
  // owl lands at ~68% of the maskable canvas, comfortably inside the safe circle.
  const inner = Math.round(size * 0.8);
  const mark = await sharp(SRC).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
  const pad = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: mark, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${file}`);
  console.log(`✓ ${file} (${size}×${size}, maskable)`);
}

await plain(192, 'dial-icon-192.png');
await plain(512, 'dial-icon-512.png');
await maskable(512, 'dial-icon-maskable-512.png');
await plain(180, 'apple-touch-icon-180.png');
console.log('done');
