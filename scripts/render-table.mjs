// Render a markdown table (array of rows) to a PNG cropped to the table, via headless Chrome + CDP.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { findChrome } from './cover.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tableHtml(rows, align = []) {
  const cell = (tag, c, i) => `<${tag}${align[i] ? ` style="text-align:${align[i]}"` : ''}>${esc(c)}</${tag}>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#fff}
  body{font-family:-apple-system,"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Noto Sans SC","Helvetica Neue",Arial,sans-serif;color:#1f2328}
  #t{display:inline-block;padding:2px}
  table{border-collapse:collapse;font-size:22px;line-height:1.5}
  th,td{border:1px solid #d0d7de;padding:12px 18px;text-align:left;vertical-align:top;max-width:440px}
  th{background:#f6f8fa;font-weight:600}
  tr:nth-child(even) td{background:#fafbfc}
  </style></head><body><div id="t"><table>
  <tr>${rows[0].map((c, i) => cell('th', c, i)).join('')}</tr>
  ${rows.slice(1).map((r) => `<tr>${rows[0].map((_, i) => cell('td', r[i] ?? '', i)).join('')}</tr>`).join('\n')}
  </table></div></body></html>`;
}

export async function renderTable(rows, align) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'table-'));
  const htmlPath = path.join(dir, 't.html');
  fs.writeFileSync(htmlPath, tableHtml(rows, align));
  const chrome = spawn(findChrome(), ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${path.join(dir, 'profile')}`, '--window-size=1600,1200', 'about:blank'], { stdio: 'ignore' });
  try {
    const portFile = path.join(dir, 'profile', 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    let targets;
    for (let i = 0; i < 50; i++) {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json().catch(() => []);
      if (targets.some((t) => t.type === 'page')) break;
      await sleep(100);
    }
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
    const cdp = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });

    await cdp('Page.enable');
    await cdp('Page.navigate', { url: `file://${htmlPath}` });
    await sleep(300);
    const { result } = await cdp('Runtime.evaluate', {
      expression: `document.fonts.ready.then(() => { const r = document.getElementById('t').getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,width:Math.ceil(r.width),height:Math.ceil(r.height)}); })`,
      awaitPromise: true,
      returnByValue: true,
    });
    const box = JSON.parse(result.result.value);
    const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 } });
    ws.close();
    return { png: Buffer.from(shot.result.data, 'base64'), width: box.width * 2, height: box.height * 2 };
  } finally {
    chrome.kill();
    await sleep(200);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
