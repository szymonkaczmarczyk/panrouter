import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function fresh(page: Page, path = '/') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/#${path}`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/#${path}`);
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test('home shows the call to action above the fold', async ({ page }) => {
  await fresh(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sieci komputerowe od zera do eksperta');
  const cta = page.getByRole('link', { name: /Zacznij pierwszą lekcję/ });
  await expect(cta).toBeInViewport();
  await axe(page);
});

test('switches the whole interface to English', async ({ page, isMobile }) => {
  await fresh(page);
  const group = isMobile ? page.locator('.topbar') : page.locator('.sidebar');
  await group.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Computer networking from zero to expert');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('module chapter and quiz work', async ({ page }) => {
  await fresh(page, '/nauka/co-to-siec');
  await expect(page.getByRole('heading', { name: 'Sieć to rozmowa urządzeń' })).toBeVisible();
  await axe(page);
  await page.getByRole('button', { name: /Rozumiem, dalej/ }).click();
  await expect(page.getByRole('heading', { name: 'LAN, WLAN, WAN i internet' })).toBeVisible();
  await page.goto('/#/quiz/co-to-siec');
  await page.locator('.option').first().click();
  await page.getByRole('button', { name: 'Sprawdź' }).click();
  await expect(page.locator('.feedback')).toBeVisible();
});

test('simulator template pings the internet', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop interaction');
  await fresh(page, '/symulator');
  await page.getByRole('button', { name: /Małe biuro/ }).click();
  await page.locator('[data-device]').filter({ hasText: 'PC1' }).first().click();
  await page.getByRole('button', { name: 'Wiersz poleceń' }).click();
  const input = page.getByLabel(/Wiersz poleceń PC1: wpisz polecenie/);
  await input.fill('ping 198.51.100.80');
  await input.press('Enter');
  await expect(page.locator('.term-line').filter({ hasText: 'Odpowiedź z 198.51.100.80' }).first()).toBeVisible();
});

test('lab grades a correct router configuration', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop interaction');
  await fresh(page, '/lab/dwie-sieci');
  await page.locator('[data-device]').filter({ hasText: 'R1' }).first().click();
  const cli = page.getByLabel(/CLI R1: wpisz polecenie/);
  for (const line of ['enable', 'conf t', 'int g0/0/0', 'ip add 192.168.1.1 255.255.255.0', 'no shut', 'int g0/0/1', 'ip add 192.168.2.1 255.255.255.0', 'no shut', 'end']) {
    await cli.fill(line);
    await cli.press('Enter');
  }
  await page.getByRole('button', { name: 'Zamknij panel' }).click();
  await page.locator('[data-device]').filter({ hasText: 'PC2' }).first().click();
  await page.getByRole('button', { name: 'Konfiguracja IP' }).click();
  await page.getByLabel('Brama domyślna').fill('192.168.2.1');
  await page.getByRole('button', { name: 'Zapisz ustawienia' }).click();
  await page.getByRole('button', { name: 'Sprawdź wyniki' }).click();
  await expect(page.locator('.lab-results .score-ring strong')).toHaveText('100%');
});

for (const path of ['/nauka', '/laboratoria', '/gry', '/quizy', '/egzamin', '/slownik', '/urzadzenia', '/ustawienia', '/prywatnosc']) {
  test(`page ${path} renders without serious accessibility issues`, async ({ page }) => {
    await fresh(page, path);
    await expect(page.locator('main h2').first()).toBeVisible();
    await axe(page);
  });
}

test('unknown address shows the 404 view', async ({ page }) => {
  await fresh(page, '/nie-ma-takiej-strony');
  await expect(page.getByRole('heading', { name: 'Ten adres prowadzi donikąd' })).toBeVisible();
});

test('binary sprint game starts', async ({ page }) => {
  await fresh(page, '/gry/binarny-sprint');
  await page.getByRole('button', { name: 'Zagraj' }).click();
  await expect(page.locator('.bit')).toHaveCount(8);
});
