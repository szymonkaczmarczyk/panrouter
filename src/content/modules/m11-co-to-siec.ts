import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m11: Module = {
  id: 'co-to-siec',
  level: 1,
  icon: 'network',
  minutes: 12,
  title: l('Czym jest sieć komputerowa', 'What a computer network is'),
  summary: l(
    'Urządzenia, które ze sobą rozmawiają: LAN, Wi-Fi, WAN i internet, role klienta i serwera oraz jednostki prędkości.',
    'Devices that talk to each other: LAN, Wi-Fi, WAN and the internet, client and server roles, and speed units.',
  ),
  labs: ['pierwsza-siec'],
  games: ['kabel-do-portu'],
  sections: [
    {
      id: 'rozmowa',
      title: l('Sieć to rozmowa urządzeń', 'A network is devices talking'),
      body: {
        pl: [
          { t: 'p', text: 'Sieć komputerowa to co najmniej dwa urządzenia połączone tak, żeby mogły wymieniać dane. Połączeniem może być kabel, światłowód albo fale radiowe Wi-Fi. Urządzenia nazywamy **węzłami**, a połączenia **łączami**.' },
          { t: 'p', text: 'Sieć masz w domu: telefon, laptop, telewizor i drukarka łączą się z routerem. Sieć ma szkoła, sklep i szpital. Internet to z kolei ogromna sieć sieci: miliony takich małych sieci połączonych przez operatorów telekomunikacyjnych.' },
          { t: 'figure', id: 'lan-wan', caption: 'Dwie sieci lokalne (LAN) połączone przez sieć rozległą (WAN), np. internet.' },
          { t: 'h', text: 'Po co nam sieć?' },
          {
            t: 'list',
            items: [
              '**Dostęp do usług**: strony WWW, poczta, wideo, gry, bankowość.',
              '**Współdzielenie zasobów**: jedna drukarka, jeden serwer plików, jedno łącze do internetu dla wielu osób.',
              '**Komunikacja**: komunikatory, rozmowy wideo, telefony IP w biurze.',
              '**Sterowanie urządzeniami**: kamery, czujniki, oświetlenie, maszyny w fabryce.',
            ],
          },
          { t: 'callout', kind: 'tip', title: 'Zapamiętaj', text: 'Każda sieć ma trzy składniki: urządzenia, połączenia między nimi i wspólne zasady rozmowy, czyli **protokoły**.' },
        ],
        en: [
          { t: 'p', text: 'A computer network is at least two devices connected so they can exchange data. The connection can be a cable, fiber or Wi-Fi radio waves. Devices are called **nodes** and connections are called **links**.' },
          { t: 'p', text: 'You have a network at home: a phone, a laptop, a TV and a printer connect to a router. Schools, shops and hospitals have networks too. The internet is a giant network of networks: millions of small networks connected by telecom operators.' },
          { t: 'figure', id: 'lan-wan', caption: 'Two local networks (LANs) connected through a wide area network (WAN), such as the internet.' },
          { t: 'h', text: 'Why do we need networks?' },
          {
            t: 'list',
            items: [
              '**Access to services**: websites, email, video, games, banking.',
              '**Sharing resources**: one printer, one file server, one internet connection for many people.',
              '**Communication**: messengers, video calls, IP phones in the office.',
              '**Controlling devices**: cameras, sensors, lighting, factory machines.',
            ],
          },
          { t: 'callout', kind: 'tip', title: 'Remember', text: 'Every network has three ingredients: devices, the links between them and shared rules of conversation called **protocols**.' },
        ],
      },
    },
    {
      id: 'rodzaje',
      title: l('LAN, WLAN, WAN i internet', 'LAN, WLAN, WAN and the internet'),
      body: {
        pl: [
          { t: 'p', text: 'Sieci dzielimy według zasięgu. Ten podział pomaga zrozumieć, kto za co odpowiada i jakich urządzeń się używa.' },
          {
            t: 'table',
            head: ['Skrót', 'Nazwa', 'Zasięg i przykład'],
            rows: [
              ['**PAN**', 'sieć osobista', 'kilka metrów: słuchawki Bluetooth, zegarek z telefonem'],
              ['**LAN**', 'sieć lokalna', 'mieszkanie, biuro, szkoła: komputery podłączone kablem do przełącznika'],
              ['**WLAN**', 'bezprzewodowa sieć lokalna', 'to samo co LAN, ale przez Wi-Fi'],
              ['**MAN**', 'sieć miejska', 'światłowody łączące budynki uczelni w mieście'],
              ['**WAN**', 'sieć rozległa', 'łącza między miastami i krajami, sieci operatorów, internet'],
            ],
          },
          { t: 'p', text: 'LAN zwykle należy do Ciebie albo Twojej firmy i zarządzasz nim samodzielnie. WAN najczęściej dzierżawisz od operatora: kupujesz usługę dostępu do internetu albo łącze między oddziałami.' },
          { t: 'callout', kind: 'info', text: 'Internet nie ma jednego właściciela. Tworzą go tysiące niezależnych sieci operatorów, które wymieniają się ruchem w punktach wymiany i łączami podmorskimi.' },
        ],
        en: [
          { t: 'p', text: 'We group networks by reach. This helps you understand who is responsible for what and which devices are used.' },
          {
            t: 'table',
            head: ['Abbreviation', 'Name', 'Reach and example'],
            rows: [
              ['**PAN**', 'personal area network', 'a few meters: Bluetooth headphones, a watch paired with a phone'],
              ['**LAN**', 'local area network', 'a home, office or school: computers cabled to a switch'],
              ['**WLAN**', 'wireless LAN', 'the same as a LAN, but over Wi-Fi'],
              ['**MAN**', 'metropolitan area network', 'fiber linking university buildings across a city'],
              ['**WAN**', 'wide area network', 'links between cities and countries, carrier networks, the internet'],
            ],
          },
          { t: 'p', text: 'A LAN usually belongs to you or your company and you manage it yourself. A WAN is usually leased from an operator: you buy internet access or a link between branch offices.' },
          { t: 'callout', kind: 'info', text: 'Nobody owns the internet. It is made of thousands of independent operator networks that exchange traffic at exchange points and over undersea cables.' },
        ],
      },
    },
    {
      id: 'role',
      title: l('Klient, serwer i peer-to-peer', 'Client, server and peer-to-peer'),
      body: {
        pl: [
          { t: 'p', text: 'Urządzenia w sieci pełnią różne role. **Klient** prosi o dane, a **serwer** je udostępnia. Gdy otwierasz stronę, Twoja przeglądarka jest klientem, a komputer firmy w centrum danych lub w chmurze jest serwerem.' },
          { t: 'figure', id: 'client-server', caption: 'Klient wysyła żądanie, serwer odpowiada. Tak działa większość usług w internecie.' },
          { t: 'p', text: 'W modelu **peer-to-peer** (P2P) każde urządzenie może być jednocześnie klientem i serwerem. Tak działają niektóre gry, wymiana plików czy połączenia wideo, w których dane płyną bezpośrednio między uczestnikami.' },
          {
            t: 'list',
            items: [
              'Serwer to rola, a nie wygląd. Laptop z włączonym udostępnianiem plików też jest serwerem.',
              'Duże usługi działają na wielu serwerach naraz, często w kilku centrach danych.',
              'Jedno urządzenie może mieć wiele ról: router domowy jest też serwerem DHCP i punktem dostępowym Wi-Fi.',
            ],
          },
        ],
        en: [
          { t: 'p', text: 'Devices on a network play different roles. A **client** asks for data and a **server** provides it. When you open a website, your browser is the client and a company machine in a data center or the cloud is the server.' },
          { t: 'figure', id: 'client-server', caption: 'The client sends a request and the server answers. Most internet services work this way.' },
          { t: 'p', text: 'In **peer-to-peer** (P2P) every device can be a client and a server at the same time. Some games, file sharing and video calls work like this, with data flowing directly between participants.' },
          {
            t: 'list',
            items: [
              'A server is a role, not a look. A laptop sharing files is also a server.',
              'Large services run on many servers at once, often in several data centers.',
              'One device can have many roles: a home router is also a DHCP server and a Wi-Fi access point.',
            ],
          },
        ],
      },
    },
    {
      id: 'jednostki',
      title: l('Bity, bajty i prędkość łącza', 'Bits, bytes and link speed'),
      body: {
        pl: [
          { t: 'p', text: 'Prędkość sieci mierzymy w **bitach na sekundę**. Rozmiar pliku podajemy zwykle w **bajtach**. Jeden bajt to 8 bitów, więc te liczby różnią się mniej więcej ośmiokrotnie.' },
          {
            t: 'table',
            head: ['Zapis', 'Znaczenie', 'Gdzie go zobaczysz'],
            rows: [
              ['`1 Gb/s`', 'miliard bitów na sekundę', 'prędkość portu, pakiet internetu'],
              ['`125 MB/s`', '125 milionów bajtów na sekundę', 'tyle teoretycznie da łącze 1 Gb/s przy pobieraniu pliku'],
              ['`10 GbE`', 'Ethernet 10 Gb/s', 'serwery, połączenia między przełącznikami'],
              ['`20 ms`', 'opóźnienie w milisekundach', 'wynik polecenia ping'],
            ],
          },
          { t: 'p', text: 'Oprócz przepustowości liczy się **opóźnienie** (latencja), czyli czas podróży pakietu, oraz jego wahania (**jitter**). Do gier i rozmów wideo ważniejsze jest małe opóźnienie niż ogromna przepustowość.' },
          { t: 'callout', kind: 'tip', title: 'Szybki rachunek', text: 'Plik 1 GB to 8 Gb. Przez łącze 1 Gb/s pobierzesz go najszybciej w około 8 sekund. W praktyce trochę dłużej, bo część pojemności zajmują nagłówki protokołów.' },
        ],
        en: [
          { t: 'p', text: 'Network speed is measured in **bits per second**. File sizes are usually given in **bytes**. One byte is 8 bits, so the numbers differ by roughly eight times.' },
          {
            t: 'table',
            head: ['Notation', 'Meaning', 'Where you see it'],
            rows: [
              ['`1 Gb/s`', 'one billion bits per second', 'port speed, internet plan'],
              ['`125 MB/s`', '125 million bytes per second', 'the theoretical file download rate over 1 Gb/s'],
              ['`10 GbE`', '10 Gb/s Ethernet', 'servers, links between switches'],
              ['`20 ms`', 'delay in milliseconds', 'the result of the ping command'],
            ],
          },
          { t: 'p', text: 'Besides bandwidth, **latency** matters: how long a packet travels, and its variation (**jitter**). For games and video calls low latency matters more than huge bandwidth.' },
          { t: 'callout', kind: 'tip', title: 'Quick math', text: 'A 1 GB file is 8 Gb. Over a 1 Gb/s link it takes at least about 8 seconds. In practice a bit longer, because protocol headers take part of the capacity.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q11-1',
      kind: 'single',
      q: l('Co jest niezbędne, żeby powstała sieć komputerowa?', 'What is required to form a computer network?'),
      options: [l('Dostęp do internetu', 'Internet access'), l('Co najmniej dwa urządzenia połączone tak, by wymieniać dane', 'At least two devices connected so they can exchange data'), l('Router domowy', 'A home router'), l('Kabel światłowodowy', 'A fiber cable')],
      answer: 1,
      explain: l('Sieć to połączone urządzenia, które wymieniają dane. Internet, router czy światłowód nie są konieczne: dwa komputery połączone kablem też tworzą sieć.', 'A network is connected devices exchanging data. Internet, a router or fiber are optional: two computers on one cable are a network too.'),
    },
    {
      id: 'q11-2',
      kind: 'single',
      q: l('Jak nazywa się sieć obejmująca jedno biuro lub mieszkanie?', 'What do you call a network that covers one office or home?'),
      options: [l('WAN', 'WAN'), l('MAN', 'MAN'), l('LAN', 'LAN'), l('PAN', 'PAN')],
      answer: 2,
      explain: l('LAN (Local Area Network) to sieć lokalna w obrębie budynku lub mieszkania.', 'A LAN (Local Area Network) covers a building or a home.'),
    },
    {
      id: 'q11-3',
      kind: 'single',
      q: l('Przeglądarka otwiera stronę z serwera. Jaką rolę pełni przeglądarka?', 'A browser opens a page from a server. What role does the browser play?'),
      options: [l('Serwera', 'Server'), l('Klienta', 'Client'), l('Routera', 'Router'), l('Punktu dostępowego', 'Access point')],
      answer: 1,
      explain: l('Klient wysyła żądanie, a serwer odpowiada. Przeglądarka prosi o stronę, więc jest klientem.', 'The client sends a request and the server answers. The browser asks for the page, so it is the client.'),
    },
    {
      id: 'q11-4',
      kind: 'input',
      q: l('Ile bitów ma jeden bajt?', 'How many bits are in one byte?'),
      answer: ['8'],
      placeholder: '8',
      explain: l('Bajt to 8 bitów. Dlatego 1 Gb/s to teoretycznie 125 MB/s.', 'A byte is 8 bits. That is why 1 Gb/s is about 125 MB/s in theory.'),
    },
    {
      id: 'q11-5',
      kind: 'single',
      q: l('Które zdanie o internecie jest prawdziwe?', 'Which statement about the internet is true?'),
      options: [
        l('Należy do jednej międzynarodowej firmy', 'It belongs to one international company'),
        l('To sieć sieci tworzona przez wielu niezależnych operatorów', 'It is a network of networks run by many independent operators'),
        l('Działa wyłącznie przez satelity', 'It works only via satellites'),
        l('To inna nazwa sieci LAN', 'It is another name for a LAN'),
      ],
      answer: 1,
      explain: l('Internet tworzą tysiące niezależnych sieci, które wymieniają się ruchem.', 'The internet is made of thousands of independent networks exchanging traffic.'),
    },
    {
      id: 'q11-6',
      kind: 'multi',
      q: l('Które przykłady to sieci bezprzewodowe lub osobiste? Wybierz wszystkie.', 'Which examples are wireless or personal networks? Select all.'),
      options: [l('Słuchawki Bluetooth z telefonem', 'Bluetooth headphones with a phone'), l('Laptop połączony z routerem przez Wi-Fi', 'A laptop connected to a router over Wi-Fi'), l('Dwa miasta połączone światłowodem operatora', 'Two cities connected by carrier fiber'), l('Komputer podłączony kablem do przełącznika', 'A computer cabled to a switch')],
      answer: [0, 1],
      explain: l('Bluetooth to PAN, a Wi-Fi to WLAN. Łącze między miastami to WAN, a kabel do przełącznika to przewodowy LAN.', 'Bluetooth is a PAN and Wi-Fi is a WLAN. A link between cities is a WAN and a cable to a switch is a wired LAN.'),
    },
    {
      id: 'q11-7',
      kind: 'single',
      q: l('Do rozmowy wideo najważniejsze jest:', 'For a video call the most important thing is:'),
      options: [l('Bardzo duży rozmiar plików', 'Very large file sizes'), l('Małe i stabilne opóźnienie', 'Low and stable latency'), l('Kabel Cat8', 'A Cat8 cable'), l('Publiczny adres IP', 'A public IP address')],
      answer: 1,
      explain: l('Rozmowa na żywo wymaga szybkiej i równej dostawy pakietów, czyli małej latencji i małego jittera.', 'Live calls need fast and even packet delivery: low latency and low jitter.'),
    },
    {
      id: 'q11-8',
      kind: 'single',
      q: l('Jak nazywamy wspólne zasady, według których urządzenia wymieniają dane?', 'What are the shared rules devices use to exchange data called?'),
      options: [l('Sterowniki', 'Drivers'), l('Protokoły', 'Protocols'), l('Topologie', 'Topologies'), l('Pakiety', 'Packets')],
      answer: 1,
      explain: l('Protokół określa format i kolejność komunikatów, np. HTTP, IP czy Ethernet.', 'A protocol defines the format and order of messages, such as HTTP, IP or Ethernet.'),
    },
  ],
};
