import { l } from '../../i18n/l10n';
import { NetBuilder } from '../../sim/builder';
import type { Device } from '../../sim/types';
import type { Lab, LabCheck, LabContext } from '../types';

export function check(id: string, label: [string, string], hint: [string, string], test: (c: LabContext) => boolean): LabCheck {
  return { id, label: l(label[0], label[1]), hint: l(hint[0], hint[1]), test };
}

export function blankHost(device: Device): void {
  for (const port of device.ports) {
    port.dhcp = false;
    port.ip = '';
    port.gateway = '';
    port.dns = '';
  }
}

export function ipIs(c: LabContext, device: string, port: string, ip: string, prefix: number): boolean {
  const p = c.port(device, port);
  return Boolean(p && p.ip === ip && p.prefix === prefix);
}

export function vifIs(c: LabContext, device: string, name: string, ip: string, prefix: number): boolean {
  const vif = c.device(device)?.vifs.find((v) => v.name.toLowerCase() === name.toLowerCase());
  return Boolean(vif && vif.ip === ip && vif.prefix === prefix && !vif.shutdown);
}

export const BASIC_LABS: Lab[] = [
  {
    id: 'pierwsza-siec',
    level: 1,
    minutes: 10,
    title: l('Pierwsza sieć: dwa komputery i przełącznik', 'First network: two computers and a switch'),
    summary: l('Połącz kable, nadaj adresy IP i sprawdź łączność pingiem.', 'Connect the cables, assign IP addresses and test with ping.'),
    goals: [l('Podłączać urządzenia kablem', 'Cable devices together'), l('Ustawiać adres IP i maskę', 'Set an IP address and mask'), l('Używać polecenia ping', 'Use the ping command')],
    steps: {
      pl: [
        { t: 'p', text: 'Na planszy stoją dwa komputery i przełącznik, ale nic nie jest połączone ani skonfigurowane.' },
        {
          t: 'list',
          ordered: true,
          items: [
            'Wybierz narzędzie **Połącz kablem** (klawisz `C`), kliknij PC1, a potem SW1. Tak samo połącz PC2 z SW1.',
            'Kliknij PC1, otwórz **Konfiguracja IP**, wybierz **Statycznie** i wpisz adres `192.168.1.10` z maską `255.255.255.0`.',
            'Na PC2 ustaw `192.168.1.20` z tą samą maską.',
            'Na PC1 otwórz **Wiersz poleceń** i wpisz `ping 192.168.1.20`.',
            'Kliknij **Sprawdź wyniki**.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Bramy nie musisz ustawiać: oba komputery są w tej samej sieci 192.168.1.0/24.' },
      ],
      en: [
        { t: 'p', text: 'The canvas has two computers and a switch, but nothing is connected or configured.' },
        {
          t: 'list',
          ordered: true,
          items: [
            'Pick the **Connect cable** tool (key `C`), click PC1, then SW1. Connect PC2 to SW1 the same way.',
            'Click PC1, open **IP configuration**, choose **Static** and enter `192.168.1.10` with mask `255.255.255.0`.',
            'On PC2 set `192.168.1.20` with the same mask.',
            'On PC1 open **Command prompt** and type `ping 192.168.1.20`.',
            'Click **Check results**.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'You do not need a gateway: both computers are in the same network 192.168.1.0/24.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      b.add('switch', 'SW1', 300, 140);
      blankHost(b.add('pc', 'PC1', 120, 320));
      blankHost(b.add('pc', 'PC2', 480, 320));
      return b.net;
    },
    checks: [
      check('c1', ['PC1 jest podłączony do SW1', 'PC1 is connected to SW1'], ['Użyj narzędzia Połącz kablem.', 'Use the Connect cable tool.'], (c) => c.connected('PC1', 'SW1')),
      check('c2', ['PC2 jest podłączony do SW1', 'PC2 is connected to SW1'], ['Połącz PC2 z przełącznikiem.', 'Connect PC2 to the switch.'], (c) => c.connected('PC2', 'SW1')),
      check('c3', ['PC1 ma adres 192.168.1.10/24', 'PC1 has 192.168.1.10/24'], ['Sprawdź adres i maskę w Konfiguracji IP.', 'Check the address and mask in IP configuration.'], (c) => ipIs(c, 'PC1', 'eth0', '192.168.1.10', 24)),
      check('c4', ['PC2 ma adres 192.168.1.20/24', 'PC2 has 192.168.1.20/24'], ['Sprawdź adres i maskę PC2.', 'Check PC2’s address and mask.'], (c) => ipIs(c, 'PC2', 'eth0', '192.168.1.20', 24)),
      check('c5', ['PC1 pinguje PC2', 'PC1 pings PC2'], ['Kable i adresy muszą być poprawne.', 'Cables and addresses must be correct.'], (c) => c.ping('PC1', '192.168.1.20')),
    ],
  },
  {
    id: 'siec-domowa',
    level: 1,
    minutes: 15,
    title: l('Sieć domowa z Wi-Fi 7', 'Home network with Wi-Fi 7'),
    summary: l('Podłącz router do internetu, zabezpiecz Wi-Fi i połącz laptop oraz telefon.', 'Connect the router to the internet, secure Wi-Fi and join a laptop and a phone.'),
    goals: [l('Podłączyć router do dostawcy', 'Connect a router to the provider'), l('Zabezpieczyć sieć Wi-Fi', 'Secure a Wi-Fi network'), l('Sprawdzić dostęp do strony WWW', 'Check website access')],
    steps: {
      pl: [
        {
          t: 'list',
          ordered: true,
          items: [
            'Połącz port **WAN** routera GW1 z chmurą **ISP** (narzędzie Połącz kablem, typ Miedź Cat6A, port WAN i port0).',
            'Podłącz PC1 kablem do portu LAN routera. Komputer pobierze adres przez DHCP.',
            'Otwórz panel GW1 i ustaw Wi-Fi: SSID `MojDom`, zabezpieczenie **WPA3**, hasło co najmniej 12 znaków.',
            'Na laptopie i telefonie otwórz aplikację **Wi-Fi** i połącz się z siecią `MojDom`.',
            'Na laptopie otwórz **Przeglądarkę** i wejdź na `https://www.przyklad.pl`.',
          ],
        },
        { t: 'callout', kind: 'info', text: 'Zasięg Wi-Fi widać po kliknięciu routera. Urządzenie poza okręgiem nie połączy się.' },
      ],
      en: [
        {
          t: 'list',
          ordered: true,
          items: [
            'Connect GW1’s **WAN** port to the **ISP** cloud (Connect cable tool, Copper Cat6A, port WAN and port0).',
            'Plug PC1 into a router LAN port. The computer gets an address via DHCP.',
            'Open GW1’s panel and set Wi-Fi: SSID `MojDom`, security **WPA3**, a password of at least 12 characters.',
            'On the laptop and the phone open the **Wi-Fi** app and join `MojDom`.',
            'On the laptop open the **Web browser** and go to `https://www.przyklad.pl`.',
          ],
        },
        { t: 'callout', kind: 'info', text: 'Click the router to see its Wi-Fi range. A device outside the circle will not connect.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      b.add('internet', 'ISP', 720, 160);
      b.add('homeRouter', 'GW1', 440, 200);
      b.add('pc', 'PC1', 200, 120);
      b.add('laptop', 'LAPTOP1', 300, 380);
      b.add('phone', 'TEL1', 540, 400);
      return b.net;
    },
    checks: [
      check('c1', ['Router dostał adres od dostawcy', 'The router got a provider address'], ['Połącz port WAN routera z chmurą ISP.', 'Connect the router WAN port to the ISP cloud.'], (c) => Boolean(c.port('GW1', 'WAN')?.ip)),
      check('c2', ['PC1 ma adres z sieci 192.168.1.0/24', 'PC1 has an address in 192.168.1.0/24'], ['PC1 musi być podłączony do portu LAN.', 'PC1 must be plugged into a LAN port.'], (c) => c.inSubnet(c.port('PC1', 'eth0')?.ip ?? '', '192.168.1.0/24')),
      check('c3', ['Wi-Fi: SSID MojDom, WPA3, hasło 12+ znaków', 'Wi-Fi: SSID MojDom, WPA3, 12+ character password'], ['Ustaw to w panelu routera, sekcja Wi-Fi.', 'Set it in the router panel, Wi-Fi section.'], (c) => {
        const w = c.device('GW1')?.wifi;
        return Boolean(w && w.ssid.toLowerCase() === 'mojdom' && w.security === 'wpa3' && w.key.length >= 12);
      }),
      check('c4', ['Laptop jest w sieci Wi-Fi', 'The laptop is on Wi-Fi'], ['Aplikacja Wi-Fi na laptopie.', 'The Wi-Fi app on the laptop.'], (c) => c.wifi('LAPTOP1')),
      check('c5', ['Telefon jest w sieci Wi-Fi', 'The phone is on Wi-Fi'], ['Aplikacja Wi-Fi na telefonie. Sprawdź zasięg.', 'The Wi-Fi app on the phone. Check the range.'], (c) => c.wifi('TEL1')),
      check('c6', ['Laptop otwiera www.przyklad.pl', 'The laptop opens www.przyklad.pl'], ['Router potrzebuje połączenia z ISP.', 'The router needs the ISP connection.'], (c) => c.http('LAPTOP1', 'https://www.przyklad.pl')),
    ],
  },
  {
    id: 'arp-krok-po-kroku',
    level: 2,
    minutes: 10,
    title: l('ARP i przełączanie krok po kroku', 'ARP and switching step by step'),
    summary: l('Obserwuj w trybie symulacji, jak ARP znajduje adres MAC, a przełącznik uczy się portów.', 'Watch in simulation mode how ARP finds a MAC and the switch learns ports.'),
    goals: [l('Czytać zdarzenia w trybie symulacji', 'Read simulation events'), l('Rozumieć zalewanie i uczenie MAC', 'Understand flooding and MAC learning')],
    steps: {
      pl: [
        {
          t: 'list',
          ordered: true,
          items: [
            'Przełącz tryb na **Symulacja** (klawisz `S`).',
            'Wybierz **Pakiet testowy** (`P`), kliknij PC1, a potem PC3.',
            'Odtwarzaj krok po kroku. Kliknij zdarzenie ARP i przeczytaj, co robi przełącznik i dlaczego PC2 odrzuca ramkę.',
            'Na PC1 wpisz w wierszu poleceń `arp -a`, a w CLI SW1 `show mac address-table`.',
            'Kliknij **Sprawdź wyniki**.',
          ],
        },
      ],
      en: [
        {
          t: 'list',
          ordered: true,
          items: [
            'Switch to **Simulation** mode (key `S`).',
            'Pick **Test packet** (`P`), click PC1, then PC3.',
            'Step through it. Click the ARP event and read what the switch does and why PC2 drops the frame.',
            'On PC1 type `arp -a` in the command prompt, and in SW1’s CLI `show mac address-table`.',
            'Click **Check results**.',
          ],
        },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const sw = b.add('switch', 'SW1', 320, 140);
      const pcs = [b.add('pc', 'PC1', 120, 320), b.add('pc', 'PC2', 320, 360), b.add('pc', 'PC3', 520, 320)];
      pcs.forEach((pc, i) => b.link(pc, 'eth0', sw, `Gi1/0/${i + 1}`).host(pc, `192.168.1.${(i + 1) * 10}/24`));
      return b.net;
    },
    checks: [
      check('c1', ['PC1 zna adres MAC PC3 (tablica ARP)', 'PC1 knows PC3’s MAC (ARP table)'], ['Wyślij pakiet testowy z PC1 do PC3.', 'Send a test packet from PC1 to PC3.'], (c) => c.arpHas('PC1', '192.168.1.30')),
      check('c2', ['SW1 nauczył się MAC komputera PC1', 'SW1 learned PC1’s MAC'], ['Przełącznik uczy się z ramek nadawanych przez PC1.', 'The switch learns from frames sent by PC1.'], (c) => c.macKnows('SW1', 'PC1')),
      check('c3', ['SW1 nauczył się MAC komputera PC3', 'SW1 learned PC3’s MAC'], ['PC3 musi odpowiedzieć.', 'PC3 has to reply.'], (c) => c.macKnows('SW1', 'PC3')),
    ],
  },
  {
    id: 'dwie-sieci',
    level: 2,
    minutes: 15,
    title: l('Router między dwiema sieciami', 'A router between two networks'),
    summary: l('Skonfiguruj interfejsy routera w CLI i ustaw bramę, żeby połączyć dwie podsieci.', 'Configure router interfaces in the CLI and set a gateway to join two subnets.'),
    goals: [l('Pracować w CLI routera', 'Work in the router CLI'), l('Włączać interfejsy', 'Enable interfaces'), l('Rozumieć bramę domyślną', 'Understand the default gateway')],
    steps: {
      pl: [
        {
          t: 'code',
          lines: ['R1> enable', 'R1# configure terminal', 'R1(config)# interface g0/0/0', 'R1(config-if)# ip address 192.168.1.1 255.255.255.0', 'R1(config-if)# no shutdown', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ip address 192.168.2.1 255.255.255.0', 'R1(config-if)# no shutdown', 'R1(config-if)# end'],
          caption: 'Polecenia do wpisania w zakładce CLI routera R1.',
        },
        { t: 'list', items: ['PC2 nie ma bramy domyślnej. Ustaw ją w Konfiguracji IP na `192.168.2.1`.', 'Sprawdź `ping 192.168.2.10` z PC1. Pierwsza odpowiedź może zginąć przez ARP na routerze.'] },
      ],
      en: [
        {
          t: 'code',
          lines: ['R1> enable', 'R1# configure terminal', 'R1(config)# interface g0/0/0', 'R1(config-if)# ip address 192.168.1.1 255.255.255.0', 'R1(config-if)# no shutdown', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ip address 192.168.2.1 255.255.255.0', 'R1(config-if)# no shutdown', 'R1(config-if)# end'],
          caption: 'Commands to type in router R1’s CLI tab.',
        },
        { t: 'list', items: ['PC2 has no default gateway. Set it to `192.168.2.1` in IP configuration.', 'Test `ping 192.168.2.10` from PC1. The first reply may be lost to ARP on the router.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 340, 120);
      const sw1 = b.add('switch', 'SW1', 160, 260);
      const sw2 = b.add('switch', 'SW2', 520, 260);
      const pc1 = b.add('pc', 'PC1', 160, 420);
      const pc2 = b.add('pc', 'PC2', 520, 420);
      b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r1, 'Gi0/0/1', sw2, 'Gi1/0/24').link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
      b.host(pc1, '192.168.1.10/24', '192.168.1.1').host(pc2, '192.168.2.10/24');
      return b.net;
    },
    checks: [
      check('c1', ['R1 Gi0/0/0: 192.168.1.1/24 i włączony', 'R1 Gi0/0/0: 192.168.1.1/24 and up'], ['ip address i no shutdown na Gi0/0/0.', 'ip address and no shutdown on Gi0/0/0.'], (c) => ipIs(c, 'R1', 'Gi0/0/0', '192.168.1.1', 24) && c.portUp('R1', 'Gi0/0/0')),
      check('c2', ['R1 Gi0/0/1: 192.168.2.1/24 i włączony', 'R1 Gi0/0/1: 192.168.2.1/24 and up'], ['ip address i no shutdown na Gi0/0/1.', 'ip address and no shutdown on Gi0/0/1.'], (c) => ipIs(c, 'R1', 'Gi0/0/1', '192.168.2.1', 24) && c.portUp('R1', 'Gi0/0/1')),
      check('c3', ['PC2 ma bramę 192.168.2.1', 'PC2 uses gateway 192.168.2.1'], ['Konfiguracja IP na PC2.', 'IP configuration on PC2.'], (c) => c.port('PC2', 'eth0')?.gateway === '192.168.2.1'),
      check('c4', ['PC1 pinguje PC2', 'PC1 pings PC2'], ['Obie bramy i oba interfejsy muszą działać.', 'Both gateways and both interfaces must work.'], (c) => c.ping('PC1', '192.168.2.10')),
    ],
  },
  {
    id: 'podsieci',
    level: 3,
    minutes: 20,
    title: l('Plan adresacji VLSM', 'A VLSM address plan'),
    summary: l('Podziel 172.16.0.0/24 na trzy podsieci różnej wielkości i skonfiguruj router oraz komputery.', 'Split 172.16.0.0/24 into three subnets of different sizes and configure the router and PCs.'),
    goals: [l('Liczyć podsieci VLSM', 'Compute VLSM subnets'), l('Przypisywać pierwszy i ostatni adres hosta', 'Assign first and last host addresses')],
    steps: {
      pl: [
        { t: 'p', text: 'Masz sieć `172.16.0.0/24`. Dział A potrzebuje 100 hostów, dział B 50, a dział C 20. Przydziel bloki od największego, po kolei od początku przestrzeni.' },
        {
          t: 'list',
          items: [
            'Router R1 dostaje **pierwszy** użyteczny adres każdej podsieci: Gi0/0/0 dla A, Gi0/0/1 dla B, Gi0/0/2 dla C. Pamiętaj o `no shutdown`.',
            'PC-A, PC-B i PC-C dostają **ostatni** użyteczny adres swojej podsieci i bramę na routerze.',
            'Sprawdź ping z PC-A do PC-C.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Dział A: /25. Dział B: /26. Dział C: /27. Policz, gdzie zaczyna się każdy blok.' },
      ],
      en: [
        { t: 'p', text: 'You have `172.16.0.0/24`. Department A needs 100 hosts, B needs 50 and C needs 20. Allocate blocks from the largest, in order from the start of the space.' },
        {
          t: 'list',
          items: [
            'Router R1 gets the **first** usable address of each subnet: Gi0/0/0 for A, Gi0/0/1 for B, Gi0/0/2 for C. Remember `no shutdown`.',
            'PC-A, PC-B and PC-C get the **last** usable address of their subnet and the router as gateway.',
            'Test a ping from PC-A to PC-C.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Department A: /25. B: /26. C: /27. Work out where each block starts.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 360, 100);
      const names = ['A', 'B', 'C'];
      names.forEach((n, i) => {
        const sw = b.add('switch', `SW-${n}`, 140 + i * 220, 260);
        const pc = b.add('pc', `PC-${n}`, 140 + i * 220, 420);
        blankHost(pc);
        b.link(r1, `Gi0/0/${i}`, sw, 'Gi1/0/24').link(pc, 'eth0', sw, 'Gi1/0/1');
      });
      return b.net;
    },
    checks: [
      check('c1', ['R1 Gi0/0/0 = 172.16.0.1/25', 'R1 Gi0/0/0 = 172.16.0.1/25'], ['Pierwszy blok /25 zaczyna się od 172.16.0.0.', 'The first /25 block starts at 172.16.0.0.'], (c) => ipIs(c, 'R1', 'Gi0/0/0', '172.16.0.1', 25) && c.portUp('R1', 'Gi0/0/0')),
      check('c2', ['R1 Gi0/0/1 = 172.16.0.129/26', 'R1 Gi0/0/1 = 172.16.0.129/26'], ['Blok B zaczyna się zaraz po A, od .128.', 'Block B starts right after A, at .128.'], (c) => ipIs(c, 'R1', 'Gi0/0/1', '172.16.0.129', 26) && c.portUp('R1', 'Gi0/0/1')),
      check('c3', ['R1 Gi0/0/2 = 172.16.0.193/27', 'R1 Gi0/0/2 = 172.16.0.193/27'], ['Blok C zaczyna się od .192.', 'Block C starts at .192.'], (c) => ipIs(c, 'R1', 'Gi0/0/2', '172.16.0.193', 27) && c.portUp('R1', 'Gi0/0/2')),
      check('c4', ['PC-A = 172.16.0.126/25, brama .1', 'PC-A = 172.16.0.126/25, gateway .1'], ['Ostatni host przed rozgłoszeniem .127.', 'The last host before broadcast .127.'], (c) => ipIs(c, 'PC-A', 'eth0', '172.16.0.126', 25) && c.port('PC-A', 'eth0')?.gateway === '172.16.0.1'),
      check('c5', ['PC-B = 172.16.0.190/26, brama .129', 'PC-B = 172.16.0.190/26, gateway .129'], ['Rozgłoszenie bloku B to .191.', 'Block B broadcast is .191.'], (c) => ipIs(c, 'PC-B', 'eth0', '172.16.0.190', 26) && c.port('PC-B', 'eth0')?.gateway === '172.16.0.129'),
      check('c6', ['PC-C = 172.16.0.222/27, brama .193', 'PC-C = 172.16.0.222/27, gateway .193'], ['Rozgłoszenie bloku C to .223.', 'Block C broadcast is .223.'], (c) => ipIs(c, 'PC-C', 'eth0', '172.16.0.222', 27) && c.port('PC-C', 'eth0')?.gateway === '172.16.0.193'),
      check('c7', ['PC-A pinguje PC-C', 'PC-A pings PC-C'], ['Wszystkie adresy i bramy muszą być poprawne.', 'All addresses and gateways must be correct.'], (c) => c.ping('PC-A', '172.16.0.222')),
    ],
  },
  {
    id: 'routing-statyczny',
    level: 3,
    minutes: 20,
    title: l('Routing statyczny przez trzy routery', 'Static routing across three routers'),
    summary: l('Dodaj trasy statyczne i domyślne, żeby PC1 i PC3 mogły rozmawiać przez R2.', 'Add static and default routes so PC1 and PC3 can talk through R2.'),
    goals: [l('Konfigurować ip route', 'Configure ip route'), l('Pamiętać o trasie powrotnej', 'Remember the return path')],
    steps: {
      pl: [
        { t: 'p', text: 'Adresy na routerach są już ustawione. Brakuje tras. R1 i R3 to routery brzegowe: wystarczy im trasa domyślna przez R2. R2 musi znać obie sieci LAN.' },
        { t: 'code', lines: ['R1(config)# ip route 0.0.0.0 0.0.0.0 10.0.12.2', 'R3(config)# ip route 0.0.0.0 0.0.0.0 10.0.23.1', 'R2(config)# ip route 10.1.0.0 255.255.255.0 10.0.12.1', 'R2(config)# ip route 10.3.0.0 255.255.255.0 10.0.23.2'], caption: 'Spróbuj najpierw samodzielnie, a gdy utkniesz, zajrzyj tutaj.' },
        { t: 'p', text: 'Sprawdź `tracert 10.3.0.10` na PC1. Zobaczysz kolejne routery na trasie.' },
      ],
      en: [
        { t: 'p', text: 'Router addresses are already set. Routes are missing. R1 and R3 are edge routers: a default route via R2 is enough. R2 must know both LANs.' },
        { t: 'code', lines: ['R1(config)# ip route 0.0.0.0 0.0.0.0 10.0.12.2', 'R3(config)# ip route 0.0.0.0 0.0.0.0 10.0.23.1', 'R2(config)# ip route 10.1.0.0 255.255.255.0 10.0.12.1', 'R2(config)# ip route 10.3.0.0 255.255.255.0 10.0.23.2'], caption: 'Try on your own first and peek here if you get stuck.' },
        { t: 'p', text: 'Run `tracert 10.3.0.10` on PC1. You will see each router on the path.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 160, 160);
      const r2 = b.add('router', 'R2', 380, 160);
      const r3 = b.add('router', 'R3', 600, 160);
      const pc1 = b.add('pc', 'PC1', 160, 360);
      const pc3 = b.add('pc', 'PC3', 600, 360);
      b.link(pc1, 'eth0', r1, 'Gi0/0/0').link(r1, 'Gi0/0/1', r2, 'Gi0/0/0').link(r2, 'Gi0/0/1', r3, 'Gi0/0/0').link(r3, 'Gi0/0/1', pc3, 'eth0');
      b.ip(r1, 'Gi0/0/0', '10.1.0.1/24').ip(r1, 'Gi0/0/1', '10.0.12.1/30');
      b.ip(r2, 'Gi0/0/0', '10.0.12.2/30').ip(r2, 'Gi0/0/1', '10.0.23.1/30');
      b.ip(r3, 'Gi0/0/0', '10.0.23.2/30').ip(r3, 'Gi0/0/1', '10.3.0.1/24');
      b.host(pc1, '10.1.0.10/24', '10.1.0.1').host(pc3, '10.3.0.10/24', '10.3.0.1');
      return b.net;
    },
    checks: [
      check('c1', ['R1 zna drogę do 10.3.0.0/24', 'R1 knows a way to 10.3.0.0/24'], ['Trasa domyślna przez 10.0.12.2 wystarczy.', 'A default route via 10.0.12.2 is enough.'], (c) => c.hasRoute('R1', '0.0.0.0/0') || c.hasRoute('R1', '10.3.0.0/24')),
      check('c2', ['R2 zna obie sieci LAN', 'R2 knows both LANs'], ['Dwie trasy statyczne na R2.', 'Two static routes on R2.'], (c) => c.hasRoute('R2', '10.1.0.0/24') && c.hasRoute('R2', '10.3.0.0/24')),
      check('c3', ['R3 zna drogę powrotną', 'R3 knows the way back'], ['Bez trasy powrotnej odpowiedź zginie na R3.', 'Without a return route the reply dies at R3.'], (c) => c.hasRoute('R3', '0.0.0.0/0') || c.hasRoute('R3', '10.1.0.0/24')),
      check('c4', ['PC1 pinguje PC3', 'PC1 pings PC3'], ['Sprawdź tracert, gdzie urywa się droga.', 'Use tracert to see where the path breaks.'], (c) => c.ping('PC1', '10.3.0.10')),
    ],
  },
  {
    id: 'vlan',
    level: 3,
    minutes: 15,
    title: l('VLAN-y na przełączniku', 'VLANs on a switch'),
    summary: l('Oddziel biuro od gości dwoma VLAN-ami na jednym przełączniku.', 'Separate the office from guests with two VLANs on one switch.'),
    goals: [l('Tworzyć i nazywać VLAN-y', 'Create and name VLANs'), l('Przypisywać porty dostępowe', 'Assign access ports')],
    steps: {
      pl: [
        { t: 'list', ordered: true, items: ['Utwórz VLAN 10 o nazwie `BIURO` i VLAN 20 o nazwie `GOSCIE`.', 'Porty Gi1/0/1-2 (PC1, PC2) przypisz do VLAN 10.', 'Porty Gi1/0/3-4 (PC3, PC4) przypisz do VLAN 20.', 'Sprawdź: PC1 pinguje PC2, ale nie PC3.'] },
        { t: 'code', lines: ['SW1(config)# vlan 10', 'SW1(config-vlan)# name BIURO', 'SW1(config)# interface range g1/0/1 - 2', 'SW1(config-if-range)# switchport mode access', 'SW1(config-if-range)# switchport access vlan 10', 'SW1# show vlan brief'], caption: 'Wszystkie komputery mają adresy z jednej podsieci, a mimo to VLAN-y je rozdzielą.' },
      ],
      en: [
        { t: 'list', ordered: true, items: ['Create VLAN 10 named `BIURO` and VLAN 20 named `GOSCIE`.', 'Assign ports Gi1/0/1-2 (PC1, PC2) to VLAN 10.', 'Assign ports Gi1/0/3-4 (PC3, PC4) to VLAN 20.', 'Check: PC1 pings PC2 but not PC3.'] },
        { t: 'code', lines: ['SW1(config)# vlan 10', 'SW1(config-vlan)# name BIURO', 'SW1(config)# interface range g1/0/1 - 2', 'SW1(config-if-range)# switchport mode access', 'SW1(config-if-range)# switchport access vlan 10', 'SW1# show vlan brief'], caption: 'All computers share one subnet, yet VLANs will separate them.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const sw = b.add('switch', 'SW1', 360, 140);
      for (let i = 1; i <= 4; i++) {
        const pc = b.add('pc', `PC${i}`, 60 + i * 120, 360);
        b.link(pc, 'eth0', sw, `Gi1/0/${i}`).host(pc, `192.168.100.${10 + i}/24`);
      }
      return b.net;
    },
    checks: [
      check('c1', ['VLAN 10 nazywa się BIURO', 'VLAN 10 is named BIURO'], ['vlan 10 i name BIURO.', 'vlan 10 and name BIURO.'], (c) => c.device('SW1')?.vlans.find((v) => v.id === 10)?.name.toUpperCase() === 'BIURO'),
      check('c2', ['VLAN 20 nazywa się GOSCIE', 'VLAN 20 is named GOSCIE'], ['vlan 20 i name GOSCIE.', 'vlan 20 and name GOSCIE.'], (c) => c.device('SW1')?.vlans.find((v) => v.id === 20)?.name.toUpperCase() === 'GOSCIE'),
      check('c3', ['PC1 i PC2 są w VLAN 10', 'PC1 and PC2 are in VLAN 10'], ['switchport access vlan 10 na Gi1/0/1-2.', 'switchport access vlan 10 on Gi1/0/1-2.'], (c) => [1, 2].every((n) => c.port('SW1', `Gi1/0/${n}`)?.accessVlan === 10 && c.port('SW1', `Gi1/0/${n}`)?.mode === 'access')),
      check('c4', ['PC3 i PC4 są w VLAN 20', 'PC3 and PC4 are in VLAN 20'], ['switchport access vlan 20 na Gi1/0/3-4.', 'switchport access vlan 20 on Gi1/0/3-4.'], (c) => [3, 4].every((n) => c.port('SW1', `Gi1/0/${n}`)?.accessVlan === 20 && c.port('SW1', `Gi1/0/${n}`)?.mode === 'access')),
      check('c5', ['PC1 pinguje PC2', 'PC1 pings PC2'], ['Ten sam VLAN, ta sama podsieć.', 'Same VLAN, same subnet.'], (c) => c.ping('PC1', '192.168.100.12')),
      check('c6', ['PC1 nie dosięga PC3', 'PC1 cannot reach PC3'], ['Różne VLAN-y nie powinny się widzieć.', 'Different VLANs should not see each other.'], (c) => !c.ping('PC1', '192.168.100.13')),
    ],
  },
  {
    id: 'inter-vlan',
    level: 3,
    minutes: 20,
    title: l('Router na patyku', 'Router on a stick'),
    summary: l('Połącz dwa VLAN-y przez podinterfejsy routera i trunk 802.1Q.', 'Join two VLANs with router subinterfaces and an 802.1Q trunk.'),
    goals: [l('Konfigurować trunk', 'Configure a trunk'), l('Tworzyć podinterfejsy z dot1Q', 'Create dot1Q subinterfaces')],
    steps: {
      pl: [
        { t: 'p', text: 'VLAN-y 10 i 20 są już utworzone, a komputery mają adresy i bramy. Brakuje trunku i routera.' },
        { t: 'list', ordered: true, items: ['Na SW1 ustaw port Gi1/0/24 (do routera) w trybie trunk.', 'Na R1 włącz Gi0/0/0 (`no shutdown`).', 'Utwórz `interface g0/0/0.10` z `encapsulation dot1Q 10` i adresem 192.168.10.1/24.', 'Utwórz `interface g0/0/0.20` z `encapsulation dot1Q 20` i adresem 192.168.20.1/24.', 'Sprawdź ping z PC10 do PC20.'] },
      ],
      en: [
        { t: 'p', text: 'VLANs 10 and 20 already exist and the computers have addresses and gateways. The trunk and router are missing.' },
        { t: 'list', ordered: true, items: ['On SW1 set port Gi1/0/24 (to the router) to trunk mode.', 'On R1 enable Gi0/0/0 (`no shutdown`).', 'Create `interface g0/0/0.10` with `encapsulation dot1Q 10` and address 192.168.10.1/24.', 'Create `interface g0/0/0.20` with `encapsulation dot1Q 20` and address 192.168.20.1/24.', 'Test a ping from PC10 to PC20.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 360, 100);
      const sw = b.add('switch', 'SW1', 360, 260);
      const pc10 = b.add('pc', 'PC10', 180, 420);
      const pc20 = b.add('pc', 'PC20', 540, 420);
      b.link(sw, 'Gi1/0/24', r1, 'Gi0/0/0').link(pc10, 'eth0', sw, 'Gi1/0/1').link(pc20, 'eth0', sw, 'Gi1/0/2');
      b.vlan(sw, 10, 'BIURO').vlan(sw, 20, 'GOSCIE').access(sw, 10, 'Gi1/0/1').access(sw, 20, 'Gi1/0/2');
      b.host(pc10, '192.168.10.10/24', '192.168.10.1').host(pc20, '192.168.20.10/24', '192.168.20.1');
      return b.net;
    },
    checks: [
      check('c1', ['SW1 Gi1/0/24 jest trunkiem', 'SW1 Gi1/0/24 is a trunk'], ['switchport mode trunk na porcie do routera.', 'switchport mode trunk on the port to the router.'], (c) => c.port('SW1', 'Gi1/0/24')?.mode === 'trunk'),
      check('c2', ['R1 Gi0/0/0 jest włączony', 'R1 Gi0/0/0 is up'], ['no shutdown na interfejsie fizycznym.', 'no shutdown on the physical interface.'], (c) => c.portUp('R1', 'Gi0/0/0')),
      check('c3', ['Podinterfejs .10: dot1Q 10, 192.168.10.1/24', 'Subinterface .10: dot1Q 10, 192.168.10.1/24'], ['encapsulation dot1Q 10 i ip address.', 'encapsulation dot1Q 10 and ip address.'], (c) => Boolean(c.device('R1')?.vifs.some((v) => v.kind === 'sub' && v.vlan === 10 && v.ip === '192.168.10.1' && v.prefix === 24))),
      check('c4', ['Podinterfejs .20: dot1Q 20, 192.168.20.1/24', 'Subinterface .20: dot1Q 20, 192.168.20.1/24'], ['encapsulation dot1Q 20 i ip address.', 'encapsulation dot1Q 20 and ip address.'], (c) => Boolean(c.device('R1')?.vifs.some((v) => v.kind === 'sub' && v.vlan === 20 && v.ip === '192.168.20.1' && v.prefix === 24))),
      check('c5', ['PC10 pinguje PC20', 'PC10 pings PC20'], ['Trunk i oba podinterfejsy muszą działać.', 'The trunk and both subinterfaces must work.'], (c) => c.ping('PC10', '192.168.20.10')),
    ],
  },
];
