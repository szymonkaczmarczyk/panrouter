import { expect, test } from '@playwright/test';
import { TEMPLATES } from '../../src/sim/templates';

test('zgłoszenie awarii: losowanie, podpowiedzi i zaliczenie naprawy', async ({ page, isMobile }) => {
  test.skip(isMobile, 'praca na planszy z panelem bocznym');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/awaria');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/awaria');
  await page.getByRole('radio', { name: /Łatwa/ }).click();
  await page.getByLabel('Numer zgłoszenia (opcjonalnie)').fill('12345');
  await page.getByRole('button', { name: 'Wylosuj awarię' }).click();
  await expect(page).toHaveURL(/#\/awaria\/zgloszenie$/);
  const panel = page.getByRole('complementary', { name: 'Zgłoszenie' });
  await expect(panel.getByText('Zgłoszenie #12345')).toBeVisible();
  await expect(panel.locator('.check-list li.fail').first()).toBeVisible();
  await panel.getByRole('button', { name: 'Podpowiedź (1/2)' }).click();
  await expect(panel.getByText(/^Warstwa|^Usługi/).first()).toBeVisible();
  await panel.getByRole('button', { name: 'Podpowiedź (2/2)' }).click();
  await expect(panel.getByText(/Urządzenie: /).first()).toBeVisible();
  await panel.getByRole('button', { name: 'Sprawdź naprawę' }).click();
  await expect(panel.getByText('Wynik sprawdzenia')).toBeVisible();
  await expect(panel.locator('.check-list li.fail').first()).toBeVisible();
  await page.waitForTimeout(400);
  const healthy = TEMPLATES.find((t) => t.id === 'office')!.build();
  await page.evaluate((net) => {
    const data = JSON.parse(localStorage.getItem('panrouter:v1')!);
    data.incident.net = net;
    localStorage.setItem('panrouter:v1', JSON.stringify(data));
  }, healthy);
  await page.reload();
  await page.getByRole('complementary', { name: 'Zgłoszenie' }).getByRole('button', { name: 'Sprawdź naprawę' }).click();
  await expect(page).toHaveURL(/#\/awaria$/);
  await expect(page.getByText('Rozwiązane: 1, bez podglądania rozwiązania: 1')).toBeVisible();
});
