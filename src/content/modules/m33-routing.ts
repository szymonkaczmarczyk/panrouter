import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m33: Module = {
  id: 'routing',
  level: 3,
  icon: 'route',
  minutes: 20,
  title: l('Routing statyczny', 'Static routing'),
  summary: l(
    'Tablica routingu, najdłuższe dopasowanie prefiksu, trasa domyślna, odległość administracyjna i konfiguracja tras w CLI.',
    'The routing table, longest prefix match, the default route, administrative distance and configuring routes in the CLI.',
  ),
  labs: ['dwie-sieci', 'routing-statyczny'],
  games: ['droga-pakietu'],
  sections: [
    {
      id: 'tablica',
      title: l('Jak router podejmuje decyzję', 'How a router decides'),
      body: {
        pl: [
          { t: 'p', text: 'Router odbiera pakiet, patrzy na adres docelowy i szuka go w **tablicy routingu**. Każdy wpis to sieć, sposób jej poznania i kierunek: następny skok albo interfejs wyjściowy. Na każdym routerze TTL spada o 1.' },
          {
            t: 'terms',
            items: [
              ['C (connected)', 'sieć podłączona bezpośrednio do aktywnego interfejsu z adresem IP'],
              ['L (local)', 'adres samego routera (/32)'],
              ['S (static)', 'trasa wpisana ręcznie przez administratora'],
              ['O (OSPF)', 'trasa nauczona od sąsiadów przez protokół routingu'],
              ['S* lub O*E2', 'trasa domyślna 0.0.0.0/0, czyli „wszystko inne”'],
            ],
          },
          { t: 'figure', id: 'routing-table', caption: 'Kilka tras pasuje do celu. Wygrywa ta z najdłuższym prefiksem, czyli najbardziej szczegółowa.' },
          { t: 'callout', kind: 'warn', text: 'Brak pasującej trasy oznacza odrzucenie pakietu i komunikat ICMP „sieć nieosiągalna”. Pamiętaj też o drodze powrotnej: odpowiedź potrzebuje trasy w przeciwnym kierunku.' },
        ],
        en: [
          { t: 'p', text: 'A router receives a packet, looks at the destination address and searches its **routing table**. Each entry is a network, how it was learned and a direction: a next hop or an exit interface. Every router decreases the TTL by 1.' },
          {
            t: 'terms',
            items: [
              ['C (connected)', 'a network directly attached to an active interface with an IP address'],
              ['L (local)', 'the router’s own address (/32)'],
              ['S (static)', 'a route typed in by the administrator'],
              ['O (OSPF)', 'a route learned from neighbors through a routing protocol'],
              ['S* or O*E2', 'the default route 0.0.0.0/0, "everything else"'],
            ],
          },
          { t: 'figure', id: 'routing-table', caption: 'Several routes match the destination. The longest prefix, the most specific one, wins.' },
          { t: 'callout', kind: 'warn', text: 'No matching route means the packet is dropped and an ICMP "network unreachable" is sent. Also remember the return path: the reply needs a route in the opposite direction.' },
        ],
      },
    },
    {
      id: 'konfiguracja',
      title: l('Trasy statyczne w CLI', 'Static routes in the CLI'),
      body: {
        pl: [
          { t: 'p', text: 'Trasę statyczną dodajesz w trybie konfiguracji globalnej: sieć, maska i następny skok. Następny skok musi być osiągalny przez sieć podłączoną bezpośrednio.' },
          {
            t: 'code',
            lines: [
              'R1(config)# ip route 192.168.2.0 255.255.255.0 10.0.12.2',
              'R1(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1',
              'R1(config)# end',
              'R1# show ip route',
              'S*    0.0.0.0/0 [1/0] via 203.0.113.1',
              'C        10.0.12.0/30 is directly connected, GigabitEthernet0/0/1',
              'S        192.168.2.0/24 [1/0] via 10.0.12.2',
            ],
            caption: 'Trasa do sieci oddziału i trasa domyślna do internetu.',
          },
          { t: 'p', text: 'W nawiasie `[1/0]` pierwsza liczba to **odległość administracyjna** (AD), a druga to metryka. AD mówi, jak bardzo ufamy źródłu trasy. Gdy ta sama sieć jest znana z kilku źródeł, wygrywa najmniejsze AD.' },
          { t: 'table', head: ['Źródło trasy', 'AD'], rows: [['podłączona', '0'], ['statyczna', '1'], ['eBGP', '20'], ['OSPF', '110'], ['statyczna zapasowa (pływająca)', 'np. 200'], ['DHCP (trasa domyślna)', '254']] },
          { t: 'callout', kind: 'tip', title: 'Trasa pływająca', text: 'Statyczna trasa z wysokim AD (np. `ip route 0.0.0.0 0.0.0.0 198.51.100.1 200`) czeka w rezerwie. Wchodzi do tablicy dopiero, gdy główna trasa zniknie, np. po awarii łącza.' },
        ],
        en: [
          { t: 'p', text: 'You add a static route in global configuration mode: network, mask and next hop. The next hop must be reachable through a directly connected network.' },
          {
            t: 'code',
            lines: [
              'R1(config)# ip route 192.168.2.0 255.255.255.0 10.0.12.2',
              'R1(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1',
              'R1(config)# end',
              'R1# show ip route',
              'S*    0.0.0.0/0 [1/0] via 203.0.113.1',
              'C        10.0.12.0/30 is directly connected, GigabitEthernet0/0/1',
              'S        192.168.2.0/24 [1/0] via 10.0.12.2',
            ],
            caption: 'A route to the branch network and a default route to the internet.',
          },
          { t: 'p', text: 'In `[1/0]` the first number is the **administrative distance** (AD) and the second is the metric. AD says how much we trust the route source. When several sources know the same network, the lowest AD wins.' },
          { t: 'table', head: ['Route source', 'AD'], rows: [['connected', '0'], ['static', '1'], ['eBGP', '20'], ['OSPF', '110'], ['floating static', 'e.g. 200'], ['DHCP (default route)', '254']] },
          { t: 'callout', kind: 'tip', title: 'Floating route', text: 'A static route with a high AD (e.g. `ip route 0.0.0.0 0.0.0.0 198.51.100.1 200`) waits in reserve. It enters the table only when the primary route disappears, e.g. after a link failure.' },
        ],
      },
    },
    {
      id: 'diagnoza',
      title: l('Typowe problemy z routingiem', 'Common routing problems'),
      body: {
        pl: [
          {
            t: 'list',
            items: [
              '**Interfejs wyłączony**: sieć podłączona nie pojawia się w tablicy. Sprawdź `show ip interface brief` i użyj `no shutdown`.',
              '**Brak trasy powrotnej**: pakiet dociera, odpowiedź ginie. Traceroute pokaże, gdzie urywa się droga.',
              '**Zły następny skok**: adres spoza sieci podłączonej, trasa nie wejdzie do tablicy.',
              '**Pętla routingu**: dwa routery wskazują siebie nawzajem. TTL spada do zera i pojawia się komunikat „TTL expired”.',
              '**Host bez bramy**: komputer w ogóle nie wysyła pakietów poza swoją sieć.',
            ],
          },
          { t: 'code', lines: ['C:\\Users\\PC1> tracert 10.3.0.10', '  1    <1 ms  10.1.0.1', '  2    <1 ms  10.12.0.2', '  3     *     Upłynął limit czasu żądania.'], caption: 'Droga urywa się za drugim routerem: tam szukaj brakującej trasy.' },
        ],
        en: [
          {
            t: 'list',
            items: [
              '**Interface shut down**: the connected network is missing from the table. Check `show ip interface brief` and use `no shutdown`.',
              '**No return route**: the packet arrives but the reply is lost. Traceroute shows where the path breaks.',
              '**Wrong next hop**: an address outside any connected network, so the route never enters the table.',
              '**Routing loop**: two routers point at each other. TTL hits zero and you see "TTL expired".',
              '**Host without a gateway**: the computer never sends packets outside its network.',
            ],
          },
          { t: 'code', lines: ['C:\\Users\\PC1> tracert 10.3.0.10', '  1    <1 ms  10.1.0.1', '  2    <1 ms  10.12.0.2', '  3     *     Request timed out.'], caption: 'The path breaks after the second router: look for the missing route there.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q33-1', kind: 'single', q: l('Pakiet do 10.1.2.77. Która trasa wygra?', 'A packet to 10.1.2.77. Which route wins?'), options: [l('0.0.0.0/0', '0.0.0.0/0'), l('10.0.0.0/8', '10.0.0.0/8'), l('10.1.0.0/16', '10.1.0.0/16'), l('10.1.2.0/24', '10.1.2.0/24')], answer: 3, explain: l('Wszystkie pasują, ale /24 jest najdłuższym prefiksem.', 'All match, but /24 is the longest prefix.') },
    { id: 'q33-2', kind: 'single', q: l('Jaką AD ma trasa statyczna?', 'What AD does a static route have?'), options: [l('0', '0'), l('1', '1'), l('110', '110'), l('254', '254')], answer: 1, explain: l('Statyczna ma 1, podłączona 0, OSPF 110.', 'Static is 1, connected 0, OSPF 110.') },
    { id: 'q33-3', kind: 'input', q: l('Wpisz polecenie trasy domyślnej przez 203.0.113.1.', 'Type the default route command via 203.0.113.1.'), answer: ['ip route 0.0.0.0 0.0.0.0 203.0.113.1'], placeholder: 'ip route ...', explain: l('Trasa domyślna to sieć 0.0.0.0 z maską 0.0.0.0.', 'The default route is network 0.0.0.0 with mask 0.0.0.0.') },
    { id: 'q33-4', kind: 'single', q: l('PC1 pinguje PC3 przez trzy routery. Na R3 brakuje trasy do sieci PC1. Co się dzieje?', 'PC1 pings PC3 across three routers. R3 lacks a route to PC1’s network. What happens?'), options: [l('Ping działa', 'Ping works'), l('Żądanie dociera do PC3, ale odpowiedź ginie na R3', 'The request reaches PC3 but the reply dies at R3'), l('PC1 dostaje błąd DNS', 'PC1 gets a DNS error'), l('Pakiety krążą w pętli', 'Packets loop')], answer: 1, explain: l('Trasa w jedną stronę to za mało. Odpowiedź potrzebuje drogi powrotnej.', 'A one-way route is not enough. The reply needs a way back.') },
    { id: 'q33-5', kind: 'single', q: l('Do czego służy trasa pływająca?', 'What is a floating static route for?'), options: [l('Do równoważenia ruchu', 'Load balancing'), l('Jako zapas, gdy główna trasa zniknie', 'As a backup when the main route disappears'), l('Do szyfrowania', 'Encryption'), l('Do NAT', 'NAT')], answer: 1, explain: l('Ma wyższe AD, więc wchodzi do tablicy tylko, gdy lepsza trasa zniknie.', 'Its higher AD keeps it out of the table until the better route is gone.') },
    { id: 'q33-6', kind: 'single', q: l('Interfejs routera ma adres, ale sieci nie ma w tablicy routingu. Najczęstsza przyczyna?', 'A router interface has an address but its network is missing from the table. Most likely cause?'), options: [l('Interfejs jest wyłączony (shutdown) albo nie ma łącza', 'The interface is shut down or has no link'), l('Brak DNS', 'No DNS'), l('Zła kategoria kabla', 'Wrong cable category'), l('Za długi hostname', 'Hostname too long')], answer: 0, explain: l('Trasa C pojawia się tylko dla aktywnego interfejsu.', 'A C route appears only for an active interface.') },
    { id: 'q33-7', kind: 'single', q: l('Co router robi z TTL pakietu?', 'What does a router do with a packet’s TTL?'), options: [l('Zwiększa o 1', 'Increases it by 1'), l('Zmniejsza o 1, a przy zerze odrzuca pakiet', 'Decreases it by 1 and drops the packet at zero'), l('Nic', 'Nothing'), l('Ustawia na 255', 'Sets it to 255')], answer: 1, explain: l('TTL chroni przed nieskończonym krążeniem pakietów i jest podstawą traceroute.', 'TTL prevents packets from circling forever and is the basis of traceroute.') },
    { id: 'q33-8', kind: 'single', q: l('Co oznacza kod S* w show ip route?', 'What does the S* code mean in show ip route?'), options: [l('Trasa statyczna kandydująca na domyślną', 'A static candidate default route'), l('Trasa OSPF', 'An OSPF route'), l('Sieć podłączona', 'A connected network'), l('Trasa zablokowana', 'A blocked route')], answer: 0, explain: l('S to statyczna, a gwiazdka oznacza kandydata na trasę domyślną.', 'S is static and the asterisk marks a candidate default.') },
  ],
};
