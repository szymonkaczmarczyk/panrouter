import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const stored = async (page: Page) => {
  await page.waitForTimeout(250);
  return page.evaluate(() => JSON.parse(localStorage.getItem('panrouter:v1')!).reviews);
};

test('hasło ze słownika i błędne pytanie wracają w powtórkach', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/slownik');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/slownik');
  await page.getByRole('button', { name: 'Powtarzaj hasło VLAN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Usuń VLAN z powtórek' })).toHaveAttribute('aria-pressed', 'true');
  expect((await stored(page))['t:VLAN']).toEqual({ box: 0, due: day(1) });

  await page.evaluate((due) => {
    const data = JSON.parse(localStorage.getItem('panrouter:v1')!);
    data.reviews = { 'q:q11-1': { box: 0, due }, 't:VLAN': { box: 1, due } };
    localStorage.setItem('panrouter:v1', JSON.stringify(data));
  }, day(0));
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Na dziś: 2 powtórki' })).toBeVisible();
  await page.getByRole('link', { name: 'Powtórz teraz' }).click();
  await expect(page).toHaveURL(/#\/powtorki$/);
  await expect(page.getByRole('heading', { name: 'Na dziś: 2 powtórki' })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  await page.getByRole('button', { name: /Dostęp do internetu/ }).click();
  await page.getByRole('button', { name: 'Zobacz wynik' }).click();
  await page.getByRole('button', { name: /Pokaż definicję/ }).click();
  await expect(page.getByText(/Wirtualna sieć LAN|Virtual LAN|logiczn/i).first()).toBeVisible();
  await page.keyboard.press('2');
  await expect(page.getByText('Hasła powtórzone')).toBeVisible();

  const reviews = await stored(page);
  expect(reviews['q:q11-1']).toEqual({ box: 0, due: day(1) });
  expect(reviews['t:VLAN']).toEqual({ box: 2, due: day(7) });
});
