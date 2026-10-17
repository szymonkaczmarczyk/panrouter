import { l } from '../i18n/l10n';
import { NetBuilder } from '../sim/builder';
import { check } from './labs/basic';
import { MODULES } from './modules';
import type { Lab, Question } from './types';

export const EXAM = {
  theoryCount: 30,
  theoryMinutes: 45,
  theoryWeight: 0.7,
  practicalWeight: 0.3,
  passMark: 75,
};

export function pickTheory(seed: number): Question[] {
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s;
  };
  const perLevel = EXAM.theoryCount / 5;
  const chosen: Question[] = [];
  for (let level = 1; level <= 5; level++) {
    const pool = MODULES.filter((m) => m.level === level).flatMap((m) => m.quiz);
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = rnd() % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    chosen.push(...copy.slice(0, perLevel));
  }
  return chosen;
}

export const EXAM_LAB: Lab = {
  id: 'egzamin',
  level: 5,
  minutes: 40,
  title: l('Egzamin praktyczny: biuro z dwoma VLAN-ami', 'Practical exam: an office with two VLANs'),
  summary: l('Skonfiguruj sieć od zera: VLAN-y, trunk, routing między VLAN-ami, DHCP na routerze i NAT do internetu.', 'Configure the network from scratch: VLANs, a trunk, inter-VLAN routing, DHCP on the router and NAT to the internet.'),
  goals: [l('Wszystko z poziomów 1-4 w jednym zadaniu', 'Everything from levels 1-4 in one task')],
  steps: {
    pl: [
      { t: 'p', text: 'Firma ma dział biuro (PC1) i dział sprzedaży (PC2). Urządzenia są połączone, ale nic nie jest skonfigurowane. Komputery pobierają adresy przez DHCP.' },
      {
        t: 'list',
        ordered: true,
        items: [
          'SW1: VLAN 10 (port Gi1/0/1, PC1) i VLAN 20 (port Gi1/0/2, PC2). Port Gi1/0/24 do routera jako trunk.',
          'R1: podinterfejsy Gi0/0/0.10 (192.168.10.1/24) i Gi0/0/0.20 (192.168.20.1/24). Pamiętaj o włączeniu Gi0/0/0.',
          'R1: pule DHCP dla obu sieci z bramą .1 i DNS 198.51.100.53. Wyłącz z przydziału adresy .1-.9.',
          'R1: Gi0/0/1 pobiera adres od dostawcy (`ip address dhcp`).',
          'R1: PAT, żeby obie sieci miały internet.',
        ],
      },
      { t: 'callout', kind: 'info', text: 'Egzamin sprawdza wynik, a nie sposób. Możesz używać CLI, paneli i wiersza poleceń komputerów.' },
    ],
    en: [
      { t: 'p', text: 'The company has an office team (PC1) and a sales team (PC2). Devices are cabled but nothing is configured. Computers get addresses via DHCP.' },
      {
        t: 'list',
        ordered: true,
        items: [
          'SW1: VLAN 10 (port Gi1/0/1, PC1) and VLAN 20 (port Gi1/0/2, PC2). Port Gi1/0/24 to the router as a trunk.',
          'R1: subinterfaces Gi0/0/0.10 (192.168.10.1/24) and Gi0/0/0.20 (192.168.20.1/24). Remember to enable Gi0/0/0.',
          'R1: DHCP pools for both networks with gateway .1 and DNS 198.51.100.53. Exclude addresses .1-.9.',
          'R1: Gi0/0/1 gets its address from the provider (`ip address dhcp`).',
          'R1: PAT so both networks have internet.',
        ],
      },
      { t: 'callout', kind: 'info', text: 'The exam checks the result, not the method. Use the CLI, panels and the computers’ command prompt.' },
    ],
  },
  build: () => {
    const b = new NetBuilder();
    const isp = b.add('internet', 'ISP', 760, 120);
    const r1 = b.add('router', 'R1', 500, 140);
    const sw = b.add('switch', 'SW1', 300, 260);
    const pc1 = b.add('pc', 'PC1', 180, 420);
    const pc2 = b.add('pc', 'PC2', 420, 420);
    b.link(r1, 'Gi0/0/1', isp, 'port0').link(r1, 'Gi0/0/0', sw, 'Gi1/0/24').link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
    return b.net;
  },
  checks: [
    check('e1', ['Porty PC1 i PC2 w VLAN 10 i 20', 'PC1 and PC2 ports in VLANs 10 and 20'], ['switchport access vlan na SW1.', 'switchport access vlan on SW1.'], (c) => c.port('SW1', 'Gi1/0/1')?.accessVlan === 10 && c.port('SW1', 'Gi1/0/2')?.accessVlan === 20),
    check('e2', ['Trunk SW1-R1', 'SW1-R1 trunk'], ['switchport mode trunk na Gi1/0/24.', 'switchport mode trunk on Gi1/0/24.'], (c) => c.port('SW1', 'Gi1/0/24')?.mode === 'trunk'),
    check('e3', ['Podinterfejsy .10 i .20 na R1', 'Subinterfaces .10 and .20 on R1'], ['encapsulation dot1Q i adresy .1.', 'encapsulation dot1Q and .1 addresses.'], (c) => {
      const vifs = c.device('R1')?.vifs ?? [];
      return vifs.some((v) => v.vlan === 10 && v.ip === '192.168.10.1') && vifs.some((v) => v.vlan === 20 && v.ip === '192.168.20.1') && c.portUp('R1', 'Gi0/0/0');
    }),
    check('e4', ['PC1 ma adres z DHCP w 192.168.10.0/24', 'PC1 has a DHCP address in 192.168.10.0/24'], ['Pula DHCP na R1 dla VLAN 10.', 'A DHCP pool on R1 for VLAN 10.'], (c) => c.inSubnet(c.port('PC1', 'eth0')?.ip ?? '', '192.168.10.0/24') && Number((c.port('PC1', 'eth0')?.ip ?? '0.0.0.0').split('.')[3]) >= 10),
    check('e5', ['PC2 ma adres z DHCP w 192.168.20.0/24', 'PC2 has a DHCP address in 192.168.20.0/24'], ['Pula DHCP na R1 dla VLAN 20.', 'A DHCP pool on R1 for VLAN 20.'], (c) => c.inSubnet(c.port('PC2', 'eth0')?.ip ?? '', '192.168.20.0/24') && Number((c.port('PC2', 'eth0')?.ip ?? '0.0.0.0').split('.')[3]) >= 10),
    check('e6', ['PC1 pinguje PC2', 'PC1 pings PC2'], ['Routing między VLAN-ami.', 'Inter-VLAN routing.'], (c) => c.ping('PC1', 'PC2')),
    check('e7', ['PC1 otwiera www.przyklad.pl', 'PC1 opens www.przyklad.pl'], ['Adres od ISP, NAT inside na podinterfejsach, outside na Gi0/0/1.', 'ISP address, NAT inside on subinterfaces, outside on Gi0/0/1.'], (c) => c.http('PC1', 'https://www.przyklad.pl')),
    check('e8', ['PC2 otwiera www.przyklad.pl', 'PC2 opens www.przyklad.pl'], ['Lista ACL dla NAT musi obejmować obie sieci.', 'The NAT ACL must cover both networks.'], (c) => c.http('PC2', 'https://www.przyklad.pl')),
  ],
};
