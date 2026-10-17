import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m42: Module = {
  id: 'ospf',
  level: 4,
  icon: 'waypoints',
  minutes: 20,
  title: l('Routing dynamiczny i OSPF', 'Dynamic routing and OSPF'),
  summary: l(
    'Dlaczego trasy statyczne nie skalują się, jak routery same uczą się sieci, sąsiedztwa OSPF, koszt, obszary i konfiguracja.',
    'Why static routes do not scale, how routers learn networks themselves, OSPF neighbors, cost, areas and configuration.',
  ),
  labs: ['ospf'],
  games: ['droga-pakietu'],
  sections: [
    {
      id: 'po-co',
      title: l('Routery, które rozmawiają ze sobą', 'Routers that talk to each other'),
      body: {
        pl: [
          { t: 'p', text: 'Przy kilku routerach trasy statyczne jeszcze działają. Przy dziesiątkach każda zmiana oznacza ręczne poprawki w wielu miejscach, a awaria łącza nie omija się sama. **Protokoły routingu dynamicznego** wymieniają informacje o sieciach i same przeliczają trasy.' },
          {
            t: 'table',
            head: ['Protokół', 'Rodzaj', 'Gdzie'],
            rows: [
              ['**OSPF**', 'stanu łącza', 'sieci firmowe i kampusy, otwarty standard'],
              ['IS-IS', 'stanu łącza', 'sieci operatorów, centra danych'],
              ['EIGRP', 'hybrydowy', 'starsze sieci jednego producenta'],
              ['**BGP**', 'wektora ścieżek', 'internet między operatorami, duże centra danych'],
              ['RIP', 'wektora odległości', 'historia, metryka to liczba skoków'],
            ],
          },
        ],
        en: [
          { t: 'p', text: 'With a few routers static routes still work. With dozens every change means manual edits in many places, and a link failure is not routed around by itself. **Dynamic routing protocols** exchange information about networks and recalculate routes automatically.' },
          {
            t: 'table',
            head: ['Protocol', 'Type', 'Where'],
            rows: [
              ['**OSPF**', 'link state', 'enterprise networks and campuses, open standard'],
              ['IS-IS', 'link state', 'carrier networks, data centers'],
              ['EIGRP', 'hybrid', 'older single-vendor networks'],
              ['**BGP**', 'path vector', 'the internet between operators, large data centers'],
              ['RIP', 'distance vector', 'history, metric is the hop count'],
            ],
          },
        ],
      },
    },
    {
      id: 'jak-dziala',
      title: l('Jak działa OSPF', 'How OSPF works'),
      body: {
        pl: [
          {
            t: 'list',
            ordered: true,
            items: [
              'Routery wysyłają pakiety **Hello** na interfejsach z włączonym OSPF i tak znajdują **sąsiadów**.',
              'Sąsiedzi muszą się zgadzać co do obszaru, podsieci, czasów Hello i Dead oraz MTU.',
              'Wymieniają opisy łączy (LSA) i budują identyczną mapę sieci (LSDB).',
              'Każdy router liczy najkrótsze ścieżki algorytmem Dijkstry (SPF).',
              'Po awarii łącza mapa się zmienia i trasy przeliczają się w sekundy.',
            ],
          },
          { t: 'p', text: '**Koszt** łącza to przepustowość odniesienia podzielona przez przepustowość łącza. Domyślne odniesienie to 100 Mb/s, więc łącza 1, 10 i 100 Gb/s miałyby ten sam koszt 1. W 2026 roku ustawia się odniesienie co najmniej 100 Gb/s na **wszystkich** routerach.' },
          { t: 'p', text: 'Na łączach typu Ethernet wybierany jest router wyznaczony (DR) i zapasowy (BDR), żeby nie każdy wymieniał się z każdym. Identyfikator routera (router-id) wybiera się ręcznie albo z najwyższego adresu, najlepiej z interfejsu loopback.' },
        ],
        en: [
          {
            t: 'list',
            ordered: true,
            items: [
              'Routers send **Hello** packets on OSPF-enabled interfaces and find **neighbors** that way.',
              'Neighbors must agree on area, subnet, Hello and Dead timers and MTU.',
              'They exchange link descriptions (LSAs) and build an identical network map (LSDB).',
              'Each router computes shortest paths with Dijkstra’s algorithm (SPF).',
              'When a link fails the map changes and routes are recalculated within seconds.',
            ],
          },
          { t: 'p', text: 'A link’s **cost** is the reference bandwidth divided by the link bandwidth. The default reference is 100 Mb/s, so 1, 10 and 100 Gb/s links would all cost 1. In 2026 you set a reference of at least 100 Gb/s on **all** routers.' },
          { t: 'p', text: 'On Ethernet segments a designated router (DR) and backup (BDR) are elected so not everyone exchanges with everyone. The router-id is set manually or taken from the highest address, ideally from a loopback interface.' },
        ],
      },
    },
    {
      id: 'konfiguracja',
      title: l('Konfiguracja i obszary', 'Configuration and areas'),
      body: {
        pl: [
          { t: 'code', lines: ['R1(config)# router ospf 1', 'R1(config-router)# router-id 1.1.1.1', 'R1(config-router)# auto-cost reference-bandwidth 100000', 'R1(config-router)# network 10.0.12.0 0.0.0.3 area 0', 'R1(config-router)# network 192.168.1.0 0.0.0.255 area 0', 'R1(config-router)# passive-interface g0/0/0', 'R1(config-router)# default-information originate', 'R1# show ip ospf neighbor'], caption: 'Polecenie network używa maski odwrotnej (wildcard). passive-interface ogłasza sieć LAN, ale nie szuka w niej sąsiadów.' },
          { t: 'callout', kind: 'tip', title: 'Maska odwrotna', text: 'Wildcard to odwrotność maski: dla /24 to `0.0.0.255`, dla /30 to `0.0.0.3`. Liczysz 255 minus każdy oktet maski.' },
          { t: 'figure', id: 'ospf-areas', caption: 'Duże sieci dzieli się na obszary połączone z obszarem 0 przez routery brzegowe obszarów (ABR).' },
          { t: 'callout', kind: 'warn', text: 'Sąsiedztwo się nie tworzy? Sprawdź: ten sam obszar po obu stronach, ta sama podsieć, interfejs nie jest pasywny, łącze działa i nic nie blokuje pakietów OSPF.' },
        ],
        en: [
          { t: 'code', lines: ['R1(config)# router ospf 1', 'R1(config-router)# router-id 1.1.1.1', 'R1(config-router)# auto-cost reference-bandwidth 100000', 'R1(config-router)# network 10.0.12.0 0.0.0.3 area 0', 'R1(config-router)# network 192.168.1.0 0.0.0.255 area 0', 'R1(config-router)# passive-interface g0/0/0', 'R1(config-router)# default-information originate', 'R1# show ip ospf neighbor'], caption: 'The network command uses a wildcard mask. passive-interface advertises the LAN but does not look for neighbors there.' },
          { t: 'callout', kind: 'tip', title: 'Wildcard mask', text: 'A wildcard is the inverse of a mask: for /24 it is `0.0.0.255`, for /30 `0.0.0.3`. Subtract each mask octet from 255.' },
          { t: 'figure', id: 'ospf-areas', caption: 'Large networks are split into areas attached to area 0 through area border routers (ABRs).' },
          { t: 'callout', kind: 'warn', text: 'No adjacency? Check: the same area on both sides, the same subnet, the interface is not passive, the link is up and nothing blocks OSPF packets.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q42-1', kind: 'single', q: l('Jaki algorytm liczy trasy w OSPF?', 'Which algorithm computes OSPF routes?'), options: [l('Bellman-Ford', 'Bellman-Ford'), l('Dijkstra (SPF)', 'Dijkstra (SPF)'), l('Spanning Tree', 'Spanning Tree'), l('Round robin', 'Round robin')], answer: 1, explain: l('OSPF to protokół stanu łącza: każdy router liczy najkrótsze ścieżki algorytmem Dijkstry.', 'OSPF is link state: each router runs Dijkstra’s shortest path.') },
    { id: 'q42-2', kind: 'input', q: l('Jaka jest maska odwrotna dla /30?', 'What is the wildcard mask for /30?'), answer: ['0.0.0.3'], explain: l('Maska /30 to 255.255.255.252, więc wildcard to 0.0.0.3.', 'A /30 mask is 255.255.255.252, so the wildcard is 0.0.0.3.') },
    { id: 'q42-3', kind: 'single', q: l('Jaką AD ma OSPF?', 'What is OSPF’s AD?'), options: [l('1', '1'), l('90', '90'), l('110', '110'), l('120', '120')], answer: 2, explain: l('OSPF ma odległość administracyjną 110.', 'OSPF has an administrative distance of 110.') },
    { id: 'q42-4', kind: 'single', q: l('R1 ma obszar 0, a R2 obszar 1 na wspólnym łączu. Co się stanie?', 'R1 uses area 0 and R2 area 1 on their shared link. What happens?'), options: [l('Utworzą sąsiedztwo', 'They form an adjacency'), l('Sąsiedztwo nie powstanie', 'No adjacency forms'), l('Wymienią tylko trasę domyślną', 'They exchange only the default route'), l('Powstanie pętla', 'A loop forms')], answer: 1, explain: l('Numer obszaru musi być zgodny po obu stronach łącza.', 'The area number must match on both ends of the link.') },
    { id: 'q42-5', kind: 'single', q: l('Po co passive-interface na porcie LAN?', 'Why use passive-interface on a LAN port?'), options: [l('Żeby ogłaszać sieć LAN bez wysyłania Hello do komputerów', 'To advertise the LAN without sending Hellos to PCs'), l('Żeby wyłączyć port', 'To shut the port'), l('Żeby włączyć NAT', 'To enable NAT'), l('Żeby zmienić koszt', 'To change cost')], answer: 0, explain: l('Sieć trafia do OSPF, a na port nie lecą zbędne Hello, które mogłyby też posłużyć do ataku.', 'The network enters OSPF and no needless Hellos go out, which could also be abused.') },
    { id: 'q42-6', kind: 'single', q: l('Dlaczego zmienia się auto-cost reference-bandwidth?', 'Why change auto-cost reference-bandwidth?'), options: [l('Bo domyślnie łącza od 100 Mb/s w górę mają ten sam koszt', 'Because by default links of 100 Mb/s and up have the same cost'), l('Żeby szyfrować OSPF', 'To encrypt OSPF'), l('Żeby skrócić Hello', 'To shorten Hellos'), l('Bo inaczej OSPF nie działa', 'Otherwise OSPF fails')], answer: 0, explain: l('Przy odniesieniu 100 Mb/s 1G, 10G i 100G mają koszt 1 i OSPF ich nie odróżnia.', 'With a 100 Mb/s reference, 1G, 10G and 100G all cost 1 and OSPF cannot tell them apart.') },
    { id: 'q42-7', kind: 'single', q: l('Który protokół łączy sieci operatorów w internecie?', 'Which protocol connects operator networks on the internet?'), options: [l('OSPF', 'OSPF'), l('RIP', 'RIP'), l('BGP', 'BGP'), l('STP', 'STP')], answer: 2, explain: l('BGP wymienia trasy między systemami autonomicznymi.', 'BGP exchanges routes between autonomous systems.') },
    { id: 'q42-8', kind: 'single', q: l('Który obszar OSPF to szkielet?', 'Which OSPF area is the backbone?'), options: [l('0', '0'), l('1', '1'), l('255', '255'), l('Dowolny', 'Any')], answer: 0, explain: l('Obszar 0 łączy pozostałe obszary.', 'Area 0 ties the other areas together.') },
  ],
};
