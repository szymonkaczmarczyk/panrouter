import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const font = (name) => readFileSync(`${root}node_modules/@fontsource-variable/dm-sans/files/${name}`).toString('base64');
const fontCss = `
@font-face { font-family: 'DM Sans'; font-weight: 100 1000; src: url(data:font/woff2;base64,${font('dm-sans-latin-wght-normal.woff2')}) format('woff2'); unicode-range: U+0000-00FF; }
@font-face { font-family: 'DM Sans'; font-weight: 100 1000; src: url(data:font/woff2;base64,${font('dm-sans-latin-ext-wght-normal.woff2')}) format('woff2'); unicode-range: U+0100-024F; }
`;

const mark = (size) => `
<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="30" height="30" rx="8" fill="#1a2430" stroke="#2dd4bf" stroke-opacity="0.6"/>
  <circle cx="16" cy="16" r="8.5" fill="none" stroke="#2dd4bf" stroke-width="2"/>
  <path d="M16 4.5v5M16 22.5v5M4.5 16h5M22.5 16h5" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="2.6" fill="#4ade80"/>
</svg>`;

const tile = (x, y, label, color, path) => `
<g transform="translate(${x} ${y})">
  <rect x="0" y="0" width="64" height="64" rx="15" fill="#1a2430" stroke="${color}" stroke-opacity="0.6"/>
  <g transform="translate(8 8) scale(1)" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${path}</g>
  <text x="32" y="88" fill="#a3b3c4" font-size="15" font-family="monospace" text-anchor="middle">${label}</text>
</g>`;

const routerPath = '<circle cx="24" cy="24" r="13"/><path d="M14.5 19.5h7.5m-2.5-2.5 2.5 2.5-2.5 2.5M33.5 28.5H26m2.5 2.5-2.5-2.5 2.5-2.5"/>';
const switchPath = '<rect x="8" y="14" width="32" height="20" rx="3"/><path d="M14 21h18m-3-3 3 3-3 3M34 27H16m3-3-3 3 3 3"/>';
const pcPath = '<rect x="10" y="12" width="28" height="19" rx="2"/><path d="M20 36h8M24 31v5"/>';
const cloudPath = '<path d="M15 33h19a7 7 0 0 0 1-13.9A10 10 0 0 0 16 18.5 7.3 7.3 0 0 0 15 33Z"/>';
const apPath = '<circle cx="24" cy="30" r="2.2" fill="currentColor"/><path d="M18.5 24.5a8 8 0 0 1 11 0M14.5 20.5a13.5 13.5 0 0 1 19 0"/>';

const og = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #0b1016; font-family: 'DM Sans', sans-serif; color: #e8eef5; letter-spacing: -0.02em;
  background-image: radial-gradient(circle at 1px 1px, #22303e 1px, transparent 0); background-size: 26px 26px; }
.wrap { display: grid; grid-template-columns: 600px 1fr; height: 100%; padding: 72px; gap: 40px; align-items: center; }
.brand { display: flex; align-items: center; gap: 16px; font-weight: 700; font-size: 30px; letter-spacing: -0.03em; }
h1 { font-size: 64px; line-height: 1.02; letter-spacing: -0.055em; margin-top: 36px; font-weight: 700; }
p { margin-top: 24px; font-size: 25px; color: #a3b3c4; line-height: 1.4; }
.tag { display: inline-block; margin-top: 32px; padding: 10px 16px; border-radius: 10px; background: rgba(45,212,191,.12); color: #5eead4; font-size: 20px; font-weight: 600; }
</style></head><body><div class="wrap"><div>
<div class="brand">${mark(56)}PanRouter</div>
<h1>Sieci komputerowe od zera do eksperta</h1>
<p>Symulator sieci w przeglądarce, lekcje, laboratoria, minigry i egzamin. Po polsku i angielsku.</p>
<span class="tag">Wi-Fi 7 · VLAN · OSPF · NAT · NGFW</span>
</div>
<svg viewBox="0 0 470 420" width="470" height="420" xmlns="http://www.w3.org/2000/svg">
  <g stroke-width="3" stroke="#7dd3fc" stroke-opacity="0.6">
    <line x1="72" y1="72" x2="232" y2="182"/><line x1="72" y1="312" x2="232" y2="182"/><line x1="232" y1="182" x2="392" y2="102"/>
    <line x1="232" y1="182" x2="392" y2="302" stroke-dasharray="4 8" stroke="#5eead4"/>
  </g>
  <line x1="392" y1="102" x2="392" y2="0" stroke="#fb923c" stroke-width="3" stroke-opacity="0.7"/>
  ${[[72,72],[72,312],[392,102],[392,302]].map(([x, y]) => `<circle cx="${x + (232 - x) * 0.22}" cy="${y + (182 - y) * 0.22}" r="6" fill="#4ade80"/>`).join('')}
  ${tile(40, 40, 'PC1', '#a3b3c4', pcPath)}
  ${tile(40, 280, 'PC2', '#a3b3c4', pcPath)}
  ${tile(200, 150, 'SW1', '#60a5fa', switchPath)}
  ${tile(360, 70, 'R1', '#2dd4bf', routerPath)}
  ${tile(360, 270, 'AP1', '#38bdf8', apPath)}
  <rect x="300" y="128" width="26" height="18" rx="3" fill="#f472b6"/>
</svg>
</div></body></html>`;

function icoFrom(pngs) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og);
await page.waitForTimeout(200);
await page.screenshot({ path: `${root}public/og-image.png` });

const icon = async (size) => {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0;background:transparent">${mark(size)}</body></html>`);
  const data = await p.screenshot({ omitBackground: true });
  await p.close();
  return data;
};

const maskable = async (size) => {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * 0.62);
  await p.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:#0b1016">${mark(inner)}</body></html>`);
  const data = await p.screenshot();
  await p.close();
  return data;
};

writeFileSync(`${root}public/apple-touch-icon.png`, await icon(180));
writeFileSync(`${root}public/icon-192.png`, await icon(192));
writeFileSync(`${root}public/icon-512.png`, await icon(512));
writeFileSync(`${root}public/icon-maskable-512.png`, await maskable(512));
const sizes = [16, 32, 48];
const pngs = [];
for (const size of sizes) pngs.push({ size, data: await icon(size) });
writeFileSync(`${root}public/favicon.ico`, icoFrom(pngs));
writeFileSync(`${root}public/favicon.svg`, mark(32).trim().replace('width="32" height="32" ', ''));
await browser.close();
console.log('assets ready');
