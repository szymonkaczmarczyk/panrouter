import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m32: Module = {
  id: 'podsieci',
  level: 3,
  icon: 'split',
  minutes: 20,
  title: l('Podsieci i VLSM', 'Subnetting and VLSM'),
  summary: l(
    'Dzielenie sieci na mniejsze: pożyczanie bitów, metoda magicznej liczby, plan adresacji o różnych rozmiarach i łącza /31.',
    'Splitting networks into smaller ones: borrowing bits, the magic number method, variable-size address plans and /31 links.',
  ),
  labs: ['podsieci'],
  games: ['podsieciowiec'],
  sections: [
    {
      id: 'po-co',
      title: l('Po co dzielić sieć', 'Why split a network'),
      body: {
        pl: [
          { t: 'p', text: 'Jedna wielka sieć /16 dla całej firmy to kłopot: ogromna domena rozgłoszeniowa, brak granic bezpieczeństwa i trudne filtrowanie. Dzielimy więc przestrzeń adresową na **podsieci**: osobną dla biura, gości, telefonów, kamer i serwerów.' },
          { t: 'p', text: 'Dzielenie polega na **pożyczaniu bitów** z części hosta. Każdy pożyczony bit podwaja liczbę podsieci i zmniejsza o połowę ich rozmiar.' },
          { t: 'figure', id: 'subnet-bar', caption: 'Pożyczenie 2 bitów z /24 daje cztery podsieci /26 po 62 hosty.' },
          {
            t: 'table',
            head: ['Z /24 robisz', 'Pożyczone bity', 'Podsieci', 'Hostów w każdej'],
            rows: [['/25', '1', '2', '126'], ['/26', '2', '4', '62'], ['/27', '3', '8', '30'], ['/28', '4', '16', '14'], ['/29', '5', '32', '6'], ['/30', '6', '64', '2']],
          },
        ],
        en: [
          { t: 'p', text: 'One huge /16 for a whole company is trouble: a giant broadcast domain, no security boundaries and hard filtering. So we split the address space into **subnets**: one for the office, guests, phones, cameras and servers.' },
          { t: 'p', text: 'Splitting works by **borrowing bits** from the host part. Each borrowed bit doubles the number of subnets and halves their size.' },
          { t: 'figure', id: 'subnet-bar', caption: 'Borrowing 2 bits from a /24 gives four /26 subnets of 62 hosts each.' },
          {
            t: 'table',
            head: ['From /24 you make', 'Borrowed bits', 'Subnets', 'Hosts each'],
            rows: [['/25', '1', '2', '126'], ['/26', '2', '4', '62'], ['/27', '3', '8', '30'], ['/28', '4', '16', '14'], ['/29', '5', '32', '6'], ['/30', '6', '64', '2']],
          },
        ],
      },
    },
    {
      id: 'magiczna',
      title: l('Metoda magicznej liczby', 'The magic number method'),
      body: {
        pl: [
          { t: 'p', text: 'Najszybszy sposób liczenia w pamięci. **Magiczna liczba** to 256 minus wartość maski w „ciekawym” oktecie (tym, który nie jest 255 ani 0). Podsieci zaczynają się co tyle adresów.' },
          {
            t: 'list',
            ordered: true,
            items: [
              'Zadanie: `172.16.45.200/20`. Maska /20 to `255.255.240.0`, ciekawy jest trzeci oktet: 240.',
              'Magiczna liczba: 256 - 240 = **16**. Sieci w trzecim oktecie: 0, 16, 32, 48...',
              '45 leży między 32 a 48, więc sieć to `172.16.32.0`.',
              'Następna sieć to `172.16.48.0`, więc rozgłoszenie to `172.16.47.255`.',
              'Hosty: `172.16.32.1` - `172.16.47.254`, czyli 2^12 - 2 = 4094.',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Ćwicz w minigrze Podsieciowiec. Po kilkudziesięciu przykładach liczysz w kilka sekund.' },
        ],
        en: [
          { t: 'p', text: 'The fastest way to compute in your head. The **magic number** is 256 minus the mask value in the "interesting" octet (the one that is neither 255 nor 0). Subnets start every that many addresses.' },
          {
            t: 'list',
            ordered: true,
            items: [
              'Task: `172.16.45.200/20`. A /20 mask is `255.255.240.0`, the interesting octet is the third: 240.',
              'Magic number: 256 - 240 = **16**. Networks in the third octet: 0, 16, 32, 48...',
              '45 is between 32 and 48, so the network is `172.16.32.0`.',
              'The next network is `172.16.48.0`, so broadcast is `172.16.47.255`.',
              'Hosts: `172.16.32.1` - `172.16.47.254`, which is 2^12 - 2 = 4094.',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Practice in the Subnet sprint game. After a few dozen examples you will compute in seconds.' },
        ],
      },
    },
    {
      id: 'vlsm',
      title: l('VLSM: podsieci różnej wielkości', 'VLSM: subnets of different sizes'),
      body: {
        pl: [
          { t: 'p', text: '**VLSM** pozwala dobrać rozmiar każdej podsieci do potrzeb. Zasada: zaczynasz od **największej** potrzeby i przydzielasz bloki po kolei, bez nakładania się.' },
          {
            t: 'table',
            head: ['Potrzeba', 'Rozmiar', 'Przydział z 10.10.0.0/24', 'Brama'],
            rows: [
              ['biuro: 100 hostów', '/25 (126)', '`10.10.0.0/25`', '`10.10.0.1`'],
              ['goście: 50', '/26 (62)', '`10.10.0.128/26`', '`10.10.0.129`'],
              ['kamery: 20', '/27 (30)', '`10.10.0.192/27`', '`10.10.0.193`'],
              ['serwery: 10', '/28 (14)', '`10.10.0.224/28`', '`10.10.0.225`'],
              ['łącze do routera', '/30 (2)', '`10.10.0.240/30`', '-'],
            ],
          },
          { t: 'callout', kind: 'info', title: 'Łącza /31', text: 'Na łączach punkt-punkt między routerami można użyć /31 (RFC 3021): dwa adresy, oba użyteczne. Oszczędza to połowę adresów względem /30.' },
          { t: 'callout', kind: 'warn', text: 'Najczęstszy błąd w planie: nakładające się podsieci, np. 10.10.0.0/25 i 10.10.0.64/26. Router odmówi takiej konfiguracji na dwóch interfejsach, a w trasach powstanie chaos.' },
        ],
        en: [
          { t: 'p', text: '**VLSM** lets you size each subnet to its needs. Rule: start with the **largest** need and allocate blocks in order, without overlap.' },
          {
            t: 'table',
            head: ['Need', 'Size', 'From 10.10.0.0/24', 'Gateway'],
            rows: [
              ['office: 100 hosts', '/25 (126)', '`10.10.0.0/25`', '`10.10.0.1`'],
              ['guests: 50', '/26 (62)', '`10.10.0.128/26`', '`10.10.0.129`'],
              ['cameras: 20', '/27 (30)', '`10.10.0.192/27`', '`10.10.0.193`'],
              ['servers: 10', '/28 (14)', '`10.10.0.224/28`', '`10.10.0.225`'],
              ['router link', '/30 (2)', '`10.10.0.240/30`', '-'],
            ],
          },
          { t: 'callout', kind: 'info', title: '/31 links', text: 'On point-to-point links between routers you can use /31 (RFC 3021): two addresses, both usable. It saves half the addresses compared to /30.' },
          { t: 'callout', kind: 'warn', text: 'The most common plan mistake: overlapping subnets such as 10.10.0.0/25 and 10.10.0.64/26. A router refuses that on two interfaces and routing turns into chaos.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q32-1', kind: 'input', q: l('Jaki jest adres sieci dla 172.16.45.200/20?', 'What is the network address of 172.16.45.200/20?'), answer: ['172.16.32.0'], explain: l('Magiczna liczba 16 w trzecim oktecie: 45 wpada w blok 32-47.', 'Magic number 16 in the third octet: 45 falls in block 32-47.') },
    { id: 'q32-2', kind: 'input', q: l('Ile podsieci /27 zmieści się w /24?', 'How many /27 subnets fit in a /24?'), answer: ['8'], explain: l('Pożyczasz 3 bity: 2^3 = 8.', 'You borrow 3 bits: 2^3 = 8.') },
    { id: 'q32-3', kind: 'single', q: l('Potrzebujesz 50 hostów. Jaki najmniejszy prefiks wystarczy?', 'You need 50 hosts. What is the smallest prefix that fits?'), options: [l('/27', '/27'), l('/26', '/26'), l('/25', '/25'), l('/28', '/28')], answer: 1, explain: l('/27 daje 30 hostów, za mało. /26 daje 62.', '/27 gives 30 hosts, too few. /26 gives 62.') },
    { id: 'q32-4', kind: 'input', q: l('Jaki jest adres rozgłoszeniowy 192.168.5.130/27?', 'What is the broadcast address of 192.168.5.130/27?'), answer: ['192.168.5.159'], explain: l('Bloki co 32: 128-159. Rozgłoszenie to .159.', 'Blocks of 32: 128-159. Broadcast is .159.') },
    { id: 'q32-5', kind: 'single', q: l('Od której podsieci zaczynasz plan VLSM?', 'Which subnet do you start a VLSM plan with?'), options: [l('Od najmniejszej', 'The smallest'), l('Od największej', 'The largest'), l('Od łączy między routerami', 'Router links'), l('Kolejność nie ma znaczenia', 'Order does not matter')], answer: 1, explain: l('Duże bloki muszą zaczynać się na swoich granicach. Zaczynając od największych, unikasz dziur i nakładania.', 'Large blocks must start on their boundaries. Starting with the largest avoids gaps and overlaps.') },
    { id: 'q32-6', kind: 'single', q: l('Czy 10.10.0.0/25 i 10.10.0.64/26 nakładają się?', 'Do 10.10.0.0/25 and 10.10.0.64/26 overlap?'), options: [l('Tak', 'Yes'), l('Nie', 'No')], answer: 0, explain: l('/25 obejmuje .0-.127, więc zawiera blok .64-.127.', 'The /25 covers .0-.127, which contains .64-.127.') },
    { id: 'q32-7', kind: 'input', q: l('Jaka maska odpowiada /28? Podaj w zapisie kropkowym.', 'Which dotted mask matches /28?'), answer: ['255.255.255.240'], explain: l('28 jedynek: trzy oktety po 255 i 11110000 = 240.', '28 ones: three 255 octets and 11110000 = 240.') },
    { id: 'q32-8', kind: 'single', q: l('Ile użytecznych adresów daje /31 na łączu punkt-punkt?', 'How many usable addresses does a /31 give on a point-to-point link?'), options: [l('0', '0'), l('1', '1'), l('2', '2'), l('4', '4')], answer: 2, explain: l('RFC 3021 pozwala użyć obu adresów /31 na łączu punkt-punkt.', 'RFC 3021 allows both /31 addresses on a point-to-point link.') },
  ],
};
