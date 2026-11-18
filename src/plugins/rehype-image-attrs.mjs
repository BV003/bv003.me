// Adds loading/decoding hints and intrinsic width/height (to avoid layout
// shift) to <img> tags that point at files under /public.
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');
const cache = new Map();

function sizeOf(src) {
  if (!cache.has(src)) {
    const file = path.join(PUBLIC_DIR, decodeURI(src));
    cache.set(
      src,
      fs.existsSync(file)
        ? sharp(file).metadata().then((m) => (m.width && m.height ? m : null), () => null)
        : Promise.resolve(null),
    );
  }
  return cache.get(src);
}

function collect(node, out) {
  if (node.type === 'element' && node.tagName === 'img') out.elements.push(node);
  else if (node.type === 'raw' && node.value.includes('<img')) out.raw.push(node);
  for (const child of node.children ?? []) collect(child, out);
  return out;
}

const IMG_TAG_RE = /<img\b[^>]*>/gi;
const hasAttr = (tag, name) => new RegExp(`\\s${name}\\s*=`, 'i').test(tag);

// Raw HTML written directly in markdown (e.g. <figure><img ...></figure>).
async function patchRawHtml(node) {
  const tags = node.value.match(IMG_TAG_RE) ?? [];
  const patched = await Promise.all(
    tags.map(async (tag) => {
      const extra = [];
      if (!hasAttr(tag, 'loading')) extra.push('loading="lazy"');
      if (!hasAttr(tag, 'decoding')) extra.push('decoding="async"');
      const src = tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if (src?.startsWith('/') && !hasAttr(tag, 'width') && !hasAttr(tag, 'height')) {
        const meta = await sizeOf(src);
        if (meta) extra.push(`width="${meta.width}"`, `height="${meta.height}"`);
      }
      return extra.length ? tag.replace(/^<img\b/i, `<img ${extra.join(' ')}`) : tag;
    }),
  );
  let i = 0;
  node.value = node.value.replace(IMG_TAG_RE, () => patched[i++]);
}

export default function rehypeImageAttrs() {
  return async (tree) => {
    const { elements, raw } = collect(tree, { elements: [], raw: [] });
    await Promise.all(raw.map(patchRawHtml));
    await Promise.all(
      elements.map(async (img) => {
        const props = (img.properties ??= {});
        props.loading ??= 'lazy';
        props.decoding ??= 'async';
        const src = props.src;
        if (typeof src !== 'string' || !src.startsWith('/') || (props.width && props.height)) return;
        const meta = await sizeOf(src);
        if (meta) {
          props.width = meta.width;
          props.height = meta.height;
        }
      }),
    );
  };
}
