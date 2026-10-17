import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m31: Module = {
  id: 'transport',
  level: 3,
  icon: 'workflow',
  minutes: 15,
  title: l('TCP, UDP, QUIC i porty', 'TCP, UDP, QUIC and ports'),
  summary: l(
    'Jak dane trafiają do właściwego programu: porty, uzgadnianie TCP, kiedy wybrać UDP i dlaczego HTTP/3 jeździ po QUIC.',
    'How data reaches the right program: ports, the TCP handshake, when to pick UDP and why HTTP/3 rides on QUIC.',
  ),
  labs: [],
  games: ['porty-uslugi'],
  sections: [
    {
      id: 'porty',
      title: l('Porty: numery mieszkań w budynku', 'Ports: apartment numbers in a building'),
      body: {
        pl: [
          { t: 'p', text: 'Adres IP prowadzi do urządzenia, a **port** do konkretnego programu na nim. Serwer WWW nasłuchuje na porcie 443, serwer DNS na 53, a SSH na 22. Klient wybiera dla siebie losowy **port efemeryczny** (49152-65535).' },
          { t: 'p', text: 'Para adres IP i port to **gniazdo** (socket). Połączenie opisuje pięć wartości: protokół, IP i port źródła oraz IP i port celu. Tak zapora i NAT rozróżniają tysiące równoległych rozmów.' },
          {
            t: 'table',
            head: ['Port', 'Protokół', 'Usługa'],
            rows: [
              ['22', 'TCP', 'SSH: zdalne zarządzanie'],
              ['53', 'UDP i TCP', 'DNS'],
              ['67 i 68', 'UDP', 'DHCP (serwer i klient)'],
              ['80', 'TCP', 'HTTP bez szyfrowania'],
              ['443', 'TCP i UDP', 'HTTPS i HTTP/3 (QUIC)'],
              ['123', 'UDP', 'NTP: synchronizacja czasu'],
              ['161', 'UDP', 'SNMP: monitoring'],
              ['514', 'UDP', 'syslog'],
              ['3389', 'TCP', 'RDP: pulpit zdalny Windows'],
              ['51820', 'UDP', 'WireGuard VPN'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'Porty 0-1023 to porty dobrze znane, 1024-49151 rejestrowane, a 49152-65535 dynamiczne.' },
        ],
        en: [
          { t: 'p', text: 'An IP address leads to a device and a **port** leads to a specific program on it. A web server listens on port 443, a DNS server on 53 and SSH on 22. The client picks a random **ephemeral port** for itself (49152-65535).' },
          { t: 'p', text: 'An IP address plus a port is a **socket**. A connection is described by five values: protocol, source IP and port, destination IP and port. That is how firewalls and NAT tell thousands of parallel conversations apart.' },
          {
            t: 'table',
            head: ['Port', 'Protocol', 'Service'],
            rows: [
              ['22', 'TCP', 'SSH: remote management'],
              ['53', 'UDP and TCP', 'DNS'],
              ['67 and 68', 'UDP', 'DHCP (server and client)'],
              ['80', 'TCP', 'HTTP without encryption'],
              ['443', 'TCP and UDP', 'HTTPS and HTTP/3 (QUIC)'],
              ['123', 'UDP', 'NTP: time sync'],
              ['161', 'UDP', 'SNMP: monitoring'],
              ['514', 'UDP', 'syslog'],
              ['3389', 'TCP', 'RDP: Windows remote desktop'],
              ['51820', 'UDP', 'WireGuard VPN'],
            ],
          },
          { t: 'callout', kind: 'info', text: 'Ports 0-1023 are well-known, 1024-49151 registered and 49152-65535 dynamic.' },
        ],
      },
    },
    {
      id: 'tcp',
      title: l('TCP: niezawodna rozmowa', 'TCP: a reliable conversation'),
      body: {
        pl: [
          { t: 'p', text: '**TCP** gwarantuje, że dane dotrą kompletne i we właściwej kolejności. Zanim cokolwiek wyśle, nawiązuje połączenie w trzech krokach.' },
          { t: 'figure', id: 'tcp-handshake', caption: 'SYN, SYN-ACK, ACK. Dopiero potem płyną dane aplikacji.' },
          {
            t: 'list',
            items: [
              '**Numery sekwencyjne** pozwalają poskładać dane w kolejności.',
              '**Potwierdzenia** (ACK): brak potwierdzenia oznacza retransmisję.',
              '**Kontrola przepływu i przeciążenia**: TCP zwalnia, gdy sieć się zapycha.',
              '**RST** oznacza „nikt tu nie nasłuchuje” albo przerwane połączenie.',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'W symulatorze otwórz przeglądarkę na komputerze w trybie symulacji. Zobaczysz zapytanie DNS, potem SYN, SYN-ACK i żądanie HTTP.' },
        ],
        en: [
          { t: 'p', text: '**TCP** guarantees data arrives complete and in order. Before sending anything it sets up a connection in three steps.' },
          { t: 'figure', id: 'tcp-handshake', caption: 'SYN, SYN-ACK, ACK. Only then does application data flow.' },
          {
            t: 'list',
            items: [
              '**Sequence numbers** let data be reassembled in order.',
              '**Acknowledgments** (ACK): a missing ACK means retransmission.',
              '**Flow and congestion control**: TCP slows down when the network fills up.',
              '**RST** means "nobody listens here" or an aborted connection.',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'In the simulator open the browser on a computer in simulation mode. You will see a DNS query, then SYN, SYN-ACK and the HTTP request.' },
        ],
      },
    },
    {
      id: 'udp-quic',
      title: l('UDP i QUIC', 'UDP and QUIC'),
      body: {
        pl: [
          { t: 'p', text: '**UDP** wysyła datagramy bez nawiązywania połączenia i bez potwierdzeń. Jest szybki i prosty, a ewentualną utratę danych obsługuje aplikacja. Używają go DNS, DHCP, VoIP, gry i strumienie wideo na żywo.' },
          {
            t: 'table',
            head: ['Cecha', 'TCP', 'UDP'],
            rows: [
              ['połączenie', 'tak, uzgadnianie', 'nie'],
              ['kolejność i retransmisje', 'tak', 'nie'],
              ['narzut', 'większy', 'mały'],
              ['przykłady', 'HTTPS, SSH, poczta', 'DNS, DHCP, VoIP, gry'],
            ],
          },
          { t: 'p', text: '**QUIC** to nowoczesny protokół na bazie UDP, który łączy niezawodność TCP z szyfrowaniem TLS 1.3 w jednym kroku. Na nim działa **HTTP/3**, używany przez większość dużych serwisów. Dlatego zapora firmowa powinna przepuszczać nie tylko TCP 443, ale też UDP 443.' },
        ],
        en: [
          { t: 'p', text: '**UDP** sends datagrams without a connection and without acknowledgments. It is fast and simple, and the application deals with any loss. DNS, DHCP, VoIP, games and live video use it.' },
          {
            t: 'table',
            head: ['Feature', 'TCP', 'UDP'],
            rows: [
              ['connection', 'yes, handshake', 'no'],
              ['ordering and retransmission', 'yes', 'no'],
              ['overhead', 'larger', 'small'],
              ['examples', 'HTTPS, SSH, email', 'DNS, DHCP, VoIP, games'],
            ],
          },
          { t: 'p', text: '**QUIC** is a modern protocol on top of UDP that combines TCP reliability with TLS 1.3 encryption in a single step. **HTTP/3** runs on it and most large services use it. That is why a company firewall should allow not only TCP 443 but also UDP 443.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q31-1', kind: 'single', q: l('Na jakim porcie domyślnie działa HTTPS?', 'Which port does HTTPS use by default?'), options: [l('80', '80'), l('443', '443'), l('22', '22'), l('8080', '8080')], answer: 1, explain: l('HTTPS to 443 (TCP, a dla HTTP/3 także UDP).', 'HTTPS is 443 (TCP, and UDP for HTTP/3).') },
    { id: 'q31-2', kind: 'order', q: l('Ułóż uzgadnianie TCP.', 'Order the TCP handshake.'), items: [l('SYN', 'SYN'), l('SYN-ACK', 'SYN-ACK'), l('ACK', 'ACK')], explain: l('Klient wysyła SYN, serwer SYN-ACK, klient ACK.', 'Client SYN, server SYN-ACK, client ACK.') },
    { id: 'q31-3', kind: 'single', q: l('Który protokół wybierzesz do rozmów VoIP?', 'Which protocol suits VoIP calls?'), options: [l('TCP', 'TCP'), l('UDP', 'UDP')], answer: 1, explain: l('Spóźniony pakiet głosu jest bezużyteczny, więc retransmisje TCP tylko szkodzą. VoIP używa UDP (RTP).', 'A late voice packet is useless, so TCP retransmissions only hurt. VoIP uses UDP (RTP).') },
    { id: 'q31-4', kind: 'input', q: l('Na jakim porcie działa SSH?', 'Which port does SSH use?'), answer: ['22'], explain: l('SSH to TCP 22.', 'SSH is TCP 22.') },
    { id: 'q31-5', kind: 'single', q: l('Na czym działa HTTP/3?', 'What does HTTP/3 run on?'), options: [l('TCP', 'TCP'), l('QUIC na UDP', 'QUIC over UDP'), l('ICMP', 'ICMP'), l('ARP', 'ARP')], answer: 1, explain: l('HTTP/3 używa QUIC, który działa na UDP 443.', 'HTTP/3 uses QUIC, which runs over UDP 443.') },
    { id: 'q31-6', kind: 'multi', q: l('Które usługi używają UDP? Wybierz wszystkie.', 'Which services use UDP? Select all.'), options: [l('DHCP', 'DHCP'), l('DNS', 'DNS'), l('SSH', 'SSH'), l('NTP', 'NTP')], answer: [0, 1, 3], explain: l('DHCP, DNS (głównie) i NTP to UDP. SSH to TCP.', 'DHCP, DNS (mostly) and NTP use UDP. SSH uses TCP.') },
    { id: 'q31-7', kind: 'single', q: l('Serwer odpowiada na SYN pakietem RST. Co to znaczy?', 'A server answers a SYN with RST. What does it mean?'), options: [l('Połączenie nawiązane', 'Connection established'), l('Na tym porcie nic nie nasłuchuje', 'Nothing listens on that port'), l('Brak trasy', 'No route'), l('Błąd DNS', 'A DNS error')], answer: 1, explain: l('RST na SYN to „połączenie odrzucone”: host żyje, ale usługa nie działa.', 'RST to a SYN means "connection refused": the host is alive but the service is not.') },
    { id: 'q31-8', kind: 'single', q: l('Z jakiego zakresu klient zwykle bierze port źródłowy?', 'Which range does a client usually take its source port from?'), options: [l('0-1023', '0-1023'), l('49152-65535', '49152-65535'), l('Zawsze 80', 'Always 80'), l('Zawsze 443', 'Always 443')], answer: 1, explain: l('Klient używa losowego portu efemerycznego.', 'The client uses a random ephemeral port.') },
  ],
};
