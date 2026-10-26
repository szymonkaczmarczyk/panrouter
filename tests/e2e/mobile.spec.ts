import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
}

test.beforeEach(({ isMobile }) => {
  test.skip(!isMobile, 'układ telefonu');
});

test('na telefonie symulacja zostawia miejsce na planszę, a panel się zwija', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/symulator');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/symulator');
  await page.getByRole('button', { name: /Małe biuro/ }).click();
  await page.getByRole('button', { name: 'Symulacja', exact: true }).click();
  await page.getByRole('button', { name: /Pakiet testowy/ }).click();
  await page.locator('[data-device]').filter({ hasText: /^PC1/ }).first().click();
  await page.locator('[data-device]').filter({ hasText: /^SRV1/ }).first().click();
  await expect(page.locator('.event-row').first()).toBeVisible();
  await axe(page);
  await page.getByRole('button', { name: 'Zwiń panel symulacji' }).click();
  await expect(page.locator('.event-panel')).toHaveClass(/is-collapsed/);
  await expect(page.locator('[data-device]').filter({ hasText: /^LAPTOP1/ }).first()).toBeInViewport();
  await page.getByRole('button', { name: 'Rozwiń panel symulacji' }).click();
  await page.getByRole('button', { name: /Analizator/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Analizator pakietów' });
  await dialog.locator('tbody tr').nth(1).click();
  await expect(dialog.locator('.hexdump')).toBeVisible();
  await axe(page);
});
