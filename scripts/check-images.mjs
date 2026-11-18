// Verifies the image convention: images used by post `slug` live in
// public/images/<slug>/. Runs before every build (see "prebuild").
//   error   -> referenced image does not exist (fails the build)
//   warning -> image in another post's folder, unused image, or oversized file
import fs from 'node:fs';
import path from 'node:path';
import { POSTS_DIR, IMAGES_DIR, IMAGE_EXT_RE, MAX_BYTES } from './images-config.mjs';

const errors = [];
const warnings = [];
const referenced = new Set();

const posts = fs.readdirSync(POSTS_DIR, { recursive: true }).filter((f) => f.endsWith('.md'));
for (const rel of posts) {
  const file = path.join(POSTS_DIR, rel);
  const text = fs.readFileSync(file, 'utf8');
  const slug = text.match(/^slug:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
  const body = text.replace(/```[\s\S]*?```/g, ''); // ignore code blocks

  for (const [, src] of body.matchAll(/(\/images\/[^\s)"'<>]+)/g)) {
    const local = path.join('public', decodeURI(src));
    referenced.add(path.normalize(local));
    if (!fs.existsSync(local)) {
      errors.push(`${file}: missing image ${src}`);
    } else if (slug && !src.startsWith(`/images/${slug}/`)) {
      warnings.push(`${file}: ${src} should live in /images/${slug}/`);
    }
  }
}

const images = fs
  .readdirSync(IMAGES_DIR, { recursive: true })
  .map((f) => path.join(IMAGES_DIR, f))
  .filter((f) => IMAGE_EXT_RE.test(f));
for (const img of images) {
  if (!referenced.has(path.normalize(img))) warnings.push(`${img}: not used by any post`);
  const size = fs.statSync(img).size;
  if (size > MAX_BYTES) {
    warnings.push(`${img}: ${(size / 1024).toFixed(0)}KB, run \`npm run images\` to compress`);
  }
}

for (const w of warnings) console.warn(`[images] warning: ${w}`);
for (const e of errors) console.error(`[images] error: ${e}`);
console.log(`[images] ${images.length} images checked, ${errors.length} errors, ${warnings.length} warnings`);
if (errors.length) process.exit(1);
