import { l, type L10n } from '../i18n/l10n';
import type { DeviceKind, PortMedia } from './types';

export type DeviceCategory = 'routers' | 'switches' | 'wireless' | 'security' | 'end' | 'wan';

export interface PortGroup {
  long: string;
  short: string;
  ids: string[];
  media: PortMedia;
  speed: number;
  poe?: boolean;
}

export interface ModelSpec {
  kind: DeviceKind;
  model: string;
  namePrefix: string;
  category: DeviceCategory;
  title: L10n;
  desc: L10n;
  specs: L10n[];
  ports: PortGroup[];
  cli: boolean;
  needsPoe: boolean;
  routing: boolean;
  wifiRange: number;
}

function range(prefix: string, from: number, to: number): string[] {
  const ids: string[] = [];
  for (let n = from; n <= to; n++) ids.push(`${prefix}${n}`);
  return ids;
}

export const MODELS: ModelSpec[] = [
  {
    kind: 'router',
    model: 'ER-4100',
    namePrefix: 'R',
    category: 'routers',
    title: l('Router brzegowy ER-4100', 'Edge router ER-4100'),
    desc: l(
      'Router firmowy łączący sieci lokalne z internetem i oddziałami. Obsługuje routing statyczny i OSPF, NAT, listy ACL, serwer DHCP oraz podinterfejsy VLAN.',
      'Business router connecting local networks to the internet and branch offices. Supports static routing and OSPF, NAT, ACLs, a DHCP server and VLAN subinterfaces.',
    ),
    specs: [
      l('4 porty 1 Gb/s (RJ45)', '4 × 1 Gb/s ports (RJ45)'),
      l('2 porty 10 Gb/s SFP+ (światłowód)', '2 × 10 Gb/s SFP+ ports (fiber)'),
      l('Gotowy do SD-WAN, CLI w stylu przemysłowym', 'SD-WAN ready, industry-style CLI'),
    ],
    ports: [
      { long: 'GigabitEthernet', short: 'Gi', ids: range('0/0/', 0, 3), media: 'copper', speed: 1000 },
      { long: 'TenGigabitEthernet', short: 'Te', ids: range('0/1/', 0, 1), media: 'fiber', speed: 10000 },
    ],
    cli: true,
    needsPoe: false,
    routing: true,
    wifiRange: 0,
  },
  {
    kind: 'homeRouter',
    model: 'HR-7',
    namePrefix: 'GW',
    category: 'routers',
    title: l('Router domowy Wi-Fi 7', 'Wi-Fi 7 home router'),
    desc: l(
      'Urządzenie „wszystko w jednym” z domu lub małego biura: router z NAT, przełącznik na 4 porty, punkt dostępowy Wi-Fi 7 i serwer DHCP. Konfiguruje się go przez panel w przeglądarce.',
      'The all-in-one box from a home or small office: a router with NAT, a 4-port switch, a Wi-Fi 7 access point and a DHCP server. You configure it through a web panel.',
    ),
    specs: [
      l('Port WAN 2,5 Gb/s do ONT lub modemu', '2.5 Gb/s WAN port to the ONT or modem'),
      l('4 porty LAN 1 Gb/s', '4 × 1 Gb/s LAN ports'),
      l('Wi-Fi 7 (802.11be), pasma 2,4, 5 i 6 GHz, WPA3', 'Wi-Fi 7 (802.11be), 2.4, 5 and 6 GHz bands, WPA3'),
    ],
    ports: [
      { long: 'WAN', short: 'WAN', ids: [''], media: 'copper', speed: 2500 },
      { long: 'LAN', short: 'LAN', ids: range('', 1, 4), media: 'copper', speed: 1000 },
    ],
    cli: false,
    needsPoe: false,
    routing: true,
    wifiRange: 260,
  },
  {
    kind: 'switch',
    model: 'AS-2400P',
    namePrefix: 'SW',
    category: 'switches',
    title: l('Przełącznik dostępowy AS-2400P', 'Access switch AS-2400P'),
    desc: l(
      'Zarządzalny przełącznik warstwy 2 do podłączania komputerów, telefonów IP, kamer i punktów dostępowych. Obsługuje VLAN-y, trunki 802.1Q, RSTP i zasilanie PoE.',
      'Managed layer 2 switch for connecting computers, IP phones, cameras and access points. Supports VLANs, 802.1Q trunks, RSTP and PoE.',
    ),
    specs: [
      l('24 porty 1 Gb/s z PoE+ (802.3at)', '24 × 1 Gb/s ports with PoE+ (802.3at)'),
      l('4 porty 10 Gb/s SFP+ na łącza w górę', '4 × 10 Gb/s SFP+ uplink ports'),
      l('VLAN, 802.1Q, RSTP, zarządzanie przez CLI', 'VLAN, 802.1Q, RSTP, CLI management'),
    ],
    ports: [
      { long: 'GigabitEthernet', short: 'Gi', ids: range('1/0/', 1, 24), media: 'copper', speed: 1000, poe: true },
      { long: 'TenGigabitEthernet', short: 'Te', ids: range('1/1/', 1, 4), media: 'fiber', speed: 10000 },
    ],
    cli: true,
    needsPoe: false,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'l3switch',
    model: 'DS-4800',
    namePrefix: 'DSW',
    category: 'switches',
    title: l('Przełącznik warstwy 3 DS-4800', 'Layer 3 switch DS-4800'),
    desc: l(
      'Przełącznik dystrybucyjny lub rdzeniowy, który oprócz przełączania potrafi routować między VLAN-ami przez interfejsy SVI. Obsługuje trasy statyczne i OSPF.',
      'A distribution or core switch that can also route between VLANs using SVI interfaces. Supports static routes and OSPF.',
    ),
    specs: [
      l('24 porty 1 Gb/s (RJ45)', '24 × 1 Gb/s ports (RJ45)'),
      l('4 porty 25 Gb/s SFP28', '4 × 25 Gb/s SFP28 ports'),
      l('Routing między VLAN-ami, OSPF, ACL', 'Inter-VLAN routing, OSPF, ACLs'),
    ],
    ports: [
      { long: 'GigabitEthernet', short: 'Gi', ids: range('1/0/', 1, 24), media: 'copper', speed: 1000 },
      { long: 'TwentyFiveGigE', short: 'Twe', ids: range('1/1/', 1, 4), media: 'fiber', speed: 25000 },
    ],
    cli: true,
    needsPoe: false,
    routing: true,
    wifiRange: 0,
  },
  {
    kind: 'firewall',
    model: 'FW-600',
    namePrefix: 'FW',
    category: 'security',
    title: l('Zapora nowej generacji FW-600', 'Next-generation firewall FW-600'),
    desc: l(
      'Zapora stanowa (NGFW) dzieląca sieć na strefy, np. wewnętrzną, DMZ i internet. Przepuszcza ruch według reguł i pamięta sesje, więc odpowiedzi na dozwolony ruch wracają automatycznie.',
      'A stateful next-generation firewall that splits the network into zones such as inside, DMZ and internet. It allows traffic by policy and tracks sessions, so replies to allowed traffic return automatically.',
    ),
    specs: [
      l('8 portów 1 Gb/s', '8 × 1 Gb/s ports'),
      l('Strefy, reguły stanowe, NAT', 'Zones, stateful policies, NAT'),
      l('Konfiguracja przez panel graficzny', 'Configured through a graphical panel'),
    ],
    ports: [{ long: 'ethernet', short: 'eth', ids: range('1/', 1, 8), media: 'copper', speed: 1000 }],
    cli: false,
    needsPoe: false,
    routing: true,
    wifiRange: 0,
  },
  {
    kind: 'ap',
    model: 'AP-770',
    namePrefix: 'AP',
    category: 'wireless',
    title: l('Punkt dostępowy Wi-Fi 7 AP-770', 'Wi-Fi 7 access point AP-770'),
    desc: l(
      'Firmowy punkt dostępowy montowany na suficie. Łączy urządzenia bezprzewodowe z siecią przewodową i jest zasilany przez kabel sieciowy (PoE).',
      'A ceiling-mounted business access point. It bridges wireless devices into the wired network and is powered over the network cable (PoE).',
    ),
    specs: [
      l('Wi-Fi 7 (802.11be), trzy pasma: 2,4, 5 i 6 GHz', 'Wi-Fi 7 (802.11be), three bands: 2.4, 5 and 6 GHz'),
      l('Port 2,5 Gb/s zasilany PoE (802.3bt)', '2.5 Gb/s port powered by PoE (802.3bt)'),
      l('WPA3, mapowanie SSID na VLAN', 'WPA3, SSID to VLAN mapping'),
    ],
    ports: [{ long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 2500 }],
    cli: false,
    needsPoe: true,
    routing: false,
    wifiRange: 300,
  },
  {
    kind: 'internet',
    model: 'ISP',
    namePrefix: 'ISP',
    category: 'wan',
    title: l('Internet (dostawca)', 'Internet (provider)'),
    desc: l(
      'Uproszczony internet: sieć dostawcy, publiczny serwer DNS i przykładowa strona www.przyklad.pl. Każdy port przydziela klientowi publiczny adres przez DHCP.',
      'A simplified internet: the provider network, a public DNS server and a sample website www.przyklad.pl. Every port gives the customer a public address via DHCP.',
    ),
    specs: [
      l('4 porty miedziane i 2 światłowodowe dla klientów', '4 copper and 2 fiber customer ports'),
      l('DNS 198.51.100.53, strona 198.51.100.80', 'DNS 198.51.100.53, website 198.51.100.80'),
    ],
    ports: [
      { long: 'port', short: 'port', ids: range('', 0, 3), media: 'copper', speed: 10000 },
      { long: 'port', short: 'port', ids: range('', 4, 5), media: 'fiber', speed: 10000 },
    ],
    cli: false,
    needsPoe: false,
    routing: true,
    wifiRange: 0,
  },
  {
    kind: 'pc',
    model: 'PC',
    namePrefix: 'PC',
    category: 'end',
    title: l('Komputer stacjonarny', 'Desktop computer'),
    desc: l('Komputer z kartą sieciową 2,5 Gb/s. Ma wiersz poleceń, ustawienia IP i przeglądarkę.', 'A computer with a 2.5 Gb/s network card. It has a command prompt, IP settings and a web browser.'),
    specs: [l('Karta sieciowa 2,5 Gb/s (RJ45)', '2.5 Gb/s network card (RJ45)')],
    ports: [{ long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 2500 }],
    cli: false,
    needsPoe: false,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'laptop',
    model: 'Laptop',
    namePrefix: 'LAPTOP',
    category: 'end',
    title: l('Laptop', 'Laptop'),
    desc: l('Laptop z Wi-Fi 7 i portem Ethernet przez przejściówkę USB-C.', 'A laptop with Wi-Fi 7 and Ethernet through a USB-C adapter.'),
    specs: [l('Wi-Fi 7 i Ethernet 1 Gb/s', 'Wi-Fi 7 and 1 Gb/s Ethernet')],
    ports: [
      { long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 1000 },
      { long: 'wlan', short: 'wlan', ids: ['0'], media: 'wireless', speed: 2400 },
    ],
    cli: false,
    needsPoe: false,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'phone',
    model: 'Smartphone',
    namePrefix: 'TEL',
    category: 'end',
    title: l('Smartfon', 'Smartphone'),
    desc: l('Telefon łączący się z siecią tylko przez Wi-Fi.', 'A phone that connects to the network only over Wi-Fi.'),
    specs: [l('Wi-Fi 7', 'Wi-Fi 7')],
    ports: [{ long: 'wlan', short: 'wlan', ids: ['0'], media: 'wireless', speed: 2400 }],
    cli: false,
    needsPoe: false,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'server',
    model: 'SRV-2U',
    namePrefix: 'SRV',
    category: 'end',
    title: l('Serwer', 'Server'),
    desc: l('Serwer z usługami DHCP, DNS i WWW do włączenia w panelu usług.', 'A server with DHCP, DNS and web services you can enable in the services panel.'),
    specs: [l('Karta 10 Gb/s (RJ45) i 25 Gb/s SFP28', '10 Gb/s (RJ45) and 25 Gb/s SFP28 cards')],
    ports: [
      { long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 10000 },
      { long: 'sfp', short: 'sfp', ids: ['0'], media: 'fiber', speed: 25000 },
    ],
    cli: false,
    needsPoe: false,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'printer',
    model: 'Printer',
    namePrefix: 'PRN',
    category: 'end',
    title: l('Drukarka sieciowa', 'Network printer'),
    desc: l('Drukarka biurowa podłączona kablem.', 'An office printer connected by cable.'),
    specs: [l('Ethernet 1 Gb/s', '1 Gb/s Ethernet')],
    ports: [{ long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 1000 }],
    cli: false,
    needsPoe: false,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'camera',
    model: 'Camera',
    namePrefix: 'CAM',
    category: 'end',
    title: l('Kamera IP', 'IP camera'),
    desc: l('Kamera monitoringu zasilana przez PoE. Bez portu PoE nie włączy się.', 'A surveillance camera powered by PoE. Without a PoE port it will not turn on.'),
    specs: [l('Ethernet 1 Gb/s, zasilanie PoE (802.3af)', '1 Gb/s Ethernet, PoE powered (802.3af)')],
    ports: [{ long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 1000 }],
    cli: false,
    needsPoe: true,
    routing: false,
    wifiRange: 0,
  },
  {
    kind: 'voip',
    model: 'IP phone',
    namePrefix: 'VOIP',
    category: 'end',
    title: l('Telefon IP', 'IP phone'),
    desc: l('Biurkowy telefon VoIP zasilany przez PoE.', 'A desk VoIP phone powered by PoE.'),
    specs: [l('Ethernet 1 Gb/s, zasilanie PoE', '1 Gb/s Ethernet, PoE powered')],
    ports: [{ long: 'eth', short: 'eth', ids: ['0'], media: 'copper', speed: 1000 }],
    cli: false,
    needsPoe: true,
    routing: false,
    wifiRange: 0,
  },
];

export const CATEGORY_ORDER: DeviceCategory[] = ['routers', 'switches', 'wireless', 'security', 'end', 'wan'];

export function modelOf(kind: DeviceKind): ModelSpec {
  return MODELS.find((m) => m.kind === kind)!;
}

export function portGroupName(group: PortGroup, id: string): { name: string; short: string } {
  return { name: `${group.long}${id}`, short: `${group.short}${id}` };
}
