import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('prowadzący robi laboratorium z linku, a osoba ucząca się je zalicza', async ({ page, isMobile }) => {
  test.skip(isMobile, 'kreator sprawdzamy na desktopie');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/symulator');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/symulator');
  await page.getByRole('button', { name: /Małe biuro/ }).click();
  await expect(page.locator('[data-device]')).toHaveCount(9);
  await page.getByRole('button', { name: 'Plik' }).click();
  await page.getByRole('menuitem', { name: 'Zrób z tej sieci laboratorium' }).click();
  const dialog = page.getByRole('dialog', { name: 'Laboratorium z linku' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.lab-check-row')).not.toHaveCount(0);
  const axe = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  await dialog.getByRole('button', { name: 'Kopiuj link do laboratorium' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Wpisz tytuł');
  await dialog.getByLabel('Tytuł').fill('Biuro: ping do serwera');
  await dialog.getByLabel('Polecenie dla osoby uczącej się').fill('Sprawdź, czy komputery widzą serwer.\n\nNic nie zmieniaj w R1.');
  await dialog.getByRole('button', { name: 'Dodaj warunek' }).click();
  const rows = dialog.locator('.lab-check-row');
  const last = rows.last();
  await last.getByLabel(/Rodzaj warunku/).selectOption('noping');
  await last.getByLabel(/Cel w warunku/).fill('10.99.99.99');
  await dialog.getByRole('button', { name: 'Sprawdź na tej sieci' }).click();
  await expect(dialog.getByRole('status')).toContainText('przechodzą wszystkie warunki (5)');
  await expect(dialog.locator('.fail-icon')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Kopiuj link do laboratorium' }).click();
  const link = await dialog.getByLabel('Link do laboratorium').inputValue();
  expect(link).toContain('#/lab-z-linku?lab=1.');

  await page.goto(link);
  await page.reload();
  const panel = page.getByRole('complementary', { name: 'Instrukcje laboratorium' });
  await expect(panel.getByRole('heading', { name: 'Biuro: ping do serwera' })).toBeVisible();
  await expect(panel.getByText('Nic nie zmieniaj w R1.')).toBeVisible();
  await expect(panel.getByText('PC1 nie pinguje 10.99.99.99')).toBeVisible();
  await panel.getByRole('button', { name: 'Sprawdź wyniki' }).click();
  await expect(panel.locator('.score-ring strong')).toHaveText('100%');

  await page.goto('/#/lab-z-linku?lab=1.zepsuty');
  await expect(page.getByText('Ten link do laboratorium jest uszkodzony albo niepełny')).toBeVisible();
});
