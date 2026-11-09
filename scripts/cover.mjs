// Render a typographic cover image (1456x816 PNG) for a post with headless Chrome.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const W = 1456;
const H = 816;

const PALETTE = {
  Tech: { bg: '#0f172a', accent: '#38bdf8' },
  Money: { bg: '#14231a', accent: '#4ade80' },
  Life: { bg: '#2a1a14', accent: '#fb923c' },
  Fiction: { bg: '#1e1530', accent: '#c084fc' },
  default: { bg: '#18181b', accent: '#e4e4e7' },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Volumes/SSD0/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found; set CHROME_PATH');
  return found;
}

export function renderCover({ title, tags = [], date }) {
  const tag = tags[0] ?? null;
  const { bg, accent } = PALETTE[tag] ?? PALETTE.default;
  const len = [...title].reduce((n, c) => n + (/[　-鿿＀-￯]/.test(c) ? 2 : 1), 0);
  const size = len <= 24 ? 104 : len <= 44 ? 84 : len <= 70 ? 68 : 56;
  const d = new Date(date);
  const dateStr = isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
  body{background:${bg};color:#f8fafc;font-family:-apple-system,"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Noto Sans SC","Helvetica Neue",Arial,sans-serif;
       display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:96px 112px;position:relative}
  body::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 15%, ${accent}33 0, transparent 45%),radial-gradient(circle at 10% 100%, ${accent}1f 0, transparent 40%)}
  .tag{position:relative;display:inline-block;font-size:30px;letter-spacing:.12em;text-transform:uppercase;color:${accent};font-weight:600}
  .bar{position:relative;width:96px;height:8px;background:${accent};border-radius:4px;margin-bottom:40px}
  h1{position:relative;margin:0;font-size:${size}px;line-height:1.18;font-weight:700;letter-spacing:-.01em;max-width:1180px}
  .foot{position:relative;display:flex;justify-content:space-between;font-size:30px;color:#cbd5e1}
  </style></head><body>
  <div>${tag ? `<div class="tag">${esc(tag)}</div>` : ''}</div>
  <div><div class="bar"></div><h1>${esc(title)}</h1></div>
  <div class="foot"><span>Michael Liu</span><span>${esc(dateStr)}</span></div>
  </body></html>`;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cover-'));
  const htmlPath = path.join(dir, 'cover.html');
  const pngPath = path.join(dir, 'cover.png');
  fs.writeFileSync(htmlPath, html);
  execFileSync(
    findChrome(),
    ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${path.join(dir, 'profile')}`,
     `--window-size=${W},${H}`, `--screenshot=${pngPath}`, `file://${htmlPath}`],
    { stdio: 'ignore', timeout: 60_000 },
  );
  const png = fs.readFileSync(pngPath);
  fs.rmSync(dir, { recursive: true, force: true });
  return png;
}

// CLI: node scripts/cover.mjs "Title" Tech 2026-07-23 out.png
if (import.meta.url === `file://${process.argv[1]}`) {
  const [title, tag, date, out] = process.argv.slice(2);
  fs.writeFileSync(out, renderCover({ title, tags: tag ? [tag] : [], date }));
  console.log('wrote', out);
}
