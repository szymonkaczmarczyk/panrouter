import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m53: Module = {
  id: 'bezpieczenstwo',
  level: 5,
  icon: 'shieldCheck',
  minutes: 22,
  title: l('Bezpieczeństwo sieci i Zero Trust', 'Network security and Zero Trust'),
  summary: l(
    'Segmentacja, zabezpieczenie przełączników, bezpieczne zarządzanie przez SSH, VPN IPsec i WireGuard, ZTNA i SASE.',
    'Segmentation, switch hardening, secure management over SSH, IPsec and WireGuard VPNs, ZTNA and SASE.',
  ),
  labs: ['ssh', 'zapora'],
  games: ['detektyw-sieci'],
  sections: [
    {
      id: 'segmentacja',
      title: l('Segmentacja i warstwa dostępu', 'Segmentation and the access layer'),
      body: {
        pl: [
          { t: 'p', text: 'Płaska sieć, w której wszyscy widzą wszystkich, pozwala zagrożeniu rozlać się w minutach. **Segmentacja** dzieli sieć na strefy z kontrolą ruchu między nimi: użytkownicy, serwery, kamery, drukarki, goście, systemy produkcyjne. Mikrosegmentacja idzie dalej: reguły nawet między pojedynczymi serwerami.' },
          {
            t: 'terms',
            items: [
              ['802.1X i NAC', 'port przełącznika działa dopiero po uwierzytelnieniu urządzenia, a serwer przypisuje mu właściwy VLAN'],
              ['Port security', 'limit adresów MAC na porcie, przydatny tam, gdzie nie ma 802.1X'],
              ['DHCP snooping', 'odrzuca odpowiedzi DHCP z portów, za którymi nie ma prawdziwego serwera'],
              ['Dynamic ARP Inspection', 'blokuje fałszywe odpowiedzi ARP na podstawie tablicy DHCP snooping'],
              ['Wyłączone nieużywane porty', 'port w nieużywanym VLAN-ie i w stanie shutdown nie wpuści nikogo'],
            ],
          },
        ],
        en: [
          { t: 'p', text: 'A flat network where everyone sees everyone lets a threat spread in minutes. **Segmentation** splits the network into zones with controlled traffic between them: users, servers, cameras, printers, guests, production systems. Microsegmentation goes further: rules even between individual servers.' },
          {
            t: 'terms',
            items: [
              ['802.1X and NAC', 'a switch port works only after the device authenticates, and the server assigns the right VLAN'],
              ['Port security', 'a MAC address limit per port, useful where 802.1X is not available'],
              ['DHCP snooping', 'drops DHCP replies from ports with no real server behind them'],
              ['Dynamic ARP Inspection', 'blocks forged ARP replies using the DHCP snooping table'],
              ['Disabled unused ports', 'a port in an unused VLAN and shut down lets nobody in'],
            ],
          },
        ],
      },
    },
    {
      id: 'zarzadzanie',
      title: l('Bezpieczne zarządzanie urządzeniami', 'Secure device management'),
      body: {
        pl: [
          { t: 'p', text: 'Router z hasłem „cisco” i włączonym Telnetem to zaproszenie dla napastnika. Telnet przesyła hasła jawnym tekstem. Standard to **SSH** z kontami lokalnymi lub centralnym uwierzytelnianiem (TACACS+, RADIUS) i MFA.' },
          {
            t: 'code',
            lines: [
              'R1(config)# hostname R1',
              'R1(config)# ip domain-name firma.lan',
              'R1(config)# crypto key generate rsa modulus 3072',
              'R1(config)# ip ssh version 2',
              'R1(config)# username admin secret Dlugie-Haslo-2026!',
              'R1(config)# enable secret Inne-Dlugie-Haslo!',
              'R1(config)# service password-encryption',
              'R1(config)# line vty 0 4',
              'R1(config-line)# login local',
              'R1(config-line)# transport input ssh',
              'R1(config-line)# exec-timeout 5 0',
            ],
            caption: 'Minimum dla każdego urządzenia: SSH v2, konta z secret, brak Telnetu i automatyczne wylogowanie.',
          },
          { t: 'callout', kind: 'tip', text: '`secret` zapisuje skrót hasła, a `password` jawny tekst. Zawsze używaj `secret`. Dostęp do zarządzania ogranicz listą ACL do sieci administratorów.' },
        ],
        en: [
          { t: 'p', text: 'A router with password "cisco" and Telnet enabled invites attackers. Telnet sends passwords in clear text. The standard is **SSH** with local accounts or central authentication (TACACS+, RADIUS) plus MFA.' },
          {
            t: 'code',
            lines: [
              'R1(config)# hostname R1',
              'R1(config)# ip domain-name firma.lan',
              'R1(config)# crypto key generate rsa modulus 3072',
              'R1(config)# ip ssh version 2',
              'R1(config)# username admin secret Dlugie-Haslo-2026!',
              'R1(config)# enable secret Inne-Dlugie-Haslo!',
              'R1(config)# service password-encryption',
              'R1(config)# line vty 0 4',
              'R1(config-line)# login local',
              'R1(config-line)# transport input ssh',
              'R1(config-line)# exec-timeout 5 0',
            ],
            caption: 'The minimum for every device: SSH v2, secret-based accounts, no Telnet and automatic logout.',
          },
          { t: 'callout', kind: 'tip', text: '`secret` stores a password hash while `password` stores clear text. Always use `secret`. Restrict management access with an ACL to the admin network.' },
        ],
      },
    },
    {
      id: 'vpn-zt',
      title: l('VPN, Zero Trust i SASE', 'VPN, Zero Trust and SASE'),
      body: {
        pl: [
          {
            t: 'table',
            head: ['Technologia', 'Do czego', 'Uwagi'],
            rows: [
              ['IPsec site-to-site', 'stały tunel między oddziałami', 'IKEv2, AES-GCM, standard w routerach i zaporach'],
              ['WireGuard', 'nowoczesny, prosty VPN', 'UDP 51820, mały kod, szybki, w jądrze Linuksa'],
              ['VPN zdalnego dostępu', 'pracownik w domu do sieci firmy', 'daje dostęp do całej sieci, co bywa ryzykowne'],
              ['**ZTNA**', 'dostęp do konkretnych aplikacji', 'sprawdza użytkownika i urządzenie przy każdym połączeniu'],
            ],
          },
          { t: 'figure', id: 'zero-trust', caption: 'Zero Trust: lokalizacja w sieci nie daje zaufania. Liczy się tożsamość, stan urządzenia i najmniejsze uprawnienia.' },
          { t: 'p', text: '**SASE** łączy sieć (SD-WAN) i bezpieczeństwo (zapora w chmurze, ZTNA, filtrowanie WWW, CASB) w jedną usługę dostarczaną z chmury blisko użytkownika. Dobrze pasuje do pracy zdalnej i firm z wieloma oddziałami.' },
          { t: 'callout', kind: 'warn', title: 'Etyka', text: 'Wiedzę o zabezpieczeniach stosuj tylko we własnych sieciach albo za pisemną zgodą właściciela. Skanowanie i testowanie cudzych systemów bez zgody jest w Polsce przestępstwem.' },
        ],
        en: [
          {
            t: 'table',
            head: ['Technology', 'Purpose', 'Notes'],
            rows: [
              ['IPsec site-to-site', 'a permanent tunnel between branches', 'IKEv2, AES-GCM, standard on routers and firewalls'],
              ['WireGuard', 'a modern, simple VPN', 'UDP 51820, small codebase, fast, in the Linux kernel'],
              ['Remote access VPN', 'a home worker into the company network', 'grants access to the whole network, which can be risky'],
              ['**ZTNA**', 'access to specific applications', 'checks the user and device on every connection'],
            ],
          },
          { t: 'figure', id: 'zero-trust', caption: 'Zero Trust: network location grants no trust. Identity, device posture and least privilege matter.' },
          { t: 'p', text: '**SASE** combines networking (SD-WAN) and security (cloud firewall, ZTNA, web filtering, CASB) into one cloud-delivered service close to the user. It fits remote work and companies with many branches.' },
          { t: 'callout', kind: 'warn', title: 'Ethics', text: 'Use security knowledge only on your own networks or with the owner’s written permission. Scanning and testing other people’s systems without consent is a crime in Poland and most countries.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q53-1', kind: 'single', q: l('Dlaczego Telnet jest niebezpieczny?', 'Why is Telnet dangerous?'), options: [l('Przesyła hasła jawnym tekstem', 'It sends passwords in clear text'), l('Jest za wolny', 'It is too slow'), l('Nie działa na IPv4', 'It does not work on IPv4'), l('Wymaga PoE', 'It needs PoE')], answer: 0, explain: l('Każdy, kto podsłucha ruch, zobaczy login i hasło. Używaj SSH.', 'Anyone sniffing traffic sees the login and password. Use SSH.') },
    { id: 'q53-2', kind: 'input', q: l('Jakie polecenie w line vty pozwala tylko na SSH?', 'Which line vty command allows SSH only?'), answer: ['transport input ssh'], explain: l('transport input ssh blokuje Telnet na liniach zdalnych.', 'transport input ssh blocks Telnet on remote lines.') },
    { id: 'q53-3', kind: 'single', q: l('Co chroni przed fałszywym serwerem DHCP w sieci?', 'What protects against a rogue DHCP server?'), options: [l('DHCP snooping', 'DHCP snooping'), l('OSPF', 'OSPF'), l('NAT', 'NAT'), l('LACP', 'LACP')], answer: 0, explain: l('DHCP snooping przepuszcza odpowiedzi DHCP tylko z zaufanych portów.', 'DHCP snooping allows DHCP replies only from trusted ports.') },
    { id: 'q53-4', kind: 'single', q: l('Na czym polega Zero Trust?', 'What is Zero Trust about?'), options: [l('Ufamy wszystkim w sieci LAN', 'Trust everyone on the LAN'), l('Każde połączenie jest sprawdzane: tożsamość, urządzenie, uprawnienia', 'Every connection is checked: identity, device, permissions'), l('Wyłączamy internet', 'Turn off the internet'), l('Używamy tylko Wi-Fi', 'Use only Wi-Fi')], answer: 1, explain: l('Miejsce w sieci nie daje zaufania. Dostęp jest minimalny i stale weryfikowany.', 'Network location grants no trust. Access is minimal and continuously verified.') },
    { id: 'q53-5', kind: 'single', q: l('Na jakim porcie domyślnie działa WireGuard?', 'Which port does WireGuard use by default?'), options: [l('UDP 51820', 'UDP 51820'), l('TCP 22', 'TCP 22'), l('UDP 500', 'UDP 500'), l('TCP 443', 'TCP 443')], answer: 0, explain: l('WireGuard używa UDP 51820. IPsec używa UDP 500 i 4500.', 'WireGuard uses UDP 51820. IPsec uses UDP 500 and 4500.') },
    { id: 'q53-6', kind: 'single', q: l('Czym różni się ZTNA od klasycznego VPN?', 'How does ZTNA differ from a classic VPN?'), options: [l('Daje dostęp do konkretnych aplikacji, a nie całej sieci', 'It grants access to specific apps, not the whole network'), l('Jest zawsze wolniejsze', 'It is always slower'), l('Nie szyfruje', 'It does not encrypt'), l('Działa tylko w LAN', 'It works only on the LAN')], answer: 0, explain: l('ZTNA ogranicza dostęp do potrzebnych aplikacji i sprawdza każde połączenie.', 'ZTNA limits access to needed apps and checks every connection.') },
    { id: 'q53-7', kind: 'multi', q: l('Co należy do minimum bezpieczeństwa routera? Wybierz wszystkie.', 'What belongs to a router’s security baseline? Select all.'), options: [l('SSH v2', 'SSH v2'), l('enable secret', 'enable secret'), l('Telnet z hasłem cisco', 'Telnet with password cisco'), l('Automatyczne wylogowanie (exec-timeout)', 'Automatic logout (exec-timeout)')], answer: [0, 1, 3], explain: l('SSH, hasła jako skróty i wylogowanie to podstawa. Telnet i domyślne hasła nigdy.', 'SSH, hashed secrets and timeouts are basics. Never Telnet or default passwords.') },
    { id: 'q53-8', kind: 'single', q: l('Czy możesz skanować porty serwera sąsiedniej firmy, żeby ćwiczyć?', 'May you scan a neighboring company’s server ports for practice?'), options: [l('Tak, jeśli jest w internecie', 'Yes, if it is on the internet'), l('Nie, tylko własne systemy albo za pisemną zgodą', 'No, only your own systems or with written permission')], answer: 1, explain: l('Ćwicz w laboratorium i na własnym sprzęcie. Bez zgody to łamanie prawa.', 'Practice in labs and on your own gear. Without consent it breaks the law.') },
  ],
};
