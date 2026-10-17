import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m23: Module = {
  id: 'ipv4',
  level: 2,
  icon: 'globe',
  minutes: 18,
  title: l('Adresowanie IPv4', 'IPv4 addressing'),
  summary: l(
    'Część sieciowa i hosta, maski i zapis CIDR, adres sieci i rozgłoszeniowy, liczba hostów, adresy prywatne, CGNAT i adresy specjalne.',
    'Network and host part, masks and CIDR, network and broadcast addresses, host counts, private addresses, CGNAT and special addresses.',
  ),
  labs: ['dwie-sieci'],
  games: ['podsieciowiec'],
  sections: [
    {
      id: 'maska',
      title: l('Maska dzieli adres na dwie części', 'The mask splits the address in two'),
      body: {
        pl: [
          { t: 'p', text: 'Adres IPv4 ma 32 bity. **Maska** mówi, ile pierwszych bitów to numer sieci. Reszta to numer hosta w tej sieci. Zapis **CIDR** podaje po prostu liczbę jedynek w masce: `/24` to `255.255.255.0`.' },
          {
            t: 'code',
            lines: ['Adres:   192.168.10.37   11000000.10101000.00001010.00100101', 'Maska:   255.255.255.0   11111111.11111111.11111111.00000000', 'Sieć:    192.168.10.0    część sieciowa = 24 bity', 'Host:    .37             część hosta = 8 bitów'],
            caption: 'Bitowe AND adresu i maski daje adres sieci.',
          },
          { t: 'p', text: 'Dwa urządzenia są w tej samej sieci, jeśli po nałożeniu maski wychodzi ten sam adres sieci. Wtedy rozmawiają bezpośrednio, bez routera.' },
        ],
        en: [
          { t: 'p', text: 'An IPv4 address has 32 bits. The **mask** says how many leading bits are the network number. The rest is the host number in that network. **CIDR** notation simply gives the number of ones in the mask: `/24` is `255.255.255.0`.' },
          {
            t: 'code',
            lines: ['Address: 192.168.10.37   11000000.10101000.00001010.00100101', 'Mask:    255.255.255.0   11111111.11111111.11111111.00000000', 'Network: 192.168.10.0    network part = 24 bits', 'Host:    .37             host part = 8 bits'],
            caption: 'A bitwise AND of the address and mask gives the network address.',
          },
          { t: 'p', text: 'Two devices are on the same network if applying the mask gives the same network address. Then they talk directly, without a router.' },
        ],
      },
    },
    {
      id: 'zakres',
      title: l('Adres sieci, rozgłoszeniowy i hosty', 'Network, broadcast and host addresses'),
      body: {
        pl: [
          { t: 'p', text: 'W każdej podsieci dwa adresy są zarezerwowane. **Adres sieci** ma same zera w części hosta. **Adres rozgłoszeniowy** ma same jedynki. Pomiędzy nimi są adresy dla urządzeń.' },
          {
            t: 'table',
            head: ['Prefiks', 'Maska', 'Adresów', 'Hostów', 'Typowe użycie'],
            rows: [
              ['/24', '255.255.255.0', '256', '254', 'sieć biurowa, domowa'],
              ['/25', '255.255.255.128', '128', '126', 'pół sieci /24'],
              ['/26', '255.255.255.192', '64', '62', 'mały dział, VLAN'],
              ['/28', '255.255.255.240', '16', '14', 'serwery, DMZ'],
              ['/30', '255.255.255.252', '4', '2', 'łącze między routerami'],
              ['/31', '255.255.255.254', '2', '2', 'łącze punkt-punkt (RFC 3021)'],
            ],
          },
          { t: 'callout', kind: 'tip', title: 'Wzór', text: 'Liczba hostów = 2^(32 - prefiks) - 2. Dla /26: 2^6 - 2 = 62.' },
          { t: 'p', text: 'Przykład: `10.0.5.70/26`. Bloki /26 zaczynają się co 64: .0, .64, .128, .192. Adres 70 leży w bloku 64-127, więc sieć to `10.0.5.64`, rozgłoszenie `10.0.5.127`, a hosty od `.65` do `.126`.' },
        ],
        en: [
          { t: 'p', text: 'Two addresses in every subnet are reserved. The **network address** has all zeros in the host part. The **broadcast address** has all ones. Device addresses lie in between.' },
          {
            t: 'table',
            head: ['Prefix', 'Mask', 'Addresses', 'Hosts', 'Typical use'],
            rows: [
              ['/24', '255.255.255.0', '256', '254', 'office or home network'],
              ['/25', '255.255.255.128', '128', '126', 'half of a /24'],
              ['/26', '255.255.255.192', '64', '62', 'small department, VLAN'],
              ['/28', '255.255.255.240', '16', '14', 'servers, DMZ'],
              ['/30', '255.255.255.252', '4', '2', 'link between routers'],
              ['/31', '255.255.255.254', '2', '2', 'point-to-point link (RFC 3021)'],
            ],
          },
          { t: 'callout', kind: 'tip', title: 'Formula', text: 'Host count = 2^(32 - prefix) - 2. For /26: 2^6 - 2 = 62.' },
          { t: 'p', text: 'Example: `10.0.5.70/26`. /26 blocks start every 64: .0, .64, .128, .192. Address 70 is in block 64-127, so the network is `10.0.5.64`, broadcast `10.0.5.127` and hosts `.65` to `.126`.' },
        ],
      },
    },
    {
      id: 'prywatne',
      title: l('Adresy prywatne, publiczne i CGNAT', 'Private, public and CGNAT addresses'),
      body: {
        pl: [
          { t: 'p', text: 'Adresów IPv4 jest około 4,3 miliarda i dawno się skończyły. Dlatego wewnątrz sieci używa się **adresów prywatnych** (RFC 1918), które mogą się powtarzać w milionach domów i firm.' },
          {
            t: 'table',
            head: ['Zakres', 'CIDR', 'Gdzie spotkasz'],
            rows: [
              ['10.0.0.0 - 10.255.255.255', '10.0.0.0/8', 'duże firmy, chmura'],
              ['172.16.0.0 - 172.31.255.255', '172.16.0.0/12', 'firmy, kontenery'],
              ['192.168.0.0 - 192.168.255.255', '192.168.0.0/16', 'domy, małe biura'],
              ['100.64.0.0 - 100.127.255.255', '100.64.0.0/10', '**CGNAT** u operatorów'],
            ],
          },
          { t: 'p', text: 'Wielu operatorów, zwłaszcza komórkowych, nie daje klientom publicznego adresu. Twój router dostaje adres z puli **CGNAT** 100.64.0.0/10, a operator robi jeszcze jeden NAT u siebie. Strony działają, ale trudno wystawić własny serwer z domu.' },
        ],
        en: [
          { t: 'p', text: 'There are about 4.3 billion IPv4 addresses and they ran out long ago. That is why networks use **private addresses** (RFC 1918) internally, which can repeat in millions of homes and companies.' },
          {
            t: 'table',
            head: ['Range', 'CIDR', 'Where you see it'],
            rows: [
              ['10.0.0.0 - 10.255.255.255', '10.0.0.0/8', 'large companies, cloud'],
              ['172.16.0.0 - 172.31.255.255', '172.16.0.0/12', 'companies, containers'],
              ['192.168.0.0 - 192.168.255.255', '192.168.0.0/16', 'homes, small offices'],
              ['100.64.0.0 - 100.127.255.255', '100.64.0.0/10', '**CGNAT** at operators'],
            ],
          },
          { t: 'p', text: 'Many operators, especially mobile ones, do not give customers a public address. Your router gets an address from the **CGNAT** pool 100.64.0.0/10 and the operator does another NAT on its side. Websites work, but hosting your own server from home is hard.' },
        ],
      },
    },
    {
      id: 'specjalne',
      title: l('Adresy specjalne', 'Special addresses'),
      body: {
        pl: [
          {
            t: 'terms',
            items: [
              ['127.0.0.1', 'pętla zwrotna (localhost): komputer rozmawia sam ze sobą'],
              ['169.254.0.0/16', 'APIPA: adres awaryjny, gdy nie ma DHCP'],
              ['0.0.0.0', '„ten host” przed uzyskaniem adresu, a w trasach: dowolna sieć (trasa domyślna)'],
              ['255.255.255.255', 'rozgłoszenie w lokalnej sieci, np. DHCP Discover'],
              ['224.0.0.0/4', 'multicast: jeden nadawca, wielu chętnych odbiorców (np. OSPF, IPTV)'],
              ['192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24', 'zakresy dokumentacyjne: bezpieczne do przykładów, nigdy nie trafiają do internetu'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'Dawne klasy A, B i C zastąpiono w latach 90. bezklasowym CIDR. Wystarczy wiedzieć, że istniały. Dziś liczy się tylko prefiks.' },
        ],
        en: [
          {
            t: 'terms',
            items: [
              ['127.0.0.1', 'loopback (localhost): the computer talks to itself'],
              ['169.254.0.0/16', 'APIPA: fallback address when there is no DHCP'],
              ['0.0.0.0', '"this host" before getting an address, and in routes: any network (the default route)'],
              ['255.255.255.255', 'local broadcast, e.g. DHCP Discover'],
              ['224.0.0.0/4', 'multicast: one sender, many interested receivers (e.g. OSPF, IPTV)'],
              ['192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24', 'documentation ranges: safe for examples, never routed on the internet'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'The old classes A, B and C were replaced by classless CIDR in the 1990s. It is enough to know they existed. Today only the prefix matters.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q23-1',
      kind: 'input',
      q: l('Jaki jest adres sieci dla 192.168.10.37/24?', 'What is the network address for 192.168.10.37/24?'),
      answer: ['192.168.10.0'],
      placeholder: 'A.B.C.D',
      explain: l('Przy /24 część hosta to ostatni oktet. Zerujesz go: 192.168.10.0.', 'With /24 the host part is the last octet. Zero it: 192.168.10.0.'),
    },
    {
      id: 'q23-2',
      kind: 'input',
      q: l('Ile hostów zmieści sieć /26?', 'How many hosts fit in a /26?'),
      answer: ['62'],
      explain: l('2^6 - 2 = 62. Odejmujesz adres sieci i rozgłoszeniowy.', '2^6 - 2 = 62. Subtract the network and broadcast addresses.'),
    },
    {
      id: 'q23-3',
      kind: 'input',
      q: l('Jaki jest adres rozgłoszeniowy sieci 10.0.5.64/26?', 'What is the broadcast address of 10.0.5.64/26?'),
      answer: ['10.0.5.127'],
      explain: l('Blok /26 ma 64 adresy: 64-127. Ostatni to rozgłoszenie.', 'A /26 block has 64 addresses: 64-127. The last one is broadcast.'),
    },
    {
      id: 'q23-4',
      kind: 'single',
      q: l('Który adres jest z zakresu CGNAT?', 'Which address is from the CGNAT range?'),
      options: [l('100.72.1.5', '100.72.1.5'), l('172.32.0.1', '172.32.0.1'), l('192.168.100.1', '192.168.100.1'), l('10.100.0.1', '10.100.0.1')],
      answer: 0,
      explain: l('CGNAT to 100.64.0.0/10, czyli 100.64.0.0 - 100.127.255.255.', 'CGNAT is 100.64.0.0/10, i.e. 100.64.0.0 - 100.127.255.255.'),
    },
    {
      id: 'q23-5',
      kind: 'single',
      q: l('Czy 172.32.0.10 to adres prywatny?', 'Is 172.32.0.10 a private address?'),
      options: [l('Tak, cały 172.x.x.x jest prywatny', 'Yes, all of 172.x.x.x is private'), l('Nie, prywatny zakres kończy się na 172.31.255.255', 'No, the private range ends at 172.31.255.255')],
      answer: 1,
      explain: l('Prywatny jest tylko 172.16.0.0/12, czyli 172.16-172.31.', 'Only 172.16.0.0/12 is private: 172.16 through 172.31.'),
    },
    {
      id: 'q23-6',
      kind: 'single',
      q: l('Jaki prefiks wybierzesz na łącze między dwoma routerami, oszczędzając adresy?', 'Which prefix would you use on a link between two routers to save addresses?'),
      options: [l('/24', '/24'), l('/28', '/28'), l('/30 albo /31', '/30 or /31'), l('/16', '/16')],
      answer: 2,
      explain: l('Łącze punkt-punkt potrzebuje dwóch adresów: /30 daje 2 hosty, a /31 dwa adresy bez rezerwy na sieć i rozgłoszenie.', 'A point-to-point link needs two addresses: /30 gives 2 hosts and /31 gives two with no network or broadcast reservation.'),
    },
    {
      id: 'q23-7',
      kind: 'single',
      q: l('Do czego służy 127.0.0.1?', 'What is 127.0.0.1 for?'),
      options: [l('To brama domyślna', 'It is the default gateway'), l('Pętla zwrotna: komputer rozmawia sam ze sobą', 'Loopback: the computer talks to itself'), l('Adres serwera DNS operatora', 'The operator’s DNS server'), l('Rozgłoszenie', 'Broadcast')],
      answer: 1,
      explain: l('127.0.0.0/8 to pętla zwrotna. Pakiety nie opuszczają komputera.', '127.0.0.0/8 is loopback. Packets never leave the computer.'),
    },
    {
      id: 'q23-8',
      kind: 'single',
      q: l('Czy hosty 192.168.1.20/25 i 192.168.1.200/25 są w tej samej sieci?', 'Are hosts 192.168.1.20/25 and 192.168.1.200/25 on the same network?'),
      options: [l('Tak', 'Yes'), l('Nie, /25 dzieli adresy na 0-127 i 128-255', 'No, /25 splits addresses into 0-127 and 128-255')],
      answer: 1,
      explain: l('Przy /25 sieci to 192.168.1.0 i 192.168.1.128. Hosty są w różnych sieciach i potrzebują routera.', 'With /25 the networks are 192.168.1.0 and 192.168.1.128. The hosts are in different networks and need a router.'),
    },
  ],
};
