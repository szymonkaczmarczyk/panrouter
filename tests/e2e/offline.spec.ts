import { expect, test } from '@playwright/test';

const BUILD = 'http://127.0.0.1:4401';

test.describe.configure({ mode: 'serial' });

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'pamięć podręczna service workera jest ta sama na każdym ekranie');
});

test('zbudowana aplikacja działa bez internetu', async ({ page, context }) => {
  await page.goto(`${BUILD}/#/`);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state ?? 'none'), { timeout: 15_000 }).toBe('activated');
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 10_000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto(`${BUILD}/#/symulator`);
  await expect(page.locator('.ws-canvas')).toBeVisible();
  await page.goto(`${BUILD}/#/nauka/vlan`);
  await expect(page.getByRole('heading', { name: /VLAN-y, trunki/ })).toBeVisible();
  await page.goto(`${BUILD}/#/ustawienia`);
  await expect(page.getByText(/działają bez internetu/)).toBeVisible();
});

test('manifest aplikacji ma ikony i adres startowy', async ({ request }) => {
  const response = await request.get(`${BUILD}/manifest.webmanifest`);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.start_url).toBe('./');
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(`${BUILD}/${icon.src}`)).ok()).toBe(true);
});
