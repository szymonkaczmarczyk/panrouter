import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m21: Module = {
  id: 'osi-tcpip',
  level: 2,
  icon: 'layers',
  minutes: 16,
  title: l('Model OSI i TCP/IP', 'The OSI and TCP/IP models'),
  summary: l(
    'Siedem warstw OSI, cztery warstwy TCP/IP, enkapsulacja i jednostki danych. Wspólny język wszystkich sieciowców.',
    'Seven OSI layers, four TCP/IP layers, encapsulation and data units. The common language of network engineers.',
  ),
  labs: ['arp-krok-po-kroku'],
  games: ['warstwy-osi'],
  sections: [
    {
      id: 'po-co',
      title: l('Po co dzielić sieć na warstwy', 'Why split networking into layers'),
      body: {
        pl: [
          { t: 'p', text: 'Przesłanie strony WWW to wiele zadań naraz: zamiana danych na impulsy, adresowanie, wybór trasy, kontrola błędów, szyfrowanie. Żeby nad tym zapanować, dzielimy komunikację na **warstwy**. Każda ma jedno zadanie i korzysta z usług warstwy niżej.' },
          {
            t: 'list',
            items: [
              'Producent karty Wi-Fi nie musi znać HTTP, a twórca przeglądarki nie musi znać fal radiowych.',
              'Możesz wymienić Wi-Fi na światłowód, a aplikacja nadal działa.',
              'Przy awarii pytasz po kolei: kabel? adres? trasa? port? aplikacja?',
            ],
          },
          { t: 'figure', id: 'osi-stack', caption: 'Model OSI ma siedem warstw. W praktyce internet działa według modelu TCP/IP z czterema.' },
        ],
        en: [
          { t: 'p', text: 'Delivering a web page involves many jobs at once: turning data into signals, addressing, picking a path, error control, encryption. To manage it we split communication into **layers**. Each has one job and uses the services of the layer below.' },
          {
            t: 'list',
            items: [
              'A Wi-Fi chip maker does not need to know HTTP, and a browser author does not need to know radio waves.',
              'You can swap Wi-Fi for fiber and the application still works.',
              'When something breaks you ask in order: cable? address? route? port? application?',
            ],
          },
          { t: 'figure', id: 'osi-stack', caption: 'The OSI model has seven layers. In practice the internet follows the four-layer TCP/IP model.' },
        ],
      },
    },
    {
      id: 'warstwy',
      title: l('Siedem warstw w skrócie', 'Seven layers in short'),
      body: {
        pl: [
          {
            t: 'table',
            head: ['Warstwa', 'Zadanie', 'Przykłady', 'Urządzenia'],
            rows: [
              ['7 aplikacji', 'usługi dla programów', 'HTTP, DNS, DHCP, SSH', 'serwery, zapory NGFW'],
              ['6 prezentacji', 'format i szyfrowanie danych', 'TLS, kodowanie znaków', '-'],
              ['5 sesji', 'utrzymanie rozmowy', 'sesje aplikacji', '-'],
              ['4 transportowa', 'porty, niezawodność', 'TCP, UDP, QUIC', 'zapory'],
              ['3 sieciowa', 'adresy IP i trasy', 'IPv4, IPv6, ICMP, OSPF', 'routery, przełączniki L3'],
              ['2 łącza danych', 'ramki w jednej sieci', 'Ethernet, Wi-Fi, ARP, VLAN', 'przełączniki, AP'],
              ['1 fizyczna', 'bity w medium', 'skrętka, światło, radio', 'kable, wkładki SFP'],
            ],
          },
          { t: 'callout', kind: 'tip', title: 'Wierszyk', text: 'Od dołu: **F**izyczna, **Ł**ącza danych, **S**ieciowa, **T**ransportowa, **S**esji, **P**rezentacji, **A**plikacji. Ułóż własne zdanie z tych liter, łatwiej zapamiętasz.' },
          { t: 'p', text: 'Model TCP/IP łączy górne trzy warstwy w jedną warstwę aplikacji, a dwie dolne w warstwę dostępu do sieci. Mówiąc „warstwa 2” albo „przełącznik L3”, sieciowcy wciąż używają numerów z OSI.' },
        ],
        en: [
          {
            t: 'table',
            head: ['Layer', 'Job', 'Examples', 'Devices'],
            rows: [
              ['7 application', 'services for programs', 'HTTP, DNS, DHCP, SSH', 'servers, NGFW firewalls'],
              ['6 presentation', 'data format and encryption', 'TLS, character encoding', '-'],
              ['5 session', 'keeping the conversation', 'application sessions', '-'],
              ['4 transport', 'ports, reliability', 'TCP, UDP, QUIC', 'firewalls'],
              ['3 network', 'IP addresses and routes', 'IPv4, IPv6, ICMP, OSPF', 'routers, L3 switches'],
              ['2 data link', 'frames within one network', 'Ethernet, Wi-Fi, ARP, VLAN', 'switches, APs'],
              ['1 physical', 'bits on the medium', 'twisted pair, light, radio', 'cables, SFP optics'],
            ],
          },
          { t: 'callout', kind: 'tip', title: 'Mnemonic', text: 'From the bottom: **P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way (Physical, Data link, Network, Transport, Session, Presentation, Application).' },
          { t: 'p', text: 'The TCP/IP model merges the top three layers into one application layer and the bottom two into a network access layer. When saying "layer 2" or "L3 switch", engineers still use OSI numbers.' },
        ],
      },
    },
    {
      id: 'enkapsulacja',
      title: l('Enkapsulacja: list w kopercie w kopercie', 'Encapsulation: a letter inside envelopes'),
      body: {
        pl: [
          { t: 'p', text: 'Gdy wysyłasz dane, każda warstwa dokłada swój **nagłówek**, jak kolejną kopertę. Odbiorca zdejmuje je w odwrotnej kolejności. Nazwy jednostek danych (PDU) zależą od warstwy.' },
          { t: 'figure', id: 'encapsulation', caption: 'Segment TCP trafia do pakietu IP, a pakiet do ramki Ethernet. Ramka kończy się sumą kontrolną FCS.' },
          {
            t: 'terms',
            items: [
              ['Segment', 'warstwa 4: nagłówek TCP lub UDP z portami (dla UDP mówi się też datagram)'],
              ['Pakiet', 'warstwa 3: nagłówek IP z adresem źródłowym i docelowym oraz TTL'],
              ['Ramka', 'warstwa 2: nagłówek Ethernet z adresami MAC, opcjonalny znacznik VLAN i suma FCS'],
              ['Bity', 'warstwa 1: impulsy elektryczne, światło albo fale radiowe'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'W trybie symulacji PanRouter kliknij dowolny pakiet. Zobaczysz jego warstwy dokładnie w tej kolejności: Ethernet, IP, TCP lub UDP i dane aplikacji.' },
        ],
        en: [
          { t: 'p', text: 'When you send data, each layer adds its own **header**, like another envelope. The receiver removes them in reverse order. Data unit (PDU) names depend on the layer.' },
          { t: 'figure', id: 'encapsulation', caption: 'A TCP segment goes into an IP packet, and the packet goes into an Ethernet frame. The frame ends with an FCS checksum.' },
          {
            t: 'terms',
            items: [
              ['Segment', 'layer 4: a TCP or UDP header with ports (for UDP also called a datagram)'],
              ['Packet', 'layer 3: an IP header with source and destination address and TTL'],
              ['Frame', 'layer 2: an Ethernet header with MAC addresses, an optional VLAN tag and an FCS checksum'],
              ['Bits', 'layer 1: electrical pulses, light or radio waves'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'In PanRouter simulation mode click any packet. You will see its layers in exactly this order: Ethernet, IP, TCP or UDP and the application data.' },
        ],
      },
    },
    {
      id: 'diagnoza',
      title: l('Warstwy w diagnozowaniu', 'Layers in troubleshooting'),
      body: {
        pl: [
          { t: 'p', text: 'Najpopularniejsza metoda to **od dołu do góry**. Zanim zaczniesz podejrzewać aplikację, upewnij się, że działają niższe warstwy.' },
          {
            t: 'table',
            head: ['Warstwa', 'Pytanie', 'Czym sprawdzić'],
            rows: [
              ['1', 'Czy dioda świeci? Czy kabel jest podłączony?', 'panel Fizyczne, `show interfaces status`'],
              ['2', 'Czy port jest w dobrym VLAN-ie? Czy przełącznik zna MAC?', '`show vlan brief`, `show mac address-table`'],
              ['3', 'Czy adres, maska i brama są poprawne? Czy jest trasa?', '`ipconfig`, `ping`, `show ip route`'],
              ['4', 'Czy usługa nasłuchuje na porcie? Czy zapora go nie blokuje?', '`curl`, reguły zapory, `show access-lists`'],
              ['7', 'Czy działa DNS? Czy aplikacja odpowiada?', '`nslookup`, przeglądarka'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Gdy podejrzewasz konkretną warstwę, możesz też zacząć od środka, np. od pingu. Jeśli ping działa, warstwy 1-3 są w porządku i szukasz wyżej.' },
        ],
        en: [
          { t: 'p', text: 'The most popular method is **bottom-up**. Before suspecting the application, make sure the lower layers work.' },
          {
            t: 'table',
            head: ['Layer', 'Question', 'How to check'],
            rows: [
              ['1', 'Is the LED on? Is the cable connected?', 'Physical tab, `show interfaces status`'],
              ['2', 'Is the port in the right VLAN? Does the switch know the MAC?', '`show vlan brief`, `show mac address-table`'],
              ['3', 'Are address, mask and gateway right? Is there a route?', '`ipconfig`, `ping`, `show ip route`'],
              ['4', 'Does the service listen on the port? Does a firewall block it?', '`curl`, firewall rules, `show access-lists`'],
              ['7', 'Does DNS work? Does the application answer?', '`nslookup`, the browser'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'When you suspect a specific layer you can also start in the middle, e.g. with ping. If ping works, layers 1-3 are fine and you look higher.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q21-1',
      kind: 'single',
      q: l('W której warstwie OSI działa router?', 'At which OSI layer does a router work?'),
      options: [l('1', '1'), l('2', '2'), l('3', '3'), l('7', '7')],
      answer: 2,
      explain: l('Router kieruje pakiety według adresów IP, czyli w warstwie sieciowej (3).', 'A router forwards packets by IP address, at the network layer (3).'),
    },
    {
      id: 'q21-2',
      kind: 'single',
      q: l('Jak nazywa się PDU w warstwie 2?', 'What is the layer 2 PDU called?'),
      options: [l('Segment', 'Segment'), l('Pakiet', 'Packet'), l('Ramka', 'Frame'), l('Bit', 'Bit')],
      answer: 2,
      explain: l('Warstwa łącza danych przesyła ramki z adresami MAC.', 'The data link layer carries frames with MAC addresses.'),
    },
    {
      id: 'q21-3',
      kind: 'order',
      q: l('Ułóż warstwy OSI od najniższej do najwyższej (pierwsze cztery).', 'Order the OSI layers from lowest to highest (first four).'),
      items: [l('Fizyczna', 'Physical'), l('Łącza danych', 'Data link'), l('Sieciowa', 'Network'), l('Transportowa', 'Transport')],
      explain: l('Od dołu: fizyczna (1), łącza danych (2), sieciowa (3), transportowa (4).', 'From the bottom: physical (1), data link (2), network (3), transport (4).'),
    },
    {
      id: 'q21-4',
      kind: 'single',
      q: l('Do której warstwy należą TCP i UDP?', 'Which layer do TCP and UDP belong to?'),
      options: [l('Sieciowej', 'Network'), l('Transportowej', 'Transport'), l('Aplikacji', 'Application'), l('Łącza danych', 'Data link')],
      answer: 1,
      explain: l('TCP i UDP dostarczają dane do właściwego portu, to warstwa 4.', 'TCP and UDP deliver data to the right port, that is layer 4.'),
    },
    {
      id: 'q21-5',
      kind: 'multi',
      q: l('Które protokoły należą do warstwy aplikacji? Wybierz wszystkie.', 'Which protocols are application layer? Select all.'),
      options: [l('HTTP', 'HTTP'), l('DNS', 'DNS'), l('IP', 'IP'), l('DHCP', 'DHCP')],
      answer: [0, 1, 3],
      explain: l('HTTP, DNS i DHCP to usługi aplikacji. IP działa w warstwie sieciowej.', 'HTTP, DNS and DHCP are application services. IP is network layer.'),
    },
    {
      id: 'q21-6',
      kind: 'single',
      q: l('Co dzieje się z danymi przy wysyłaniu?', 'What happens to data when it is sent?'),
      options: [l('Każda warstwa dokłada nagłówek (enkapsulacja)', 'Each layer adds a header (encapsulation)'), l('Każda warstwa usuwa nagłówek', 'Each layer removes a header'), l('Dane omijają warstwy', 'Data skips the layers'), l('Tylko warstwa 7 coś zmienia', 'Only layer 7 changes anything')],
      answer: 0,
      explain: l('Nadawca opakowuje dane kolejnymi nagłówkami, a odbiorca je zdejmuje (dekapsulacja).', 'The sender wraps data in headers and the receiver removes them (decapsulation).'),
    },
    {
      id: 'q21-7',
      kind: 'single',
      q: l('Ping do serwera działa, ale strona się nie otwiera. Gdzie szukasz problemu najpierw?', 'Ping to a server works but the page does not open. Where do you look first?'),
      options: [l('Kabel i diody', 'Cable and LEDs'), l('Warstwa 4 i wyżej: port, zapora, usługa, DNS', 'Layer 4 and up: port, firewall, service, DNS'), l('Adres MAC karty', 'The card’s MAC address'), l('Kategoria skrętki', 'The cable category')],
      answer: 1,
      explain: l('Skoro ping działa, warstwy 1-3 są sprawne. Problem jest wyżej.', 'Since ping works, layers 1-3 are fine. The problem is higher up.'),
    },
    {
      id: 'q21-8',
      kind: 'single',
      q: l('Ile warstw ma model TCP/IP?', 'How many layers does the TCP/IP model have?'),
      options: [l('3', '3'), l('4', '4'), l('5', '5'), l('7', '7')],
      answer: 1,
      explain: l('Aplikacji, transportowa, internetowa i dostępu do sieci.', 'Application, transport, internet and network access.'),
    },
  ],
};
