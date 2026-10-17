import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m41: Module = {
  id: 'uslugi',
  level: 4,
  icon: 'server',
  minutes: 18,
  title: l('DHCP, DNS i NTP w firmie', 'DHCP, DNS and NTP in a company'),
  summary: l(
    'DORA krok po kroku, przekaźnik DHCP, rezerwacje, hierarchia DNS, rekordy, DNS szyfrowany i dlaczego zegar musi być dokładny.',
    'DORA step by step, DHCP relay, reservations, the DNS hierarchy, records, encrypted DNS and why clocks must be accurate.',
  ),
  labs: ['dhcp-przekaznik'],
  games: ['porty-uslugi'],
  sections: [
    {
      id: 'dhcp',
      title: l('DHCP: DORA i przekaźnik', 'DHCP: DORA and relay'),
      body: {
        pl: [
          { t: 'p', text: 'Klient bez adresu przechodzi cztery kroki, w skrócie **DORA**. Discover i Request są rozgłoszeniami, bo klient jeszcze nie ma adresu.' },
          { t: 'figure', id: 'dhcp-dora', caption: 'Discover, Offer, Request, Ack. Po Ack klient ma adres, maskę, bramę i DNS.' },
          { t: 'p', text: 'Rozgłoszenie nie przechodzi przez router, a serwer DHCP zwykle stoi w centralnej sieci serwerów. Dlatego na interfejsie routera lub SVI ustawia się **przekaźnik** (`ip helper-address`). Router zamienia rozgłoszenie na zwykły pakiet do serwera i dopisuje swój adres (giaddr), żeby serwer wybrał właściwą pulę.' },
          { t: 'code', lines: ['R1(config)# ip dhcp excluded-address 192.168.10.1 192.168.10.49', 'R1(config)# ip dhcp pool BIURO', 'R1(dhcp-config)# network 192.168.10.0 255.255.255.0', 'R1(dhcp-config)# default-router 192.168.10.1', 'R1(dhcp-config)# dns-server 192.168.10.10', '', 'R2(config)# interface g0/0/1', 'R2(config-if)# ip helper-address 10.0.0.10'], caption: 'Pula na routerze oraz przekaźnik do serwera DHCP w innej sieci.' },
          { t: 'callout', kind: 'tip', text: 'Drukarkom, kamerom i serwerom dawaj **rezerwacje** (stały adres dla danego MAC) albo adresy statyczne spoza puli. Wyłącz z puli zakres na urządzenia sieciowe.' },
        ],
        en: [
          { t: 'p', text: 'A client without an address goes through four steps, **DORA** for short. Discover and Request are broadcasts because the client has no address yet.' },
          { t: 'figure', id: 'dhcp-dora', caption: 'Discover, Offer, Request, Ack. After Ack the client has an address, mask, gateway and DNS.' },
          { t: 'p', text: 'Broadcasts do not cross routers, and the DHCP server usually lives in a central server network. So the router interface or SVI gets a **relay** (`ip helper-address`). The router turns the broadcast into a normal packet to the server and adds its own address (giaddr) so the server picks the right pool.' },
          { t: 'code', lines: ['R1(config)# ip dhcp excluded-address 192.168.10.1 192.168.10.49', 'R1(config)# ip dhcp pool BIURO', 'R1(dhcp-config)# network 192.168.10.0 255.255.255.0', 'R1(dhcp-config)# default-router 192.168.10.1', 'R1(dhcp-config)# dns-server 192.168.10.10', '', 'R2(config)# interface g0/0/1', 'R2(config-if)# ip helper-address 10.0.0.10'], caption: 'A pool on a router and a relay to a DHCP server in another network.' },
          { t: 'callout', kind: 'tip', text: 'Give printers, cameras and servers **reservations** (a fixed address per MAC) or static addresses outside the pool. Exclude a range for network devices.' },
        ],
      },
    },
    {
      id: 'dns',
      title: l('DNS: hierarchia i rekordy', 'DNS: hierarchy and records'),
      body: {
        pl: [
          { t: 'p', text: 'DNS to rozproszona baza nazw. Komputer pyta **resolver** (np. firmowy lub dostawcy), a ten w razie potrzeby pyta kolejno serwery główne, serwery domeny najwyższego poziomu i serwer domeny docelowej. Odpowiedzi trafiają do pamięci podręcznej na czas **TTL**.' },
          { t: 'figure', id: 'dns-resolution', caption: 'Resolver pyta kolejne poziomy hierarchii i zwraca klientowi gotowy adres.' },
          {
            t: 'table',
            head: ['Rekord', 'Znaczenie', 'Przykład'],
            rows: [
              ['A', 'nazwa na adres IPv4', '`www.przyklad.pl → 198.51.100.80`'],
              ['AAAA', 'nazwa na adres IPv6', '`www → 2001:db8::80`'],
              ['CNAME', 'alias innej nazwy', '`sklep → www.przyklad.pl`'],
              ['MX', 'serwer poczty domeny', '`przyklad.pl → mail.przyklad.pl`'],
              ['TXT', 'tekst, np. SPF i weryfikacje', '`v=spf1 ...`'],
              ['PTR', 'adres na nazwę (odwrotny DNS)', '`80.100.51.198.in-addr.arpa`'],
            ],
          },
          { t: 'callout', kind: 'info', title: 'Prywatność', text: 'Klasyczny DNS idzie jawnym tekstem po UDP 53. **DoH** (DNS po HTTPS) i **DoT** (DNS po TLS, port 853) szyfrują zapytania. Przeglądarki i systemy obsługują je domyślnie, a firmy często wymuszają własny resolver.' },
        ],
        en: [
          { t: 'p', text: 'DNS is a distributed name database. A computer asks a **resolver** (e.g. the company’s or provider’s), which asks the root servers, the top-level domain servers and the target domain’s server as needed. Answers are cached for their **TTL**.' },
          { t: 'figure', id: 'dns-resolution', caption: 'The resolver asks each level of the hierarchy and returns a ready address to the client.' },
          {
            t: 'table',
            head: ['Record', 'Meaning', 'Example'],
            rows: [
              ['A', 'name to IPv4 address', '`www.przyklad.pl → 198.51.100.80`'],
              ['AAAA', 'name to IPv6 address', '`www → 2001:db8::80`'],
              ['CNAME', 'alias of another name', '`shop → www.przyklad.pl`'],
              ['MX', 'the domain’s mail server', '`przyklad.pl → mail.przyklad.pl`'],
              ['TXT', 'text, e.g. SPF and verifications', '`v=spf1 ...`'],
              ['PTR', 'address to name (reverse DNS)', '`80.100.51.198.in-addr.arpa`'],
            ],
          },
          { t: 'callout', kind: 'info', title: 'Privacy', text: 'Classic DNS travels in clear text over UDP 53. **DoH** (DNS over HTTPS) and **DoT** (DNS over TLS, port 853) encrypt queries. Browsers and operating systems support them by default, and companies often enforce their own resolver.' },
        ],
      },
    },
    {
      id: 'ntp',
      title: l('NTP: wspólny czas', 'NTP: shared time'),
      body: {
        pl: [
          { t: 'p', text: 'Zegar wszystkich urządzeń powinien być zsynchronizowany przez **NTP** (UDP 123). Bez tego logi z różnych urządzeń nie dadzą się porównać, certyfikaty TLS mogą wyglądać na nieważne, a logowanie z Kerberosem przestaje działać.' },
          { t: 'list', items: ['Urządzenia pytają lokalny serwer czasu, a on źródła wyższej warstwy (stratum).', 'Ustaw strefę czasową i źródło czasu na każdym routerze i przełączniku.', 'Do logów zbieraj znaczniki czasu z milisekundami.'] },
        ],
        en: [
          { t: 'p', text: 'All device clocks should be synchronized with **NTP** (UDP 123). Without it logs from different devices cannot be correlated, TLS certificates may look invalid and Kerberos logins stop working.' },
          { t: 'list', items: ['Devices ask a local time server, which asks higher stratum sources.', 'Set the time zone and time source on every router and switch.', 'Collect timestamps with milliseconds in logs.'] },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q41-1', kind: 'order', q: l('Ułóż komunikaty DHCP w kolejności.', 'Order the DHCP messages.'), items: [l('Discover', 'Discover'), l('Offer', 'Offer'), l('Request', 'Request'), l('Ack', 'Ack')], explain: l('DORA: Discover, Offer, Request, Ack.', 'DORA: Discover, Offer, Request, Ack.') },
    { id: 'q41-2', kind: 'single', q: l('Serwer DHCP jest w innej podsieci niż klienci. Co ustawiasz na routerze?', 'The DHCP server is in a different subnet than clients. What do you set on the router?'), options: [l('ip helper-address', 'ip helper-address'), l('ip nat inside', 'ip nat inside'), l('ip routing', 'ip routing'), l('switchport trunk', 'switchport trunk')], answer: 0, explain: l('Przekaźnik DHCP przenosi rozgłoszenia klientów do serwera jako zwykłe pakiety.', 'The DHCP relay carries client broadcasts to the server as normal packets.') },
    { id: 'q41-3', kind: 'single', q: l('Który rekord DNS wskazuje serwer poczty domeny?', 'Which DNS record points to the domain’s mail server?'), options: [l('A', 'A'), l('MX', 'MX'), l('CNAME', 'CNAME'), l('PTR', 'PTR')], answer: 1, explain: l('MX (mail exchanger) wskazuje serwery pocztowe.', 'MX (mail exchanger) points to mail servers.') },
    { id: 'q41-4', kind: 'single', q: l('Rekord AAAA zawiera:', 'An AAAA record holds:'), options: [l('adres IPv4', 'an IPv4 address'), l('adres IPv6', 'an IPv6 address'), l('alias', 'an alias'), l('tekst', 'text')], answer: 1, explain: l('A to IPv4, AAAA to IPv6.', 'A is IPv4, AAAA is IPv6.') },
    { id: 'q41-5', kind: 'input', q: l('Na jakim porcie UDP działa NTP?', 'Which UDP port does NTP use?'), answer: ['123'], explain: l('NTP to UDP 123.', 'NTP is UDP 123.') },
    { id: 'q41-6', kind: 'single', q: l('Po co giaddr w przekazanym zapytaniu DHCP?', 'Why is giaddr in a relayed DHCP request?'), options: [l('Żeby serwer wybrał pulę dla sieci klienta', 'So the server picks the pool for the client’s network'), l('To hasło do serwera', 'It is a server password'), l('To adres DNS', 'It is the DNS address'), l('To adres MAC klienta', 'It is the client MAC')], answer: 0, explain: l('Router wpisuje adres swojego interfejsu po stronie klienta. Serwer dopasowuje do niego pulę.', 'The router puts its client-facing interface address there. The server matches a pool to it.') },
    { id: 'q41-7', kind: 'multi', q: l('Co szyfruje zapytania DNS? Wybierz wszystkie.', 'What encrypts DNS queries? Select all.'), options: [l('DoH', 'DoH'), l('DoT', 'DoT'), l('Zwykły DNS na UDP 53', 'Plain DNS on UDP 53'), l('Rekord PTR', 'A PTR record')], answer: [0, 1], explain: l('DoH i DoT szyfrują zapytania. Klasyczny DNS jest jawny.', 'DoH and DoT encrypt queries. Classic DNS is in clear text.') },
    { id: 'q41-8', kind: 'single', q: l('Dlaczego drukarce lepiej dać rezerwację DHCP?', 'Why give a printer a DHCP reservation?'), options: [l('Żeby zawsze miała ten sam adres', 'So it always has the same address'), l('Żeby drukowała szybciej', 'To print faster'), l('Żeby miała publiczny adres', 'To get a public address'), l('Bo drukarki nie obsługują DHCP', 'Printers do not support DHCP')], answer: 0, explain: l('Komputery łączą się z drukarką po adresie, więc ten nie powinien się zmieniać.', 'Computers reach the printer by address, so it should not change.') },
  ],
};
