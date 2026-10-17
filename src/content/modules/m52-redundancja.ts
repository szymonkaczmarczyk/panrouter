import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m52: Module = {
  id: 'redundancja',
  level: 5,
  icon: 'layers',
  minutes: 20,
  title: l('Redundancja i projektowanie sieci', 'Redundancy and network design'),
  summary: l(
    'STP i RSTP, agregacja łączy LACP, zapasowa brama VRRP, projekt hierarchiczny kampusu, spine-leaf w centrum danych i QoS.',
    'STP and RSTP, LACP link aggregation, VRRP gateway redundancy, hierarchical campus design, data center spine-leaf and QoS.',
  ),
  labs: ['stp'],
  games: ['tablica-mac'],
  sections: [
    {
      id: 'stp',
      title: l('STP: zapasowe łącza bez pętli', 'STP: backup links without loops'),
      body: {
        pl: [
          { t: 'p', text: 'Zapasowe połączenia między przełącznikami chronią przed awarią, ale tworzą pętle. **Spanning Tree** (dziś RSTP 802.1w lub MSTP) wybiera **most główny** (root bridge), wylicza najkrótsze drogi do niego i blokuje porty, które zamykałyby pętlę.' },
          { t: 'figure', id: 'stp-loop', caption: 'Trzy przełączniki w trójkącie. Jeden port jest zablokowany i czeka w rezerwie.' },
          {
            t: 'list',
            items: [
              'Most główny wygrywa najniższym identyfikatorem: priorytet (domyślnie 32768), potem MAC.',
              'Ustaw most główny świadomie, na przełączniku rdzeniowym: `spanning-tree vlan 1 root primary`.',
              'Role portów: **root** (najlepsza droga do mostu głównego), **designated** (przekazuje na segmencie), **alternate** (zablokowany zapas).',
              '**PortFast** i **BPDU Guard** na portach do komputerów: port startuje od razu, a podłączenie obcego przełącznika go wyłącza.',
            ],
          },
          { t: 'code', lines: ['SW1# show spanning-tree', '  Root ID    Priority    24576', '             This bridge is the root', 'Interface           Role Sts Cost', 'Gi1/0/23            Desg FWD 4', 'Gi1/0/24            Desg FWD 4'], caption: 'W PanRouter port alternatywny ma bursztynową diodę.' },
        ],
        en: [
          { t: 'p', text: 'Backup links between switches protect against failures but create loops. **Spanning Tree** (today RSTP 802.1w or MSTP) elects a **root bridge**, computes the shortest paths to it and blocks ports that would close a loop.' },
          { t: 'figure', id: 'stp-loop', caption: 'Three switches in a triangle. One port is blocked and waits in reserve.' },
          {
            t: 'list',
            items: [
              'The root bridge wins with the lowest ID: priority (default 32768), then MAC.',
              'Pick the root deliberately, on a core switch: `spanning-tree vlan 1 root primary`.',
              'Port roles: **root** (best path to the root), **designated** (forwards on a segment), **alternate** (blocked backup).',
              '**PortFast** and **BPDU Guard** on PC ports: the port comes up instantly and plugging in a rogue switch shuts it down.',
            ],
          },
          { t: 'code', lines: ['SW1# show spanning-tree', '  Root ID    Priority    24576', '             This bridge is the root', 'Interface           Role Sts Cost', 'Gi1/0/23            Desg FWD 4', 'Gi1/0/24            Desg FWD 4'], caption: 'In PanRouter an alternate port has an amber LED.' },
        ],
      },
    },
    {
      id: 'lacp-vrrp',
      title: l('LACP i VRRP', 'LACP and VRRP'),
      body: {
        pl: [
          { t: 'p', text: '**Agregacja łączy** (LACP, 802.3ad) łączy kilka kabli w jeden logiczny kanał. Przepustowość się sumuje, a awaria jednego kabla nie przerywa ruchu. STP widzi kanał jako jedno łącze, więc nic nie blokuje.' },
          { t: 'p', text: 'Brama domyślna to pojedynczy punkt awarii. **VRRP** (otwarty standard, podobnie HSRP) sprawia, że dwa routery lub przełączniki L3 udostępniają jeden wirtualny adres bramy. Gdy aktywny padnie, zapasowy przejmuje adres w około sekundę i komputery niczego nie zauważają.' },
          { t: 'callout', kind: 'tip', text: 'W nowoczesnych kampusach łączy się parę przełączników w jeden logiczny (stacking albo MLAG). Wtedy LACP może iść do dwóch fizycznych urządzeń i STP prawie nie ma czego blokować.' },
        ],
        en: [
          { t: 'p', text: '**Link aggregation** (LACP, 802.3ad) bundles several cables into one logical channel. Bandwidth adds up and losing one cable does not stop traffic. STP sees the channel as one link, so it blocks nothing.' },
          { t: 'p', text: 'The default gateway is a single point of failure. **VRRP** (an open standard, similar to HSRP) lets two routers or L3 switches share one virtual gateway address. When the active one fails, the backup takes over the address in about a second and computers notice nothing.' },
          { t: 'callout', kind: 'tip', text: 'Modern campuses join a pair of switches into one logical switch (stacking or MLAG). Then LACP can span two physical devices and STP has almost nothing to block.' },
        ],
      },
    },
    {
      id: 'projekt',
      title: l('Projekt kampusu i centrum danych', 'Campus and data center design'),
      body: {
        pl: [
          { t: 'figure', id: 'campus-hierarchy', caption: 'Warstwa dostępu podłącza użytkowników, dystrybucja agreguje i routuje, rdzeń szybko łączy całość.' },
          {
            t: 'list',
            items: [
              '**Dostęp**: przełączniki PoE z portami multigigabit, VLAN-y, 802.1X, PortFast.',
              '**Dystrybucja**: przełączniki L3, bramy VLAN-ów, VRRP, polityki.',
              '**Rdzeń**: maksymalna prędkość i odporność, bez filtrowania. W mniejszych firmach rdzeń i dystrybucja to jedna warstwa (collapsed core).',
            ],
          },
          { t: 'figure', id: 'spine-leaf', caption: 'W centrach danych dominuje spine-leaf: każdy leaf łączy się z każdym spine, a ruch dzieli się po równych ścieżkach (ECMP).' },
          { t: 'h', text: 'QoS: priorytet dla czasu rzeczywistego' },
          { t: 'p', text: 'Gdy łącze się zapycha, **QoS** decyduje, co przejdzie pierwsze. Głos oznacza się znacznikiem DSCP 46 (EF) i trafia do kolejki priorytetowej, wideokonferencje wyżej niż kopie zapasowe.' },
        ],
        en: [
          { t: 'figure', id: 'campus-hierarchy', caption: 'The access layer connects users, distribution aggregates and routes, and the core links everything fast.' },
          {
            t: 'list',
            items: [
              '**Access**: PoE switches with multigigabit ports, VLANs, 802.1X, PortFast.',
              '**Distribution**: L3 switches, VLAN gateways, VRRP, policies.',
              '**Core**: maximum speed and resilience, no filtering. Smaller companies merge core and distribution (collapsed core).',
            ],
          },
          { t: 'figure', id: 'spine-leaf', caption: 'Data centers are dominated by spine-leaf: every leaf connects to every spine and traffic spreads over equal paths (ECMP).' },
          { t: 'h', text: 'QoS: priority for real-time traffic' },
          { t: 'p', text: 'When a link fills up, **QoS** decides what goes first. Voice is marked DSCP 46 (EF) and placed in a priority queue, video calls rank above backups.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q52-1', kind: 'single', q: l('Co decyduje o wyborze mostu głównego STP?', 'What decides the STP root bridge?'), options: [l('Najniższy priorytet, potem najniższy MAC', 'Lowest priority, then lowest MAC'), l('Najwięcej portów', 'Most ports'), l('Najszybszy procesor', 'Fastest CPU'), l('Najwyższy adres IP', 'Highest IP')], answer: 0, explain: l('Identyfikator mostu to priorytet i MAC. Wygrywa najniższy.', 'The bridge ID is priority plus MAC. The lowest wins.') },
    { id: 'q52-2', kind: 'single', q: l('Jaką rolę ma zablokowany zapasowy port w RSTP?', 'What role does a blocked backup port have in RSTP?'), options: [l('Root', 'Root'), l('Designated', 'Designated'), l('Alternate', 'Alternate'), l('Edge', 'Edge')], answer: 2, explain: l('Port alternatywny czeka zablokowany i przejmuje ruch po awarii.', 'An alternate port waits blocked and takes over after a failure.') },
    { id: 'q52-3', kind: 'single', q: l('Po co BPDU Guard na porcie do komputera?', 'Why BPDU Guard on a PC port?'), options: [l('Wyłącza port, gdy ktoś podłączy przełącznik', 'It shuts the port when someone plugs in a switch'), l('Przyspiesza Wi-Fi', 'It speeds up Wi-Fi'), l('Szyfruje ruch', 'It encrypts traffic'), l('Daje PoE', 'It provides PoE')], answer: 0, explain: l('Chroni topologię STP przed obcymi przełącznikami.', 'It protects the STP topology from rogue switches.') },
    { id: 'q52-4', kind: 'single', q: l('Który protokół łączy kilka kabli w jeden kanał?', 'Which protocol bundles several cables into one channel?'), options: [l('LACP', 'LACP'), l('VRRP', 'VRRP'), l('OSPF', 'OSPF'), l('NTP', 'NTP')], answer: 0, explain: l('LACP (802.3ad) tworzy agregację łączy.', 'LACP (802.3ad) builds link aggregation.') },
    { id: 'q52-5', kind: 'single', q: l('Co zapewnia VRRP?', 'What does VRRP provide?'), options: [l('Zapasową bramę domyślną', 'A redundant default gateway'), l('Szyfrowanie VPN', 'VPN encryption'), l('Adresy DHCP', 'DHCP addresses'), l('Podział na VLAN-y', 'VLAN splitting')], answer: 0, explain: l('Dwa urządzenia dzielą jeden wirtualny adres bramy.', 'Two devices share one virtual gateway address.') },
    { id: 'q52-6', kind: 'order', q: l('Ułóż warstwy kampusu od użytkownika w górę.', 'Order the campus layers from the user upward.'), items: [l('Dostęp', 'Access'), l('Dystrybucja', 'Distribution'), l('Rdzeń', 'Core')], explain: l('Użytkownik podłącza się do dostępu, ten do dystrybucji, a ta do rdzenia.', 'Users plug into access, access into distribution, distribution into core.') },
    { id: 'q52-7', kind: 'single', q: l('Jaka architektura dominuje w centrach danych?', 'Which architecture dominates data centers?'), options: [l('Spine-leaf', 'Spine-leaf'), l('Pierścień tokenowy', 'Token ring'), l('Magistrala', 'Bus'), l('Gwiazda z koncentratorem', 'Star with a hub')], answer: 0, explain: l('Spine-leaf daje przewidywalne opóźnienie i równoległe ścieżki.', 'Spine-leaf gives predictable latency and parallel paths.') },
    { id: 'q52-8', kind: 'input', q: l('Jaką wartość DSCP ma ruch głosowy EF?', 'Which DSCP value does EF voice traffic use?'), answer: ['46'], explain: l('EF (Expedited Forwarding) to DSCP 46.', 'EF (Expedited Forwarding) is DSCP 46.') },
  ],
};
