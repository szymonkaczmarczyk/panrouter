import { expect, test, type Page } from '@playwright/test';

async function office(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/symulator');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/symulator');
  await page.getByRole('button', { name: /Małe biuro/ }).click();
  await expect(page.locator('[data-device]')).toHaveCount(9);
}

const center = async (page: Page, name: string) => {
  const box = (await page.locator('[data-device]').filter({ hasText: new RegExp(`^${name}`) }).first().locator('.node-tile').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const saved = async (page: Page) => {
  await page.waitForTimeout(250);
  return page.evaluate(() => JSON.parse(localStorage.getItem('panrouter:v1')!).sandbox);
};

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'praca myszą i klawiaturą na planszy');
});

test('notatka powstaje, cofa się i wraca', async ({ page }) => {
  await office(page);
  await page.keyboard.press('n');
  await page.locator('.ws-canvas').click({ position: { x: 120, y: 420 } });
  const dialog = page.getByRole('dialog', { name: 'Notatka na planszy' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type('VLAN 10 to biuro');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('[data-note]')).toHaveCount(1);
  await expect(page.locator('[data-note]')).toContainText('VLAN 10 to biuro');
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-note]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('[data-note]')).toHaveCount(1);
  expect((await saved(page)).notes[0].text).toBe('VLAN 10 to biuro');
});

test('zaznaczanie ramką i przesuwanie grupy', async ({ page }) => {
  await office(page);
  const pc1 = await center(page, 'PC1');
  const pc2 = await center(page, 'PC2');
  await page.keyboard.down('Shift');
  await page.mouse.move(Math.min(pc1.x, pc2.x) - 50, Math.min(pc1.y, pc2.y) - 50);
  await page.mouse.down();
  await page.mouse.move(Math.max(pc1.x, pc2.x) + 50, Math.max(pc1.y, pc2.y) + 50, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('.node-selected')).toHaveCount(2);
  const before = (await saved(page)).devices.filter((d: { name: string }) => ['PC1', 'PC2'].includes(d.name));
  await page.mouse.move(pc1.x, pc1.y);
  await page.mouse.down();
  await page.mouse.move(pc1.x + 60, pc1.y + 30, { steps: 6 });
  await page.mouse.up();
  const after = (await saved(page)).devices.filter((d: { name: string }) => ['PC1', 'PC2'].includes(d.name));
  for (let i = 0; i < 2; i++) expect(after[i].x - before[i].x).toBe(after[0].x - before[0].x);
  expect(after[0].x).not.toBe(before[0].x);
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-device]')).toHaveCount(7);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-device]')).toHaveCount(9);
});

test('zapisana sieć wraca z listy Moje sieci', async ({ page }) => {
  await office(page);
  await page.getByRole('button', { name: 'Plik' }).click();
  await page.getByRole('menuitem', { name: 'Moje sieci' }).click();
  const dialog = page.getByRole('dialog', { name: 'Moje sieci' });
  await dialog.getByLabel('Zapisz bieżącą sieć pod nazwą').fill('Biuro testowe');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(dialog.getByText('Biuro testowe')).toBeVisible();
  await dialog.getByRole('button', { name: 'Zamknij' }).click();
  await page.getByRole('button', { name: 'Plik' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('menuitem', { name: /Pusta plansza/ }).click();
  await expect(page.locator('[data-device]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Plik' }).click();
  await page.getByRole('menuitem', { name: 'Moje sieci' }).click();
  await page.getByRole('dialog', { name: 'Moje sieci' }).getByRole('button', { name: 'Otwórz' }).click();
  await expect(page.locator('[data-device]')).toHaveCount(9);
});

test('analizator filtruje pakiety i zapisuje plik pcap', async ({ page }) => {
  await office(page);
  await page.keyboard.press('s');
  await page.keyboard.press('p');
  await page.locator('[data-device]').filter({ hasText: /^PC1/ }).first().click();
  await page.locator('[data-device]').filter({ hasText: /^SRV1/ }).first().click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('a');
  const dialog = page.getByRole('dialog', { name: 'Analizator pakietów' });
  await expect(dialog).toBeVisible();
  const rows = dialog.locator('tbody tr');
  const total = await rows.count();
  expect(total).toBeGreaterThan(3);
  const filter = dialog.getByLabel('Filtr wyświetlania');
  await filter.fill('icmp');
  await expect(rows.first()).toContainText('ICMP');
  const icmp = await rows.count();
  expect(icmp).toBeLessThan(total);
  await filter.fill('ip.addr ==');
  await expect(dialog.getByText('Filtr jest niedokończony.')).toBeVisible();
  await expect(rows).toHaveCount(icmp);
  await filter.fill('tcp.port = 80');
  await expect(dialog.getByText(/Nie rozumiem/)).toBeVisible();
  await filter.fill('arp');
  await rows.first().click();
  await expect(dialog.locator('.hexdump')).toContainText('0000');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Pobierz .pcap' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.pcap$/);
  const path = await file.path();
  const { statSync } = await import('node:fs');
  expect(statSync(path!).size).toBeGreaterThan(24 + 16 + 60);
});
