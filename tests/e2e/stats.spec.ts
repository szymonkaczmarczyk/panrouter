import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('statystyki pokazują historię egzaminu, najsłabsze moduły i awarie', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/statystyki');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('Tu pojawi się wykres Twoich podejść')).toBeVisible();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    localStorage.setItem(
      'panrouter:v1',
      JSON.stringify({
        version: 1,
        sections: {},
        quizzes: { 'co-to-siec': { best: 40, attempts: 2, last: 40 }, ipv6: { best: 90, attempts: 1, last: 90 } },
        exam: { attempts: 3, best: 82, passed: true, theory: 80, practical: 88 },
        examHistory: [
          { at: '2026-10-01', theory: 50, practical: 40, total: 47, passed: false, modules: { vlan: [3, 2], ipv6: [2, 0] } },
          { at: '2026-10-08', theory: 70, practical: 63, total: 68, passed: false, modules: { vlan: [2, 1] } },
          { at: '2026-10-15', theory: 80, practical: 88, total: 82, passed: true, modules: { ospf: [2, 1], hack: 'x' } },
        ],
        incidents: { solved: 4, clean: 3 },
      }),
    );
  });
  await page.reload();
  await expect(page.locator('.chart-bar')).toHaveCount(3);
  await expect(page.getByRole('img', { name: /Podejście 3, .*wynik 82%.*zdany/ })).toBeVisible();
  await page.locator('.chart-bar').first().hover();
  await expect(page.locator('.exam-chart-tip')).toContainText('wynik 47%');
  const rows = page.locator('table').first().locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('zdany');
  const weak = page.locator('table').nth(1).locator('tbody tr');
  await expect(weak.first()).toContainText('Czym jest sieć');
  await expect(weak.first().getByRole('link')).toHaveAttribute('href', '#/nauka/co-to-siec');
  await expect(weak.nth(1)).toContainText('VLAN');
  await expect(page.getByText('rozwiązane, w tym 3 bez podglądania')).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});
