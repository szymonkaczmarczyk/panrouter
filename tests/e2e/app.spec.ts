import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { encodeNetwork } from '../../src/sim/share';
import { TEMPLATES } from '../../src/sim/templates';

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
  await expect(page.getByRole('button', { name: 'Sprawdź' })).toHaveCount(0);
  await page.locator('.option').first().click();
  await expect(page.locator('.feedback')).toBeVisible();
  await page.getByRole('button', { name: 'Następne pytanie' }).click();
  await page.keyboard.press('b');
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('.option[disabled]')).toHaveCount(4);
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

for (const path of ['/nauka', '/laboratoria', '/gry', '/quizy', '/egzamin', '/powtorki', '/statystyki', '/awaria', '/slownik', '/urzadzenia', '/ustawienia', '/prywatnosc']) {
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

test('link do sieci otwiera topologię po potwierdzeniu', async ({ page }) => {
  await fresh(page, '/symulator');
  await page.getByRole('button', { name: /Małe biuro/ }).click();
  await expect(page.locator('[data-device]')).toHaveCount(9);
  const link = await encodeNetwork(TEMPLATES.find((t) => t.id === 'branches')!.build());
  await page.goto(`/#/symulator?siec=${link}`);
  const dialog = page.getByRole('dialog', { name: 'Otworzyć sieć z linku?' });
  await expect(dialog).toBeVisible();
  await axe(page);
  await dialog.getByRole('button', { name: 'Otwórz sieć z linku' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-device]')).toHaveCount(8);
  await expect(page).toHaveURL(/#\/symulator$/);
});

test('uszkodzony link pokazuje błąd i zostawia sieć', async ({ page }) => {
  await fresh(page, '/symulator');
  await page.goto('/#/symulator?siec=1.uszkodzony');
  await expect(page.getByText(/link do sieci jest uszkodzony/)).toBeVisible();
  await expect(page).toHaveURL(/#\/symulator$/);
});

test('laboratorium EtherChannel ocenia konfigurację z CLI', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pisanie w terminalu sprawdzamy na desktopie');
  await fresh(page, '/lab/etherchannel');
  for (const name of ['SW1', 'SW2']) {
    await page.locator('[data-device]').filter({ hasText: name }).first().click();
    const cli = page.getByLabel(new RegExp(`CLI ${name}: wpisz polecenie`));
    for (const line of ['enable', 'conf t', 'interface range g1/0/23-24', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport mode trunk', 'end']) {
      await cli.fill(line);
      await cli.press('Enter');
    }
    await page.getByRole('button', { name: 'Zamknij panel' }).click();
  }
  await page.getByRole('button', { name: 'Sprawdź wyniki' }).click();
  await expect(page.locator('.lab-results .score-ring strong')).toHaveText('100%');
});

test('laboratorium IPv6: router z CLI, SLAAC na komputerze i ocena', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pisanie w terminalu sprawdzamy na desktopie');
  await fresh(page, '/lab/ipv6-podstawy');
  await page.locator('[data-device]').filter({ hasText: /^R1/ }).first().click();
  const cli = page.getByLabel(/CLI R1: wpisz polecenie/);
  for (const line of ['enable', 'conf t', 'ipv6 unicast-routing', 'int g0/0/0', 'ipv6 address 2001:db8:10::1/64', 'no shut', 'int g0/0/1', 'ipv6 address 2001:db8:20::1/64', 'no shut', 'end', 'show ipv6 interface brief']) {
    await cli.fill(line);
    await cli.press('Enter');
  }
  await expect(page.locator('.terminal')).toContainText('2001:DB8:10::1');
  await page.getByRole('button', { name: 'Zamknij panel' }).click();
  await page.locator('[data-device]').filter({ hasText: /^PC1/ }).first().click();
  await page.getByRole('button', { name: 'Konfiguracja IP' }).click();
  await expect(page.locator('.ipv6-list')).toContainText('2001:db8:10:');
  await expect(page.locator('.ipv6-list')).toContainText('SLAAC');
  await page.getByRole('button', { name: 'Sprawdź wyniki' }).click();
  await expect(page.locator('.lab-results .score-ring strong')).toHaveText('100%');
});

test('laboratorium VPN: tunel IPsec z CLI, ocena i ESP w analizatorze', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pisanie w terminalu sprawdzamy na desktopie');
  await fresh(page, '/lab/vpn-ipsec');
  const configure = async (name: string, key: string, peer: string, inside: string, lan: string, far: string) => {
    await page.locator('[data-device]').filter({ hasText: new RegExp(`^${name}`) }).first().click();
    const cli = page.getByLabel(new RegExp(`CLI ${name}: wpisz polecenie`));
    for (const line of ['enable', 'conf t', `crypto isakmp key ${key} address ${peer}`, 'crypto ipsec profile VPN', 'exit', 'interface Tunnel0', `ip address ${inside} 255.255.255.252`, 'tunnel source g0/0/1', 'tunnel mode ipsec ipv4', `tunnel destination ${peer}`, 'tunnel protection ipsec profile VPN', 'exit', `ip route ${lan} 255.255.255.0 ${far}`, 'end', 'show ip interface brief']) {
      await cli.fill(line);
      await cli.press('Enter');
    }
    await page.getByRole('button', { name: 'Zamknij panel' }).click();
  };
  await configure('R1', 'Oddzialy2026', '198.51.100.1', '10.255.0.1', '192.168.2.0', '10.255.0.2');
  await configure('R2', 'Oddzialy2026', '203.0.113.1', '10.255.0.2', '192.168.1.0', '10.255.0.1');
  await page.getByRole('button', { name: 'Sprawdź wyniki' }).click();
  await expect(page.locator('.lab-results .score-ring strong')).toHaveText('100%');
  await page.keyboard.press('s');
  await page.keyboard.press('p');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('[data-device]').filter({ hasText: /^PC1/ }).first().click();
    await page.locator('[data-device]').filter({ hasText: /^SRV2/ }).first().click();
  }
  await page.keyboard.press('Escape');
  await page.keyboard.press('a');
  const dialog = page.getByRole('dialog', { name: 'Analizator pakietów' });
  await dialog.getByLabel('Filtr wyświetlania').fill('esp');
  await expect(dialog.locator('tbody tr').first()).toContainText('ESP');
  await expect(dialog.locator('tbody tr').first()).toContainText(/203\.0\.113\.1|198\.51\.100\.1/);
});
