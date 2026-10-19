// Export every .slide in a social graphic page as a PNG.
// Usage: node sweetpea/social/render.mjs sweetpea/social/winter-emoji-combos
// Serves the sweetpea/ folder locally so relative asset paths resolve.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Use a local playwright install if there is one, else the globally installed copy.
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));

const dir = path.resolve(process.argv[2]);
const root = path.resolve(dir, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const { port } = server.address();

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${port}/${path.relative(root, dir)}/index.html`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
const slides = await page.$$('.slide');
for (const [i, s] of slides.entries()) {
  const out = path.join(dir, `slide-${i + 1}.png`);
  await s.screenshot({ path: out });
  console.log('wrote', path.relative(process.cwd(), out));
}
if (errors.length) console.error('page errors:', errors);
await browser.close();
server.close();
