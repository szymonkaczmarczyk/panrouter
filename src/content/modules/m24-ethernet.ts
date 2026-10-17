import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m24: Module = {
  id: 'ethernet',
  level: 2,
  icon: 'cpu',
  minutes: 17,
  title: l('Ethernet, przełączanie i ARP', 'Ethernet, switching and ARP'),
  summary: l(
    'Budowa ramki, uczenie się adresów MAC, zalewanie i filtrowanie, domena rozgłoszeniowa oraz to, jak ARP znajduje adres MAC dla adresu IP.',
    'Frame structure, MAC learning, flooding and filtering, the broadcast domain and how ARP finds the MAC address for an IP address.',
  ),
  labs: ['arp-krok-po-kroku'],
  games: ['tablica-mac'],
  sections: [
    {
      id: 'ramka',
      title: l('Ramka Ethernet', 'The Ethernet frame'),
      body: {
        pl: [
          { t: 'p', text: 'Ethernet przesyła dane w **ramkach**. Każda ramka ma adres MAC odbiorcy i nadawcy, typ zawartości (np. IPv4 albo ARP), dane i sumę kontrolną FCS. Przełącznik, który znajdzie błąd sumy, po prostu ramkę odrzuca.' },
          {
            t: 'table',
            head: ['Pole', 'Rozmiar', 'Zawartość'],
            rows: [
              ['MAC docelowy', '6 B', 'komu dostarczyć, `ff:ff:ff:ff:ff:ff` = wszystkim'],
              ['MAC źródłowy', '6 B', 'kto wysłał'],
              ['znacznik 802.1Q', '4 B (opcja)', 'numer VLAN, tylko na trunkach'],
              ['EtherType', '2 B', '`0x0800` IPv4, `0x0806` ARP, `0x86DD` IPv6'],
              ['dane', '46-1500 B', 'pakiet IP (MTU 1500)'],
              ['FCS', '4 B', 'suma kontrolna CRC'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'Współczesny Ethernet działa w trybie **full duplex**: każde urządzenie ma własny port i nadaje oraz odbiera jednocześnie. Kolizje i CSMA/CD to temat z czasów koncentratorów.' },
        ],
        en: [
          { t: 'p', text: 'Ethernet carries data in **frames**. Each frame has the destination and source MAC address, a content type (e.g. IPv4 or ARP), data and an FCS checksum. A switch that finds a checksum error simply drops the frame.' },
          {
            t: 'table',
            head: ['Field', 'Size', 'Content'],
            rows: [
              ['destination MAC', '6 B', 'who to deliver to, `ff:ff:ff:ff:ff:ff` = everyone'],
              ['source MAC', '6 B', 'who sent it'],
              ['802.1Q tag', '4 B (optional)', 'VLAN number, only on trunks'],
              ['EtherType', '2 B', '`0x0800` IPv4, `0x0806` ARP, `0x86DD` IPv6'],
              ['data', '46-1500 B', 'the IP packet (MTU 1500)'],
              ['FCS', '4 B', 'CRC checksum'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'Modern Ethernet runs **full duplex**: every device has its own port and sends and receives at the same time. Collisions and CSMA/CD belong to the days of hubs.' },
        ],
      },
    },
    {
      id: 'uczenie',
      title: l('Jak przełącznik uczy się adresów', 'How a switch learns addresses'),
      body: {
        pl: [
          { t: 'p', text: 'Przełącznik zaczyna z pustą **tablicą MAC**. Gdy przychodzi ramka, zapamiętuje jej **źródłowy** MAC i port, z którego przyszła. Potem patrzy na **docelowy** MAC i podejmuje jedną z trzech decyzji:' },
          {
            t: 'list',
            items: [
              '**Przekaż**: zna adres celu, więc wysyła ramkę tylko na ten jeden port.',
              '**Zalej** (flooding): nie zna celu albo to rozgłoszenie, więc wysyła na wszystkie porty w tym VLAN-ie poza wejściowym.',
              '**Odfiltruj**: cel jest za tym samym portem, z którego przyszła ramka, więc jej nie wysyła.',
            ],
          },
          { t: 'figure', id: 'switch-learning', caption: 'Po pierwszej ramce od A przełącznik wie, że aa:aa jest za portem Gi1.' },
          { t: 'code', lines: ['SW1# show mac address-table', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----', '   1    02a0.c900.0003    DYNAMIC     Gi1/0/1', '   1    02a0.c900.0005    DYNAMIC     Gi1/0/2'], caption: 'Tablica MAC przełącznika po krótkiej rozmowie dwóch komputerów.' },
        ],
        en: [
          { t: 'p', text: 'A switch starts with an empty **MAC table**. When a frame arrives, it remembers its **source** MAC and the port it came in on. Then it looks at the **destination** MAC and makes one of three decisions:' },
          {
            t: 'list',
            items: [
              '**Forward**: it knows the destination, so it sends the frame out that one port.',
              '**Flood**: it does not know the destination or it is a broadcast, so it sends out every port in the VLAN except the incoming one.',
              '**Filter**: the destination is behind the same port the frame came from, so it does not send it.',
            ],
          },
          { t: 'figure', id: 'switch-learning', caption: 'After the first frame from A the switch knows that aa:aa is behind port Gi1.' },
          { t: 'code', lines: ['SW1# show mac address-table', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----', '   1    02a0.c900.0003    DYNAMIC     Gi1/0/1', '   1    02a0.c900.0005    DYNAMIC     Gi1/0/2'], caption: 'The switch MAC table after a short conversation between two computers.' },
        ],
      },
    },
    {
      id: 'domena',
      title: l('Domena rozgłoszeniowa', 'The broadcast domain'),
      body: {
        pl: [
          { t: 'p', text: '**Domena rozgłoszeniowa** to wszystkie urządzenia, do których dotrze ramka wysłana na adres `ff:ff:ff:ff:ff:ff`. Przełączniki przenoszą rozgłoszenia, a **routery je zatrzymują**. Każdy interfejs routera i każdy VLAN to osobna domena.' },
          { t: 'p', text: 'Za duża domena (setki urządzeń w jednej sieci) to dużo zbędnego ruchu i większe skutki awarii. Dlatego sieci dzieli się na mniejsze: podsieciami IP i VLAN-ami.' },
          { t: 'callout', kind: 'warn', title: 'Pętla w sieci', text: 'Gdyby dwa przełączniki połączyć dwoma kablami bez ochrony, rozgłoszenie krążyłoby w kółko i zablokowało sieć (burza rozgłoszeniowa). Chroni przed tym protokół STP, o którym jest poziom 5.' },
        ],
        en: [
          { t: 'p', text: 'A **broadcast domain** is all devices reached by a frame sent to `ff:ff:ff:ff:ff:ff`. Switches carry broadcasts and **routers stop them**. Each router interface and each VLAN is a separate domain.' },
          { t: 'p', text: 'A domain that is too large (hundreds of devices on one network) means lots of unnecessary traffic and a bigger blast radius. That is why networks are split up with IP subnets and VLANs.' },
          { t: 'callout', kind: 'warn', title: 'A network loop', text: 'If two switches were connected by two cables with no protection, a broadcast would circle forever and bring the network down (a broadcast storm). STP, covered in level 5, prevents that.' },
        ],
      },
    },
    {
      id: 'arp',
      title: l('ARP: kto ma ten adres IP?', 'ARP: who has this IP address?'),
      body: {
        pl: [
          { t: 'p', text: 'Komputer zna adres IP celu, ale ramka potrzebuje adresu MAC. **ARP** rozwiązuje ten problem w dwóch krokach:' },
          {
            t: 'list',
            ordered: true,
            items: [
              'Zapytanie ARP (rozgłoszenie): „Kto ma 192.168.1.1? Powiedz 192.168.1.10.”',
              'Odpowiedź ARP (do pytającego): „192.168.1.1 to 02:a0:c9:00:00:05.”',
              'Pytający zapisuje parę IP-MAC w **tablicy ARP** i wysyła wstrzymany pakiet.',
            ],
          },
          { t: 'p', text: 'Gdy cel jest w innej sieci, komputer pyta ARP o **bramę domyślną**, a nie o sam cel. To bardzo ważne: adres MAC w ramce zmienia się na każdym skoku przez router, a adresy IP w pakiecie zostają te same.' },
          { t: 'code', lines: ['C:\\Users\\PC1> arp -a', 'Interfejs: 192.168.1.10 --- 0x3', '  Adres internetowy     Adres fizyczny        Typ', '  192.168.1.1           02-a0-c9-00-00-05     dynamiczne'], caption: 'Tablica ARP komputera po pierwszym pingu do bramy.' },
          { t: 'callout', kind: 'tip', text: 'W trybie symulacji zobaczysz, czemu pierwszy ping przez router często ginie: router wysyła zapytanie ARP o następny skok i odrzuca pakiet, na który jeszcze nie zna adresu MAC.' },
        ],
        en: [
          { t: 'p', text: 'A computer knows the destination IP, but a frame needs a MAC address. **ARP** solves this in two steps:' },
          {
            t: 'list',
            ordered: true,
            items: [
              'ARP request (broadcast): "Who has 192.168.1.1? Tell 192.168.1.10."',
              'ARP reply (to the asker): "192.168.1.1 is at 02:a0:c9:00:00:05."',
              'The asker stores the IP-MAC pair in its **ARP table** and sends the held packet.',
            ],
          },
          { t: 'p', text: 'When the destination is in another network, the computer ARPs for the **default gateway**, not the destination. This matters: the MAC address in the frame changes at every router hop, while the IP addresses in the packet stay the same.' },
          { t: 'code', lines: ['C:\\Users\\PC1> arp -a', 'Interface: 192.168.1.10 --- 0x3', '  Internet Address      Physical Address      Type', '  192.168.1.1           02-a0-c9-00-00-05     dynamic'], caption: 'A computer’s ARP table after the first ping to the gateway.' },
          { t: 'callout', kind: 'tip', text: 'In simulation mode you will see why the first ping through a router is often lost: the router sends an ARP request for the next hop and drops the packet whose MAC it does not know yet.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q24-1',
      kind: 'single',
      q: l('Którego adresu przełącznik używa do nauki?', 'Which address does a switch use to learn?'),
      options: [l('Docelowego MAC', 'Destination MAC'), l('Źródłowego MAC', 'Source MAC'), l('Docelowego IP', 'Destination IP'), l('Bramy domyślnej', 'Default gateway')],
      answer: 1,
      explain: l('Przełącznik zapisuje źródłowy MAC i port wejściowy. Docelowy MAC służy do decyzji, gdzie wysłać.', 'The switch records the source MAC and ingress port. The destination MAC is used to decide where to send.'),
    },
    {
      id: 'q24-2',
      kind: 'single',
      q: l('Przełącznik nie zna adresu docelowego. Co robi?', 'The switch does not know the destination. What does it do?'),
      options: [l('Odrzuca ramkę', 'Drops the frame'), l('Zalewa ramką porty w tym samym VLAN-ie poza wejściowym', 'Floods the frame to ports in the same VLAN except the ingress'), l('Pyta router', 'Asks the router'), l('Wysyła zapytanie DNS', 'Sends a DNS query')],
      answer: 1,
      explain: l('Nieznany unicast jest zalewany. Gdy cel odpowie, przełącznik nauczy się jego adresu.', 'Unknown unicast is flooded. Once the target replies, the switch learns its address.'),
    },
    {
      id: 'q24-3',
      kind: 'single',
      q: l('Co zatrzymuje rozgłoszenia Ethernet?', 'What stops Ethernet broadcasts?'),
      options: [l('Przełącznik', 'A switch'), l('Router', 'A router'), l('Punkt dostępowy', 'An access point'), l('Kabel Cat6A', 'A Cat6A cable')],
      answer: 1,
      explain: l('Router nie przekazuje rozgłoszeń warstwy 2, więc wyznacza granicę domeny rozgłoszeniowej.', 'A router does not forward layer 2 broadcasts, so it marks the broadcast domain boundary.'),
    },
    {
      id: 'q24-4',
      kind: 'single',
      q: l('PC1 (192.168.1.10/24) pinguje 10.0.0.5. O jaki adres zapyta ARP?', 'PC1 (192.168.1.10/24) pings 10.0.0.5. Which address will it ARP for?'),
      options: [l('10.0.0.5', '10.0.0.5'), l('Bramy domyślnej, np. 192.168.1.1', 'The default gateway, e.g. 192.168.1.1'), l('255.255.255.255', '255.255.255.255'), l('Serwera DNS', 'The DNS server')],
      answer: 1,
      explain: l('Cel jest w innej sieci, więc ramka idzie do bramy. ARP szuka MAC bramy.', 'The target is in another network, so the frame goes to the gateway. ARP looks for the gateway’s MAC.'),
    },
    {
      id: 'q24-5',
      kind: 'single',
      q: l('Co zmienia się na każdym skoku przez router?', 'What changes at every router hop?'),
      options: [l('Adresy IP źródła i celu', 'Source and destination IP'), l('Adresy MAC w ramce', 'The MAC addresses in the frame'), l('Numer portu TCP', 'The TCP port number'), l('Nic', 'Nothing')],
      answer: 1,
      explain: l('Router buduje nową ramkę z własnym MAC jako źródłem i MAC następnego skoku jako celem. IP zostają (pomijając NAT).', 'The router builds a new frame with its own MAC as source and the next hop MAC as destination. IPs stay (NAT aside).'),
    },
    {
      id: 'q24-6',
      kind: 'input',
      q: l('Jaki jest typowy MTU Ethernet w bajtach?', 'What is the typical Ethernet MTU in bytes?'),
      answer: ['1500'],
      explain: l('Standardowe MTU to 1500 bajtów danych w ramce.', 'The standard MTU is 1500 bytes of data per frame.'),
    },
    {
      id: 'q24-7',
      kind: 'single',
      q: l('Jaki EtherType ma ARP?', 'What EtherType does ARP use?'),
      options: [l('0x0800', '0x0800'), l('0x0806', '0x0806'), l('0x86DD', '0x86DD'), l('0x8100', '0x8100')],
      answer: 1,
      explain: l('0x0806 to ARP, 0x0800 IPv4, 0x86DD IPv6, a 0x8100 oznacza znacznik VLAN 802.1Q.', '0x0806 is ARP, 0x0800 IPv4, 0x86DD IPv6 and 0x8100 marks an 802.1Q VLAN tag.'),
    },
    {
      id: 'q24-8',
      kind: 'order',
      q: l('Ułóż kroki pierwszej komunikacji PC1 z PC2 w jednej sieci.', 'Order the steps of PC1’s first conversation with PC2 on one network.'),
      items: [l('PC1 rozgłasza zapytanie ARP o adres PC2', 'PC1 broadcasts an ARP request for PC2'), l('PC2 odsyła odpowiedź ARP ze swoim MAC', 'PC2 replies with its MAC'), l('PC1 zapisuje wpis w tablicy ARP', 'PC1 stores the entry in its ARP table'), l('PC1 wysyła pakiet ICMP do MAC PC2', 'PC1 sends the ICMP packet to PC2’s MAC')],
      explain: l('Najpierw ARP, potem właściwe dane. Kolejne pingi idą od razu, bo wpis jest w tablicy.', 'ARP first, then the actual data. Later pings go straight away because the entry is cached.'),
    },
  ],
};
