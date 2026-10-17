import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m14: Module = {
  id: 'adresy-start',
  level: 1,
  icon: 'globe',
  minutes: 15,
  title: l('Adres IP, MAC, DHCP i DNS w prostych słowach', 'IP, MAC, DHCP and DNS in plain words'),
  summary: l(
    'Skąd urządzenie wie, dokąd wysłać dane: adresy MAC i IP, brama domyślna, automatyczna konfiguracja i nazwy domen.',
    'How a device knows where to send data: MAC and IP addresses, the default gateway, automatic configuration and domain names.',
  ),
  labs: ['siec-domowa'],
  games: ['binarny-sprint'],
  sections: [
    {
      id: 'mac',
      title: l('Adres MAC: numer karty sieciowej', 'MAC address: the network card’s number'),
      body: {
        pl: [
          { t: 'p', text: 'Każda karta sieciowa ma **adres MAC**: 48 bitów zapisanych jako 12 cyfr szesnastkowych, np. `02:a0:c9:00:00:1f`. Pierwsza połowa zwykle wskazuje producenta. Adres MAC działa tylko w obrębie jednej sieci lokalnej, router go nie przenosi dalej.' },
          { t: 'p', text: 'Przełącznik używa adresów MAC, żeby wiedzieć, za którym portem jest dane urządzenie. Dla ludzi ważniejszy jest adres IP, ale bez MAC ramka nie dotrze do sąsiada w sieci.' },
          { t: 'callout', kind: 'info', title: 'Prywatność w 2026', text: 'Telefony i laptopy domyślnie używają losowego adresu MAC dla każdej sieci Wi-Fi. Dzięki temu trudniej śledzić urządzenie między kawiarnią a lotniskiem. W firmie może to utrudniać przypisanie urządzenia do użytkownika.' },
        ],
        en: [
          { t: 'p', text: 'Every network card has a **MAC address**: 48 bits written as 12 hexadecimal digits, e.g. `02:a0:c9:00:00:1f`. The first half usually identifies the vendor. A MAC address works only inside one local network, a router does not carry it further.' },
          { t: 'p', text: 'A switch uses MAC addresses to know which port a device sits behind. People care more about the IP address, but without the MAC a frame will not reach a neighbor on the network.' },
          { t: 'callout', kind: 'info', title: 'Privacy in 2026', text: 'Phones and laptops use a random MAC address for each Wi-Fi network by default. This makes it harder to track a device from a café to an airport. In companies it can make mapping devices to users harder.' },
        ],
      },
    },
    {
      id: 'ip',
      title: l('Adres IP i brama domyślna', 'IP address and default gateway'),
      body: {
        pl: [
          { t: 'p', text: '**Adres IP** działa jak adres pocztowy. Wersja IPv4 ma cztery liczby od 0 do 255, np. `192.168.1.100`. **Maska podsieci** (np. `255.255.255.0`, krócej `/24`) mówi, która część adresu oznacza sieć, a która konkretne urządzenie.' },
          {
            t: 'table',
            head: ['Ustawienie', 'Przykład', 'Do czego służy'],
            rows: [
              ['adres IP', '`192.168.1.100`', 'identyfikuje komputer'],
              ['maska', '`255.255.255.0` (/24)', 'wszystkie adresy 192.168.1.x to moja sieć'],
              ['brama domyślna', '`192.168.1.1`', 'tu wysyłam pakiety do innych sieci, np. do internetu'],
              ['serwer DNS', '`192.168.1.1`', 'tu pytam o adresy nazw, np. www.przyklad.pl'],
            ],
          },
          { t: 'p', text: 'Jeśli cel jest w tej samej sieci, komputer wysyła dane bezpośrednio. Jeśli nie, oddaje pakiet **bramie domyślnej**, czyli routerowi. To najczęstsza przyczyna problemów: dobry adres, ale zła lub pusta brama.' },
          { t: 'callout', kind: 'tip', text: 'Adresy `10.x.x.x`, `172.16-31.x.x` i `192.168.x.x` są **prywatne**. Działają w Twojej sieci, ale w internecie trzeba je zamienić na adres publiczny.' },
        ],
        en: [
          { t: 'p', text: 'An **IP address** works like a postal address. IPv4 has four numbers from 0 to 255, e.g. `192.168.1.100`. The **subnet mask** (e.g. `255.255.255.0`, short `/24`) says which part of the address is the network and which is the device.' },
          {
            t: 'table',
            head: ['Setting', 'Example', 'What it is for'],
            rows: [
              ['IP address', '`192.168.1.100`', 'identifies the computer'],
              ['mask', '`255.255.255.0` (/24)', 'all 192.168.1.x addresses are my network'],
              ['default gateway', '`192.168.1.1`', 'where I send packets for other networks, e.g. the internet'],
              ['DNS server', '`192.168.1.1`', 'where I ask for the address of names like www.przyklad.pl'],
            ],
          },
          { t: 'p', text: 'If the destination is on the same network, the computer sends data directly. If not, it hands the packet to the **default gateway**, the router. This is the most common cause of trouble: a good address but a wrong or empty gateway.' },
          { t: 'callout', kind: 'tip', text: 'Addresses `10.x.x.x`, `172.16-31.x.x` and `192.168.x.x` are **private**. They work in your network, but on the internet they must be translated to a public address.' },
        ],
      },
    },
    {
      id: 'dhcp-dns',
      title: l('DHCP i DNS: automaty sieci', 'DHCP and DNS: the network’s autopilots'),
      body: {
        pl: [
          { t: 'p', text: 'Nikt nie wpisuje ręcznie adresu w telefonie. Robi to **DHCP**: po podłączeniu urządzenie woła „czy jest tu serwer DHCP?”, a router odpowiada gotową konfiguracją: adres, maska, brama i DNS na określony czas (dzierżawa).' },
          { t: 'p', text: '**DNS** to książka telefoniczna internetu. Ludzie pamiętają nazwy, a komputery potrzebują adresów IP. Przed otwarciem `www.przyklad.pl` komputer pyta serwer DNS o adres i dopiero wtedy łączy się z serwerem WWW.' },
          { t: 'figure', id: 'home-network', caption: 'Router domowy przydziela adresy przez DHCP i ukrywa całą sieć za jednym adresem publicznym (NAT).' },
          { t: 'callout', kind: 'warn', title: 'Adres 169.254.x.x', text: 'Jeśli komputer ma adres zaczynający się od 169.254, serwer DHCP nie odpowiedział i system nadał sobie adres awaryjny (APIPA). Sprawdź kabel, Wi-Fi i to, czy w sieci działa DHCP.' },
        ],
        en: [
          { t: 'p', text: 'Nobody types an address into a phone by hand. **DHCP** does it: once connected, the device calls out "is there a DHCP server here?" and the router replies with a ready configuration: address, mask, gateway and DNS for a set time (a lease).' },
          { t: 'p', text: '**DNS** is the internet’s phone book. People remember names but computers need IP addresses. Before opening `www.przyklad.pl` the computer asks a DNS server for the address and only then connects to the web server.' },
          { t: 'figure', id: 'home-network', caption: 'A home router hands out addresses via DHCP and hides the whole network behind one public address (NAT).' },
          { t: 'callout', kind: 'warn', title: 'The 169.254.x.x address', text: 'If a computer has an address starting with 169.254, no DHCP server answered and the system gave itself a fallback address (APIPA). Check the cable, Wi-Fi and whether DHCP runs on the network.' },
        ],
      },
    },
    {
      id: 'polecenia',
      title: l('Pierwsze polecenia: ipconfig i ping', 'First commands: ipconfig and ping'),
      body: {
        pl: [
          { t: 'p', text: 'W wierszu poleceń każdego komputera w symulatorze sprawdzisz konfigurację i łączność. To te same polecenia, których używa się w prawdziwych systemach.' },
          {
            t: 'code',
            lines: ['C:\\Users\\PC1> ipconfig', '   Adres IPv4. . . . . . . . . . . . : 192.168.1.100', '   Maska podsieci. . . . . . . . . . : 255.255.255.0', '   Brama domyślna. . . . . . . . . . : 192.168.1.1', '', 'C:\\Users\\PC1> ping 192.168.1.1', 'Odpowiedź z 192.168.1.1: bajtów=32 czas<1 ms TTL=255'],
            caption: 'ipconfig pokazuje ustawienia, a ping sprawdza, czy cel odpowiada.',
          },
          {
            t: 'list',
            ordered: true,
            items: [
              '`ipconfig` albo `ipconfig /all`: czy mam adres, maskę, bramę i DNS?',
              '`ping` do bramy: czy działa moja sieć lokalna?',
              '`ping` do adresu w internecie: czy działa routing i NAT?',
              '`ping` do nazwy, np. `ping www.przyklad.pl`: czy działa DNS?',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Ta kolejność to podstawa diagnozowania: zaczynasz od siebie i idziesz krok po kroku coraz dalej.' },
        ],
        en: [
          { t: 'p', text: 'In the command prompt of every computer in the simulator you can check settings and connectivity. These are the same commands used on real systems.' },
          {
            t: 'code',
            lines: ['C:\\Users\\PC1> ipconfig', '   IPv4 Address. . . . . . . . . . . : 192.168.1.100', '   Subnet Mask . . . . . . . . . . . : 255.255.255.0', '   Default Gateway . . . . . . . . . : 192.168.1.1', '', 'C:\\Users\\PC1> ping 192.168.1.1', 'Reply from 192.168.1.1: bytes=32 time<1ms TTL=255'],
            caption: 'ipconfig shows the settings and ping checks whether the target answers.',
          },
          {
            t: 'list',
            ordered: true,
            items: [
              '`ipconfig` or `ipconfig /all`: do I have an address, mask, gateway and DNS?',
              '`ping` the gateway: does my local network work?',
              '`ping` an internet address: do routing and NAT work?',
              '`ping` a name, e.g. `ping www.przyklad.pl`: does DNS work?',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'This order is the core of troubleshooting: start with yourself and move further one step at a time.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q14-1',
      kind: 'single',
      q: l('Ile bitów ma adres MAC?', 'How many bits does a MAC address have?'),
      options: [l('32', '32'), l('48', '48'), l('64', '64'), l('128', '128')],
      answer: 1,
      explain: l('MAC ma 48 bitów, czyli 12 cyfr szesnastkowych. IPv4 ma 32 bity, a IPv6 128.', 'A MAC has 48 bits, 12 hex digits. IPv4 has 32 bits and IPv6 has 128.'),
    },
    {
      id: 'q14-2',
      kind: 'single',
      q: l('Komputer chce wysłać pakiet do serwera w internecie. Komu go oddaje?', 'A computer wants to send a packet to an internet server. Who does it hand it to?'),
      options: [l('Serwerowi DNS', 'The DNS server'), l('Bramie domyślnej', 'The default gateway'), l('Przełącznikowi jako celowi', 'The switch as the destination'), l('Wysyła bezpośrednio do serwera', 'It sends directly to the server')],
      answer: 1,
      explain: l('Cel spoza własnej sieci zawsze trafia najpierw do bramy domyślnej, czyli routera.', 'A destination outside your own network always goes to the default gateway, the router, first.'),
    },
    {
      id: 'q14-3',
      kind: 'single',
      q: l('Laptop ma adres 169.254.12.7. Co to oznacza?', 'A laptop has address 169.254.12.7. What does it mean?'),
      options: [l('Ma publiczny adres', 'It has a public address'), l('Serwer DHCP nie odpowiedział', 'No DHCP server answered'), l('Jest podłączony do Wi-Fi 7', 'It is on Wi-Fi 7'), l('Działa jako serwer DNS', 'It acts as a DNS server')],
      answer: 1,
      explain: l('169.254.0.0/16 to adresy APIPA nadawane, gdy DHCP milczy.', '169.254.0.0/16 are APIPA addresses assigned when DHCP is silent.'),
    },
    {
      id: 'q14-4',
      kind: 'single',
      q: l('Do czego służy DNS?', 'What is DNS for?'),
      options: [l('Zamienia nazwy domen na adresy IP', 'It turns domain names into IP addresses'), l('Przydziela adresy IP', 'It assigns IP addresses'), l('Szyfruje Wi-Fi', 'It encrypts Wi-Fi'), l('Łączy dwie sieci', 'It connects two networks')],
      answer: 0,
      explain: l('DNS tłumaczy nazwy na adresy. Adresy przydziela DHCP.', 'DNS translates names into addresses. DHCP assigns addresses.'),
    },
    {
      id: 'q14-5',
      kind: 'multi',
      q: l('Które adresy są prywatne? Wybierz wszystkie.', 'Which addresses are private? Select all.'),
      options: [l('10.20.30.40', '10.20.30.40'), l('172.20.1.1', '172.20.1.1'), l('192.168.0.50', '192.168.0.50'), l('8.8.8.8', '8.8.8.8')],
      answer: [0, 1, 2],
      explain: l('Prywatne zakresy to 10.0.0.0/8, 172.16.0.0/12 i 192.168.0.0/16. 8.8.8.8 to adres publiczny.', 'Private ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. 8.8.8.8 is public.'),
    },
    {
      id: 'q14-6',
      kind: 'order',
      q: l('Ułóż kroki diagnozy od najbliższego do najdalszego.', 'Order the troubleshooting steps from nearest to farthest.'),
      items: [l('ipconfig: sprawdź własne ustawienia', 'ipconfig: check your own settings'), l('ping do bramy domyślnej', 'ping the default gateway'), l('ping do adresu IP w internecie', 'ping an internet IP address'), l('ping do nazwy domeny', 'ping a domain name')],
      explain: l('Idziesz od siebie na zewnątrz: konfiguracja, sieć lokalna, routing, a na końcu DNS.', 'Work outward: configuration, local network, routing and finally DNS.'),
    },
    {
      id: 'q14-7',
      kind: 'single',
      q: l('Co przekazuje router domowy dzięki DHCP?', 'What does a home router hand out through DHCP?'),
      options: [l('Tylko hasło Wi-Fi', 'Only the Wi-Fi password'), l('Adres, maskę, bramę i DNS na czas dzierżawy', 'Address, mask, gateway and DNS for the lease time'), l('Adres MAC', 'A MAC address'), l('Certyfikat HTTPS', 'An HTTPS certificate')],
      answer: 1,
      explain: l('DHCP daje kompletną konfigurację IP na określony czas.', 'DHCP gives a full IP configuration for a limited time.'),
    },
    {
      id: 'q14-8',
      kind: 'input',
      q: l('Zapisz maskę 255.255.255.0 w skrócie CIDR (np. /16).', 'Write the mask 255.255.255.0 in CIDR notation (e.g. /16).'),
      answer: ['/24', '24'],
      placeholder: '/24',
      explain: l('Maska ma 24 jedynki: trzy pełne oktety po 8 bitów.', 'The mask has 24 ones: three full octets of 8 bits.'),
    },
  ],
};
