import { expect, test } from '@playwright/test';

const AUDIT = `(async () => {
  const i18n = await import('/src/i18n/index.ts');
  const { Diagram } = await import('/src/content/diagrams.tsx');
  const { h, render } = await import('/node_modules/.vite/deps/preact.js');
  const ids = ['lan-wan', 'home-network', 'client-server', 'osi-stack', 'encapsulation', 'switch-learning', 'vlan-trunk', 'router-on-stick', 'routing-table', 'subnet-bar', 'tcp-handshake', 'dhcp-dora', 'dns-resolution', 'nat-pat', 'stp-loop', 'ospf-areas', 'campus-hierarchy', 'spine-leaf', 'zero-trust', 'wifi-bands', 'ipv6-address', 'fiber-copper'];
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;width:900px;visibility:hidden';
  document.body.append(host);
  const toUser = (svg, el, x, y) => new DOMPoint(x, y).matrixTransform(svg.getCTM().inverse().multiply(el.getCTM()));
  const box = (el) => {
    const b = el.getBBox();
    const a = toUser(el.ownerSVGElement, el, b.x, b.y);
    const c = toUser(el.ownerSVGElement, el, b.x + b.width, b.y + b.height);
    return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
  };
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
  const crosses = (l, r) => {
    for (let t = 0; t <= 1; t += 0.02) {
      const x = l.x1 + (l.x2 - l.x1) * t;
      const y = l.y1 + (l.y2 - l.y1) * t;
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
    }
    return false;
  };
  const issues = [];
  for (const lang of ['pl', 'en']) {
    i18n.lang.value = lang;
    for (const id of ids) {
      const holder = document.createElement('div');
      host.append(holder);
      render(h(Diagram, { id }), holder);
      const svg = holder.querySelector('svg');
      const vb = svg.viewBox.baseVal;
      const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim()).map((t) => {
        const r = box(t);
        const pad = r.h * 0.22;
        return { name: t.textContent.trim(), r: { x: r.x + 1, y: r.y + pad, w: r.w - 2, h: r.h - pad * 2 } };
      });
      const tiles = [...svg.querySelectorAll('rect.dg-tile')].map(box);
      const lines = [...svg.querySelectorAll('line')].map((l) => {
        const a = toUser(svg, l, +l.getAttribute('x1'), +l.getAttribute('y1'));
        const b = toUser(svg, l, +l.getAttribute('x2'), +l.getAttribute('y2'));
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      });
      texts.forEach((a, i) => {
        const where = lang + ' ' + id + ': ' + a.name;
        if (a.r.x < vb.x || a.r.y < vb.y || a.r.x + a.r.w > vb.x + vb.width || a.r.y + a.r.h > vb.y + vb.height) issues.push(where + ' wychodzi poza ramkę');
        for (const b of texts.slice(i + 1)) if (overlap(a.r, b.r)) issues.push(where + ' nachodzi na ' + b.name);
        if (tiles.some((tile) => overlap(a.r, tile))) issues.push(where + ' nachodzi na ikonę');
        if (lines.some((l) => crosses(l, a.r))) issues.push(where + ' przecina linia');
      });
      render(null, holder);
    }
  }
  i18n.lang.value = 'pl';
  host.remove();
  return issues;
})()`;

test('napisy na diagramach nie nachodzą na siebie, ikony ani linie', async ({ page, isMobile }) => {
  test.skip(isMobile, 'diagramy liczone są w jednostkach SVG, niezależnie od ekranu');
  await page.goto('/#/nauka');
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate(AUDIT);
  expect(issues).toEqual([]);
});
