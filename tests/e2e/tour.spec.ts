import { expect, test } from '@playwright/test';

test('samouczek prowadzi przez dwa komputery, kabel i ping', async ({ page, isMobile }) => {
  test.skip(isMobile, 'kładzenie urządzeń sprawdzamy myszą na desktopie');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/symulator');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/symulator');
  const tour = page.getByRole('region', { name: 'Samouczek symulatora' });
  await expect(tour.getByText('Pierwsze kroki: 1 z 3')).toBeVisible();
  const canvas = page.locator('.ws-canvas');
  for (const x of [520, 820]) {
    await page.getByRole('button', { name: /Komputer stacjonarny/ }).click();
    await canvas.click({ position: { x, y: 360 } });
  }
  await expect(page.locator('[data-device]')).toHaveCount(2);
  await expect(tour.getByText('Pierwsze kroki: 2 z 3')).toBeVisible();
  const devices = page.locator('[data-device]');
  await page.keyboard.press('c');
  await devices.nth(0).click();
  await devices.nth(1).click();
  await expect(tour.getByText('Pierwsze kroki: 3 z 3')).toBeVisible();
  await page.keyboard.press('p');
  await devices.nth(0).click();
  await devices.nth(1).click();
  await expect(tour.getByText('Twoja pierwsza sieć działa')).toBeVisible();
  await expect(tour).toContainText('169.254');
  await tour.getByRole('button', { name: 'Zakończ samouczek' }).click();
  await expect(tour).toHaveCount(0);
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('panrouter:v1')!);
    data.sandbox = null;
    localStorage.setItem('panrouter:v1', JSON.stringify(data));
  });
  await page.reload();
  await expect(page.getByRole('button', { name: /Małe biuro/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Samouczek symulatora' })).toHaveCount(0);
});
