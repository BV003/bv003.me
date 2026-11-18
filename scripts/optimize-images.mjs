// Compresses images in public/images that are too large or carry EXIF data
// (which may include GPS location). Already-optimized files are skipped, so
// it is safe to run repeatedly:  npm run images
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { IMAGES_DIR, MAX_WIDTH, MAX_BYTES } from './images-config.mjs';

const files = fs
  .readdirSync(IMAGES_DIR, { recursive: true })
  .map((f) => path.join(IMAGES_DIR, f))
  .filter((f) => /\.(jpe?g|png)$/i.test(f));

let changed = 0;
for (const file of files) {
  const before = fs.statSync(file).size;
  const meta = await sharp(file).metadata();
  const isPng = meta.format === 'png';
  const needsWork = meta.width > MAX_WIDTH || before > MAX_BYTES || (!isPng && meta.exif);
  if (!needsWork) continue;

  let img = sharp(file).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  img = isPng
    ? img.png({ compressionLevel: 9, palette: true, quality: 90 })
    : img.jpeg({ quality: 80, mozjpeg: true });
  const buf = await img.toBuffer();
  fs.writeFileSync(file, buf);
  changed++;
  console.log(`${file}: ${(before / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB`);
}
console.log(`[images] ${changed} of ${files.length} images optimized`);
