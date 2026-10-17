import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m12: Module = {
  id: 'urzadzenia',
  level: 1,
  icon: 'router',
  minutes: 15,
  title: l('Urządzenia sieciowe w 2026 roku', 'Network devices in 2026'),
  summary: l(
    'Przełącznik, router, punkt dostępowy, zapora, ONT i serwer: co robi każde urządzenie i jak rozpoznać je w symulatorze.',
    'Switch, router, access point, firewall, ONT and server: what each device does and how to spot it in the simulator.',
  ),
  labs: ['pierwsza-siec'],
  games: ['kabel-do-portu'],
  sections: [
    {
      id: 'przelacznik',
      title: l('Przełącznik: serce sieci lokalnej', 'The switch: heart of the LAN'),
      body: {
        pl: [
          { t: 'p', text: '**Przełącznik** (switch) łączy urządzenia w jednej sieci lokalnej. Każde urządzenie dostaje własny port. Przełącznik uczy się, które urządzenie jest za którym portem, i wysyła dane tylko tam, gdzie trzeba. Rozpoznaje urządzenia po adresach **MAC**.' },
          {
            t: 'list',
            items: [
              '**Niezarządzalny**: działa po wyjęciu z pudełka, bez konfiguracji. Dobry do domu.',
              '**Zarządzalny**: ma CLI lub panel, VLAN-y, statystyki i zabezpieczenia. Standard w firmach.',
              '**PoE**: zasila przez kabel sieciowy telefony IP, kamery i punkty dostępowe.',
              '**Multigigabit**: porty 2,5 i 5 Gb/s na zwykłej skrętce, potrzebne dla punktów Wi-Fi 7.',
            ],
          },
          { t: 'callout', kind: 'info', title: 'Ciekawostka historyczna', text: 'Dawniej używano koncentratorów (hubów), które wysyłały wszystko do wszystkich. Dziś nie spotkasz ich w nowych sieciach, dlatego nie ma ich w symulatorze.' },
        ],
        en: [
          { t: 'p', text: 'A **switch** connects devices in one local network. Every device gets its own port. The switch learns which device sits behind which port and sends data only where it is needed. It recognizes devices by their **MAC** addresses.' },
          {
            t: 'list',
            items: [
              '**Unmanaged**: works out of the box with no configuration. Fine for a home.',
              '**Managed**: has a CLI or web panel, VLANs, statistics and security features. Standard in companies.',
              '**PoE**: powers IP phones, cameras and access points over the network cable.',
              '**Multigigabit**: 2.5 and 5 Gb/s ports on regular twisted pair, needed for Wi-Fi 7 access points.',
            ],
          },
          { t: 'callout', kind: 'info', title: 'History note', text: 'Networks used to have hubs that sent everything to everyone. You will not find them in new networks, so they are not in the simulator.' },
        ],
      },
    },
    {
      id: 'router',
      title: l('Router: łączy różne sieci', 'The router: connects different networks'),
      body: {
        pl: [
          { t: 'p', text: '**Router** przekazuje pakiety między różnymi sieciami, np. między siecią domową a internetem albo między oddziałami firmy. Decyzję podejmuje na podstawie **adresu IP** celu i swojej **tablicy routingu**.' },
          {
            t: 'table',
            head: ['Rodzaj', 'Gdzie pracuje', 'Co potrafi'],
            rows: [
              ['router domowy', 'mieszkanie, małe biuro', 'NAT, DHCP, Wi-Fi, prosta zapora, panel w przeglądarce'],
              ['router brzegowy', 'firma, oddział', 'wiele łączy, routing dynamiczny, VPN, listy ACL, CLI'],
              ['router SD-WAN', 'firmy z wieloma oddziałami', 'zarządzanie z chmury, wybór najlepszego łącza dla aplikacji'],
              ['router operatora', 'sieć dostawcy internetu', 'setki gigabitów, BGP, tysiące klientów'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Prosta zasada: przełącznik działa wewnątrz jednej sieci (adresy MAC), a router łączy sieci (adresy IP).' },
        ],
        en: [
          { t: 'p', text: 'A **router** forwards packets between different networks, for example between your home network and the internet, or between company branches. It decides based on the destination **IP address** and its **routing table**.' },
          {
            t: 'table',
            head: ['Type', 'Where it works', 'What it does'],
            rows: [
              ['home router', 'home, small office', 'NAT, DHCP, Wi-Fi, a simple firewall, a web panel'],
              ['edge router', 'company, branch', 'multiple links, dynamic routing, VPN, ACLs, CLI'],
              ['SD-WAN router', 'companies with many branches', 'cloud management, picking the best link per application'],
              ['carrier router', 'internet provider network', 'hundreds of gigabits, BGP, thousands of customers'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Simple rule: a switch works inside one network (MAC addresses) and a router connects networks (IP addresses).' },
        ],
      },
    },
    {
      id: 'wifi',
      title: l('Punkt dostępowy i Wi-Fi', 'Access points and Wi-Fi'),
      body: {
        pl: [
          { t: 'p', text: '**Punkt dostępowy** (AP) wpuszcza urządzenia bezprzewodowe do sieci przewodowej. W domu jest wbudowany w router. W firmie montuje się wiele punktów na suficie, zasilanych przez PoE i zarządzanych centralnie z kontrolera lub chmury.' },
          {
            t: 'list',
            items: [
              '**Wi-Fi 7** (802.11be) to standard nowych urządzeń w 2026 roku: pasma 2,4, 5 i 6 GHz, kanały do 320 MHz i łączenie kilku pasm naraz (MLO).',
              '**Wi-Fi 6 i 6E** wciąż są bardzo popularne i w pełni aktualne.',
              '**Systemy mesh** to kilka współpracujących punktów, które tworzą jedną sieć w dużym domu.',
              'Zabezpieczenie: **WPA3**. WPA2 tylko dla starszych urządzeń, sieć otwarta tylko dla gości z izolacją.',
            ],
          },
        ],
        en: [
          { t: 'p', text: 'An **access point** (AP) lets wireless devices into the wired network. At home it is built into the router. In companies many APs are ceiling-mounted, powered by PoE and managed centrally from a controller or the cloud.' },
          {
            t: 'list',
            items: [
              '**Wi-Fi 7** (802.11be) is the standard for new devices in 2026: 2.4, 5 and 6 GHz bands, channels up to 320 MHz and using several bands at once (MLO).',
              '**Wi-Fi 6 and 6E** are still very common and fully current.',
              '**Mesh systems** are several cooperating access points that create one network in a large home.',
              'Security: **WPA3**. WPA2 only for older devices, open networks only for isolated guests.',
            ],
          },
        ],
      },
    },
    {
      id: 'brzeg',
      title: l('Zapora, ONT, modem i serwer', 'Firewall, ONT, modem and server'),
      body: {
        pl: [
          {
            t: 'terms',
            items: [
              ['Zapora NGFW', 'Zapora nowej generacji dzieli sieć na strefy i przepuszcza tylko dozwolony ruch. Rozpoznaje aplikacje, blokuje ataki (IPS) i pamięta sesje.'],
              ['ONT', 'Terminal światłowodowy od operatora. Zamienia światło w światłowodzie GPON lub XGS-PON na Ethernet dla Twojego routera.'],
              ['Modem kablowy', 'Dostęp do internetu przez sieć telewizji kablowej (DOCSIS 3.1). Wciąż popularny w wielu miastach.'],
              ['Router 5G', 'Internet bezprzewodowy od operatora komórkowego (FWA), dobry tam, gdzie nie ma światłowodu.'],
              ['Serwer', 'Komputer udostępniający usługi: strony WWW, pliki, DNS, DHCP. W firmach często działa w szafie rack albo w chmurze.'],
              ['NAS', 'Domowy lub firmowy serwer plików z dyskami, dostępny przez sieć.'],
            ],
          },
          { t: 'callout', kind: 'warn', text: 'Modemy telefoniczne, ISDN, kable koncentryczne w sieciach LAN i łącza szeregowe to historia. Jeśli znajdziesz je w starym podręczniku, pomiń ten rozdział.' },
        ],
        en: [
          {
            t: 'terms',
            items: [
              ['NGFW firewall', 'A next-generation firewall splits the network into zones and allows only permitted traffic. It recognizes applications, blocks attacks (IPS) and tracks sessions.'],
              ['ONT', 'The operator’s optical terminal. It turns light from GPON or XGS-PON fiber into Ethernet for your router.'],
              ['Cable modem', 'Internet access over the cable TV network (DOCSIS 3.1). Still common in many cities.'],
              ['5G router', 'Wireless internet from a mobile operator (FWA), good where there is no fiber.'],
              ['Server', 'A computer that provides services: websites, files, DNS, DHCP. In companies it often lives in a rack or in the cloud.'],
              ['NAS', 'A home or business file server with disks, reachable over the network.'],
            ],
          },
          { t: 'callout', kind: 'warn', text: 'Dial-up modems, ISDN, coaxial LAN cables and serial links are history. If you find them in an old textbook, skip that chapter.' },
        ],
      },
    },
    {
      id: 'symulator',
      title: l('Jak czytać plansze w PanRouter', 'How to read PanRouter diagrams'),
      body: {
        pl: [
          { t: 'p', text: 'Każde urządzenie w symulatorze ma kafelek w kolorze swojej kategorii: turkusowe routery, niebieskie przełączniki, błękitne punkty Wi-Fi, czerwone zapory, szare urządzenia końcowe i żółty internet.' },
          {
            t: 'table',
            head: ['Dioda przy kablu', 'Znaczenie'],
            rows: [
              ['zielona', 'łącze działa i przesyła dane'],
              ['bursztynowa', 'port zablokowany przez STP, żeby nie było pętli'],
              ['czerwona', 'port wyłączony, kabel niepodłączony z drugiej strony albo brak zasilania'],
            ],
          },
          { t: 'p', text: 'Niebieski kabel to miedziana skrętka, pomarańczowy to światłowód, a przerywana linia oznacza połączenie Wi-Fi.' },
          { t: 'callout', kind: 'tip', text: 'Routery w symulatorze, tak jak prawdziwe routery firmowe, mają porty wyłączone po wyjęciu z pudełka. Trzeba je włączyć poleceniem `no shutdown`.' },
        ],
        en: [
          { t: 'p', text: 'Every device in the simulator has a tile in its category color: teal routers, blue switches, light blue Wi-Fi access points, red firewalls, gray end devices and a yellow internet cloud.' },
          {
            t: 'table',
            head: ['LED next to a cable', 'Meaning'],
            rows: [
              ['green', 'the link works and passes data'],
              ['amber', 'the port is blocked by STP to prevent a loop'],
              ['red', 'the port is shut down, the other end is not connected or there is no power'],
            ],
          },
          { t: 'p', text: 'A blue cable is copper twisted pair, an orange one is fiber and a dashed line is a Wi-Fi connection.' },
          { t: 'callout', kind: 'tip', text: 'Routers in the simulator, like real business routers, ship with their ports shut down. Turn them on with `no shutdown`.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q12-1',
      kind: 'single',
      q: l('Które urządzenie łączy różne sieci i kieruje ruch według adresów IP?', 'Which device connects different networks and forwards traffic by IP address?'),
      options: [l('Przełącznik', 'Switch'), l('Router', 'Router'), l('Punkt dostępowy', 'Access point'), l('ONT', 'ONT')],
      answer: 1,
      explain: l('Router łączy sieci i wybiera drogę pakietu na podstawie adresu IP celu.', 'A router connects networks and picks the path based on the destination IP.'),
    },
    {
      id: 'q12-2',
      kind: 'single',
      q: l('Przełącznik decyduje, gdzie wysłać ramkę, na podstawie:', 'A switch decides where to send a frame based on:'),
      options: [l('adresu MAC', 'the MAC address'), l('nazwy domeny', 'the domain name'), l('numeru portu TCP', 'the TCP port number'), l('adresu publicznego', 'the public address')],
      answer: 0,
      explain: l('Przełącznik działa w warstwie 2 i korzysta z tablicy adresów MAC.', 'A switch works at layer 2 and uses its MAC address table.'),
    },
    {
      id: 'q12-3',
      kind: 'single',
      q: l('Do czego służy ONT u klienta światłowodu?', 'What does the ONT do for a fiber customer?'),
      options: [l('Szyfruje Wi-Fi', 'Encrypts Wi-Fi'), l('Zamienia sygnał świetlny GPON lub XGS-PON na Ethernet', 'Converts GPON or XGS-PON light into Ethernet'), l('Przydziela adresy DHCP w domu', 'Hands out DHCP addresses at home'), l('Jest zaporą sieciową', 'It is a firewall')],
      answer: 1,
      explain: l('ONT to terminal optyczny. Za nim stoi router, który robi NAT, DHCP i Wi-Fi.', 'The ONT is an optical terminal. Behind it sits the router doing NAT, DHCP and Wi-Fi.'),
    },
    {
      id: 'q12-4',
      kind: 'multi',
      q: l('Które urządzenia zwykle zasila się przez PoE? Wybierz wszystkie.', 'Which devices are usually powered by PoE? Select all.'),
      options: [l('Punkt dostępowy Wi-Fi', 'Wi-Fi access point'), l('Kamera IP', 'IP camera'), l('Telefon IP', 'IP phone'), l('Serwer w szafie rack', 'Rack server')],
      answer: [0, 1, 2],
      explain: l('AP, kamery i telefony IP pobierają mało energii, więc kabel sieciowy może je zasilać. Serwer potrzebuje własnego zasilacza.', 'APs, cameras and IP phones use little power, so the network cable can feed them. A server needs its own power supply.'),
    },
    {
      id: 'q12-5',
      kind: 'single',
      q: l('Jakie zabezpieczenie Wi-Fi wybierzesz dla nowej sieci w 2026 roku?', 'Which Wi-Fi security would you pick for a new network in 2026?'),
      options: [l('WEP', 'WEP'), l('Sieć otwarta', 'Open network'), l('WPA3', 'WPA3'), l('Ukrycie SSID', 'Hidden SSID')],
      answer: 2,
      explain: l('WPA3 to aktualny standard. WEP jest złamany, a ukrycie SSID nic nie zabezpiecza.', 'WPA3 is the current standard. WEP is broken and hiding the SSID secures nothing.'),
    },
    {
      id: 'q12-6',
      kind: 'single',
      q: l('Co oznacza czerwona dioda przy kablu w PanRouter?', 'What does a red LED next to a cable mean in PanRouter?'),
      options: [l('Łącze działa poprawnie', 'The link works'), l('Port jest zablokowany przez STP', 'The port is blocked by STP'), l('Port nie działa: jest wyłączony albo nie ma połączenia', 'The port is down: shut down or not connected'), l('Trwa przesyłanie danych', 'Data is being sent')],
      answer: 2,
      explain: l('Czerwona dioda to brak łącza. Często wystarczy włączyć port routera poleceniem no shutdown.', 'Red means no link. Often you just need to enable the router port with no shutdown.'),
    },
    {
      id: 'q12-7',
      kind: 'single',
      q: l('Które urządzenie nie jest już stosowane w nowych sieciach LAN?', 'Which device is no longer used in new LANs?'),
      options: [l('Koncentrator (hub)', 'Hub'), l('Przełącznik zarządzalny', 'Managed switch'), l('Punkt dostępowy Wi-Fi 7', 'Wi-Fi 7 access point'), l('Zapora NGFW', 'NGFW firewall')],
      answer: 0,
      explain: l('Koncentratory wysyłały dane do wszystkich portów i zastąpiły je przełączniki.', 'Hubs sent data to every port and were replaced by switches.'),
    },
    {
      id: 'q12-8',
      kind: 'single',
      q: l('Firma ma 20 oddziałów i chce zarządzać łączami z chmury oraz kierować ruch aplikacji przez najlepsze łącze. Czego szuka?', 'A company with 20 branches wants cloud-managed links that send each app over the best one. What is it looking for?'),
      options: [l('SD-WAN', 'SD-WAN'), l('Koncentrator', 'A hub'), l('Modem ISDN', 'An ISDN modem'), l('Przełącznik niezarządzalny', 'An unmanaged switch')],
      answer: 0,
      explain: l('SD-WAN to routery brzegowe zarządzane centralnie, które wybierają łącze według potrzeb aplikacji.', 'SD-WAN means centrally managed edge routers that pick links per application needs.'),
    },
  ],
};
