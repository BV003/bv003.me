#!/usr/bin/env node
// Append-only sync: blog posts -> Substack.
//
// Rules:
//   - Only CREATES new posts. Never touches posts it did not create; never deletes anything.
//     (PUT is allowed only on drafts whose id this script recorded in the ledger.)
//   - A blog post is skipped if its slug is in substack-sync.json (the ledger).
//   - Progress is written to the ledger after every step, so a failed run resumes cleanly.
//
// Usage:
//   node scripts/substack-sync.mjs --dry-run                # convert only, previews in .substack-preview/
//   SUBSTACK_SID=... node scripts/substack-sync.mjs [flags]
//     --publish      publish after creating the draft (default: draft only)
//     --send-email   email subscribers when publishing (default: no email)
//     --backdate     set the Substack post date to the blog pubDate (for backfilling old posts)
//     --refresh      re-render posts THIS SCRIPT published earlier (needs --only <slug> or --all-own);
//                    updates them in place, never emails, never touches posts it did not create
//     --limit N      stop after N posts;  --only <slug>  sync just that post
//
// SUBSTACK_SID is the value of the `substack.sid` cookie from a logged-in browser session.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { renderCover } from './cover.mjs';
import { renderTable } from './render-table.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const PUBLIC_DIR = path.join(ROOT, 'public');
const LEDGER = path.join(ROOT, 'substack-sync.json');
const PREVIEW_DIR = path.join(ROOT, '.substack-preview');
const SITE = 'https://bv003me.vercel.app';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const PUBLISH = args.includes('--publish');
const SEND_EMAIL = args.includes('--send-email');
const BACKDATE = args.includes('--backdate');
const REFRESH = args.includes('--refresh');
const ALL_OWN = args.includes('--all-own');

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const PUB = ledger.publication.replace(/\/$/, '');

// ---------------------------------------------------------------- posts

function loadPosts() {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!m) throw new Error(`${f}: missing frontmatter`);
      const data = yaml.load(m[1]);
      return { file: f, data, body: m[2], slug: String(data.slug) };
    })
    .filter((p) => !p.data.draft)
    .sort((a, b) => new Date(a.data.pubDate) - new Date(b.data.pubDate)); // oldest first
}

// ---------------------------------------------------------------- markdown -> Substack ProseMirror JSON

const CJK = /[　-〿㐀-鿿＀-￯]/;
// Soft line breaks: join CJK lines without a space, everything else with a space.
function joinSoftBreaks(s) {
  return s.replace(/[ \t]*\n[ \t]*/g, (_, i, str) => {
    const prev = str[i - 1] ?? '';
    const next = str[i + _.length] ?? '';
    return CJK.test(prev) && CJK.test(next) ? '' : ' ';
  });
}

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '(': '⁽', ')': '⁾', '+': '⁺', '-': '⁻', '=': '⁼', n: 'ⁿ', i: 'ⁱ', T: 'ᵀ' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '(': '₍', ')': '₎', '+': '₊', '-': '₋', '=': '₌', i: 'ᵢ', j: 'ⱼ' };
const script = (s, map, fallback) => ([...s].every((c) => map[c]) ? [...s].map((c) => map[c]).join('') : `${fallback}(${s})`);

const decodeEntities = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, ''));

function absUrl(url) {
  if (!url) return url;
  if (/^(https?:|mailto:|#)/.test(url)) return url;
  return SITE + (url.startsWith('/') ? '' : '/') + url;
}

const IMAGE_ATTRS = { src: '', alt: null, title: null, type: null, href: null, belowTheFold: false, internalRedirect: null, fullscreen: null, imageSize: null, height: null, width: null, resizeWidth: null, bytes: null, topImage: false };
const latexId = () => Math.random().toString(36).slice(2, 12);
const text = (t, marks) => (t ? { type: 'text', text: t, ...(marks?.length ? { marks } : {}) } : null);
const para = (content) => ({ type: 'paragraph', ...(content?.length ? { content } : {}) });

class Converter {
  constructor(post, uploadImage, uploadPng) {
    this.post = post;
    this.uploadImage = uploadImage;
    this.uploadPng = uploadPng;
    this.defs = {};
    this.footnotes = [];
    this.footnoteOrder = [];
    this.warnings = [];
  }

  async convert() {
    const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(this.post.body);
    for (const n of tree.children) {
      if (n.type === 'definition') this.defs[n.identifier] = n;
      if (n.type === 'footnoteDefinition') this.footnotes[n.identifier] = n;
    }
    const content = await this.blocks(tree.children);

    if (this.footnoteOrder.length) {
      content.push({ type: 'horizontal_rule' });
      for (const [i, id] of this.footnoteOrder.entries()) {
        const def = this.footnotes[id];
        const inner = def ? await this.inlineOf(def.children.flatMap((c) => c.children ?? [c])) : [];
        content.push(para([text(`[${i + 1}] `), ...inner].filter(Boolean)));
      }
    }

    content.push({ type: 'horizontal_rule' });
    const url = `${SITE}/blog/${this.post.slug}/`;
    content.push(para([text('Originally published at '), text(url, [{ type: 'link', attrs: { href: url } }])]));
    return { type: 'doc', content };
  }

  async blocks(nodes) {
    const out = [];
    for (const n of nodes) out.push(...(await this.block(n)));
    return out;
  }

  async block(n) {
    switch (n.type) {
      case 'paragraph':
        return this.paragraph(n.children);
      case 'heading':
        return [{ type: 'heading', attrs: { level: Math.min(Math.max(n.depth, 1), 6) }, content: await this.inlineOf(n.children) }].filter(
          (h) => h.content.length,
        );
      case 'thematicBreak':
        return [{ type: 'horizontal_rule' }];
      case 'blockquote':
        return [{ type: 'blockquote', content: await this.blocks(n.children) }];
      case 'list': {
        const items = [];
        for (const li of n.children) {
          let content = await this.blocks(li.children);
          if (!content.length) content = [para()];
          if (li.checked != null && content[0].type === 'paragraph') {
            content[0].content = [text(li.checked ? '☑ ' : '☐ '), ...(content[0].content ?? [])];
          }
          items.push({ type: 'list_item', content });
        }
        return [
          n.ordered
            ? { type: 'ordered_list', attrs: { start: n.start ?? 1, order: n.start ?? 1 }, content: items }
            : { type: 'bullet_list', content: items },
        ];
      }
      case 'code':
        return [{ type: 'code_block', attrs: { language: n.lang || null }, content: n.value ? [text(n.value)] : undefined }];
      case 'math':
        return [{ type: 'latex_block', attrs: { persistentExpression: n.value, id: latexId() } }];
      case 'table':
        return [await this.table(n)];
      case 'html':
        return this.htmlBlock(n.value);
      case 'definition':
      case 'footnoteDefinition':
      case 'yaml':
        return [];
      default:
        this.warnings.push(`unsupported block "${n.type}" kept as plain text`);
        return [para([text(stripTags(String(n.value ?? '')))].filter(Boolean))];
    }
  }

  // Substack has no table node: render the table to an image (alt text keeps the content).
  async table(n) {
    const rows = n.children.map((r) => r.children.map((c) => this.plain(c).trim()));
    const alt = rows.map((r) => r.join(' | ')).join('\n');
    const url = DRY ? 'table.png' : await this.uploadPng((await renderTable(rows, n.align)).png);
    this.warnings.push('table rendered as image');
    return {
      type: 'captionedImage',
      content: [{ type: 'image2', attrs: { ...IMAGE_ATTRS, src: url, alt: alt.slice(0, 1000) } }],
    };
  }

  plain(n) {
    if (n.type === 'text' || n.type === 'inlineCode' || n.type === 'inlineMath') return n.value;
    if (n.type === 'html') return stripTags(n.value);
    return (n.children ?? []).map((c) => this.plain(c)).join('');
  }

  async htmlBlock(html) {
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
    if (imgs.length) {
      const out = [];
      const caption = html.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
      for (const [tag] of imgs) {
        const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
        const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
        out.push(await this.image(src, alt, caption ? stripTags(caption[1]).trim() : null));
      }
      return out;
    }
    const t = stripTags(html).trim();
    return t ? [para([text(joinSoftBreaks(t))])] : [];
  }

  // Split a paragraph so images become their own blocks.
  async paragraph(children) {
    const out = [];
    let buf = [];
    const flush = async () => {
      const inl = await this.inlineOf(buf);
      // drop whitespace-only paragraphs that were just separators around images
      if (inl.some((x) => x.type !== 'text' || x.text.trim())) out.push(para(inl));
      buf = [];
    };
    for (const c of children) {
      const ref = c.type === 'imageReference' ? this.defs[c.identifier] : null;
      if (c.type === 'image' || ref) {
        await flush();
        out.push(await this.image(c.url ?? ref.url, c.alt ?? '', c.title ?? null));
      } else buf.push(c);
    }
    await flush();
    return out;
  }

  async image(src, alt, caption) {
    const url = await this.uploadImage(src);
    const node = {
      type: 'captionedImage',
      content: [
        {
          type: 'image2',
          attrs: { ...IMAGE_ATTRS, src: url, alt: alt || null },
        },
      ],
    };
    if (caption) node.content.push({ type: 'caption', content: [text(caption)] });
    return node;
  }

  async inlineOf(nodes, marks = [], state = { sup: false, sub: false }) {
    const out = [];
    for (const n of nodes) {
      switch (n.type) {
        case 'text': {
          let t = joinSoftBreaks(n.value);
          if (state.sup) t = script(t, SUP, '^');
          if (state.sub) t = script(t, SUB, '_');
          out.push(text(t, marks));
          break;
        }
        case 'strong':
          out.push(...(await this.inlineOf(n.children, [...marks, { type: 'strong' }], state)));
          break;
        case 'emphasis':
          out.push(...(await this.inlineOf(n.children, [...marks, { type: 'em' }], state)));
          break;
        case 'delete':
          out.push(...(await this.inlineOf(n.children, [...marks, { type: 'strikethrough' }], state)));
          break;
        case 'inlineCode':
          out.push(text(n.value, [...marks, { type: 'code' }]));
          break;
        case 'inlineMath':
          out.push({ type: 'inline_latex', attrs: { persistentExpression: n.value, id: latexId() } });
          break;
        case 'link':
          out.push(...(await this.inlineOf(n.children, [...marks, { type: 'link', attrs: { href: absUrl(n.url) } }], state)));
          break;
        case 'linkReference': {
          const def = this.defs[n.identifier];
          const m = def ? [...marks, { type: 'link', attrs: { href: absUrl(def.url) } }] : marks;
          out.push(...(await this.inlineOf(n.children, m, state)));
          break;
        }
        case 'footnoteReference': {
          if (!this.footnoteOrder.includes(n.identifier)) this.footnoteOrder.push(n.identifier);
          out.push(text(`[${this.footnoteOrder.indexOf(n.identifier) + 1}]`, marks));
          break;
        }
        case 'break':
          out.push({ type: 'hard_break' });
          break;
        case 'html': {
          const tag = n.value.trim().toLowerCase();
          if (/^<sup>$/.test(tag)) state.sup = true;
          else if (/^<\/sup>$/.test(tag)) state.sup = false;
          else if (/^<sub>$/.test(tag)) state.sub = true;
          else if (/^<\/sub>$/.test(tag)) state.sub = false;
          else if (/^<br\s*\/?>$/.test(tag)) out.push({ type: 'hard_break' });
          else out.push(text(stripTags(n.value), marks));
          break;
        }
        default:
          if (n.children) out.push(...(await this.inlineOf(n.children, marks, state)));
          else if (n.value) out.push(text(n.value, marks));
      }
    }
    return out.filter(Boolean);
  }
}

// ---------------------------------------------------------------- Substack API (create-only)

const SID = process.env.SUBSTACK_SID;
const headers = () => ({
  cookie: `substack.sid=${SID}`,
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  origin: PUB,
  referer: `${PUB}/publish/home`,
});

// Draft ids this script created (from the ledger). Only these may ever be PUT.
const ownDraftIds = () => new Set(Object.values(ledger.posts).map((p) => p.draftId).filter(Boolean));

async function api(method, url, body) {
  if (method === 'PUT') {
    const id = Number(url.match(/\/api\/v1\/drafts\/(\d+)$/)?.[1]);
    if (!ownDraftIds().has(id)) throw new Error(`refusing PUT ${url}: not a draft created by this script`);
  } else if (!['GET', 'POST'].includes(method)) throw new Error(`refusing ${method}: this script is append-only`);
  const res = await fetch(url, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const imageCache = new Map();

async function uploadPng(buf) {
  const { url } = await api('POST', `${PUB}/api/v1/image`, { image: `data:image/png;base64,${buf.toString('base64')}` });
  return url;
}

async function uploadImage(src) {
  if (!src) throw new Error('image without src');
  if (DRY) return absUrl(src);
  if (imageCache.has(src)) return imageCache.get(src);
  let buf, ext;
  if (/^https?:/.test(src)) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`fetch image ${src}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    ext = path.extname(new URL(src).pathname).toLowerCase();
  } else {
    const p = path.join(PUBLIC_DIR, decodeURIComponent(src.replace(/^\//, '')));
    buf = fs.readFileSync(p);
    ext = path.extname(p).toLowerCase();
  }
  const dataUri = `data:${MIME[ext] ?? 'image/png'};base64,${buf.toString('base64')}`;
  const { url } = await api('POST', `${PUB}/api/v1/image`, { image: dataUri });
  imageCache.set(src, url);
  return url;
}

// Titles already on Substack (drafts + published), as a second guard against duplicates.
async function existingTitles() {
  const titles = new Set();
  const order = { drafts: 'draft_updated_at', published: 'post_date', scheduled: 'trigger_at' };
  for (const kind of Object.keys(order)) {
    for (let offset = 0; offset < 2000; offset += 25) {
      const j = await api('GET', `${PUB}/api/v1/post_management/${kind}?offset=${offset}&limit=25&order_by=${order[kind]}&order_direction=desc`);
      const posts = j?.posts ?? [];
      for (const p of posts) for (const t of [p.title, p.draft_title]) if (t) titles.add(t.trim());
      if (posts.length < 25) break;
    }
  }
  return titles;
}

// ---------------------------------------------------------------- main

function saveLedger() {
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
}

async function publish(post, entry) {
  if (!entry.cover) {
    entry.cover = await uploadPng(renderCover({ title: entry.title, tags: post.data.tags, date: post.data.pubDate }));
    await api('PUT', `${PUB}/api/v1/drafts/${entry.draftId}`, { cover_image: entry.cover });
    saveLedger();
  }
  await api('GET', `${PUB}/api/v1/drafts/${entry.draftId}/prepublish`);
  const res = await api('POST', `${PUB}/api/v1/drafts/${entry.draftId}/publish`, { send: SEND_EMAIL, share_automatically: false });
  entry.publishedAt = new Date().toISOString();
  entry.emailSent = SEND_EMAIL;
  entry.url = res?.canonical_url ?? res?.slug ?? null;
  saveLedger();
  if (BACKDATE) {
    const d = new Date(post.data.pubDate);
    d.setUTCHours(17); // ~ morning US Pacific on the blog date
    await api('PUT', `${PUB}/api/v1/drafts/${entry.draftId}`, { post_date: d.toISOString() });
    entry.backdatedTo = d.toISOString();
    saveLedger();
  }
  console.log(`published ${entry.draftId}  ${post.slug}${SEND_EMAIL ? ' (email sent)' : ''}${BACKDATE ? ` (dated ${entry.backdatedTo.slice(0, 10)})` : ''}`);
}

// Re-render a post this script published and update it in place (no email).
async function refresh(post, entry) {
  const conv = new Converter(post, uploadImage, uploadPng);
  const doc = await conv.convert();
  await api('PUT', `${PUB}/api/v1/drafts/${entry.draftId}`, { draft_body: JSON.stringify(doc) });
  await api('GET', `${PUB}/api/v1/drafts/${entry.draftId}/prepublish`);
  await api('POST', `${PUB}/api/v1/drafts/${entry.draftId}/publish`, { send: false, share_automatically: false });
  if (entry.backdatedTo) await api('PUT', `${PUB}/api/v1/drafts/${entry.draftId}`, { post_date: entry.backdatedTo });
  entry.refreshedAt = new Date().toISOString();
  saveLedger();
  console.log(`refreshed ${entry.draftId}  ${post.slug}  ${[...new Set(conv.warnings)].join('; ')}`);
}

async function main() {
  const all = loadPosts();
  if (REFRESH) {
    if (!ONLY && !ALL_OWN) throw new Error('--refresh needs --only <slug> or --all-own');
    if (!SID) throw new Error('SUBSTACK_SID is not set');
    const own = all.filter((p) => ledger.posts[p.slug]?.draftId && ledger.posts[p.slug].publishedAt && (!ONLY || p.slug === ONLY));
    if (ONLY && !own.length) throw new Error(`${ONLY} was not published by this script; refusing to touch it`);
    for (const p of own) await refresh(p, ledger.posts[p.slug]);
    return;
  }
  // Drafts this script created earlier but has not published yet.
  const pending = PUBLISH ? all.filter((p) => ledger.posts[p.slug]?.draftId && !ledger.posts[p.slug].publishedAt && (!ONLY || p.slug === ONLY)) : [];
  if (pending.length && !DRY) {
    if (!SID) throw new Error('SUBSTACK_SID is not set');
    for (const p of pending) await publish(p, ledger.posts[p.slug]);
  }
  const posts = all.filter((p) => !ledger.posts[p.slug] && (!ONLY || p.slug === ONLY));
  console.log(`${posts.length} blog post(s) not yet on Substack${DRY ? ' (dry run)' : ''}`);
  if (!posts.length) return;

  let titles = new Set();
  let userId = null;
  if (!DRY) {
    if (!SID) throw new Error('SUBSTACK_SID is not set');
    userId = (await api('GET', 'https://substack.com/api/v1/user/profile/self')).id;
    titles = await existingTitles();
    console.log(`logged in as user ${userId}; ${titles.size} existing titles on Substack`);
  } else fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  let done = 0;
  for (const post of posts) {
    if (done >= LIMIT) break;
    const title = String(post.data.title);
    if (titles.has(title.trim())) {
      console.log(`skip  ${post.slug}: a post titled "${title}" already exists on Substack — recording in ledger`);
      ledger.posts[post.slug] = { substackTitle: title, note: 'matched by title' };
      saveLedger();
      continue;
    }
    const conv = new Converter(post, uploadImage, uploadPng);
    const doc = await conv.convert();
    const warn = [...new Set(conv.warnings)];

    if (DRY) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `${post.slug}.json`), JSON.stringify(doc, null, 2));
      console.log(`would create  ${post.slug}  "${title}"${warn.length ? '  ⚠ ' + warn.join('; ') : ''}`);
      done++;
      continue;
    }

    const cover = await uploadPng(renderCover({ title, tags: post.data.tags, date: post.data.pubDate }));
    const draft = await api('POST', `${PUB}/api/v1/drafts`, {
      type: 'newsletter',
      audience: 'everyone',
      draft_title: title,
      draft_subtitle: '',
      draft_body: JSON.stringify(doc),
      draft_bylines: [{ id: userId, is_guest: false }],
      cover_image: cover,
    });
    ledger.posts[post.slug] = { draftId: draft.id, title, cover, createdAt: new Date().toISOString() };
    saveLedger();
    titles.add(title.trim());
    console.log(`created draft ${draft.id}  ${post.slug}  "${title}"${warn.length ? '  ⚠ ' + warn.join('; ') : ''}`);
    if (PUBLISH) await publish(post, ledger.posts[post.slug]);
    done++;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
