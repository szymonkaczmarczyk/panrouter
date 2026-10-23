import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m44: Module = {
  id: 'ipv6',
  level: 4,
  icon: 'globe',
  minutes: 18,
  title: l('IPv6', 'IPv6'),
  summary: l(
    'Adresy 128-bitowe, zapis i skracanie, rodzaje adresów, podsieci /64, SLAAC, NDP zamiast ARP i dual stack.',
    '128-bit addresses, notation and shortening, address types, /64 subnets, SLAAC, NDP instead of ARP and dual stack.',
  ),
  labs: ['ipv6-podstawy', 'ipv6-trasy'],
  games: ['ipv6-kompresor'],
  sections: [
    {
      id: 'zapis',
      title: l('Zapis i skracanie adresu', 'Writing and shortening addresses'),
      body: {
        pl: [
          { t: 'p', text: 'Adres IPv6 ma **128 bitów** zapisanych jako osiem grup po cztery cyfry szesnastkowe. Adresów jest tyle, że każde urządzenie może mieć adres publiczny bez NAT. Duże sieci i operatorzy używają IPv6 na co dzień, a ruch IPv6 to już znaczna część całego ruchu w internecie.' },
          { t: 'figure', id: 'ipv6-address', caption: 'Typowy podział: prefiks od dostawcy, numer podsieci i 64-bitowy identyfikator interfejsu.' },
          {
            t: 'list',
            ordered: true,
            items: ['Usuń zera wiodące w każdej grupie: `0db8` → `db8`, `0000` → `0`.', 'Jeden, najdłuższy ciąg grup samych zer zastąp `::`.', 'Używaj małych liter. `::` może wystąpić tylko raz.'],
          },
          { t: 'code', lines: ['2001:0db8:0000:0000:0000:ff00:0042:8329', '2001:db8:0:0:0:ff00:42:8329', '2001:db8::ff00:42:8329'], caption: 'Ten sam adres w pełnej postaci i po skróceniu zgodnie z RFC 5952.' },
        ],
        en: [
          { t: 'p', text: 'An IPv6 address has **128 bits** written as eight groups of four hex digits. There are so many addresses that every device can have a public address without NAT. Large networks and operators use IPv6 every day, and IPv6 is already a large share of internet traffic.' },
          { t: 'figure', id: 'ipv6-address', caption: 'A typical split: provider prefix, subnet number and a 64-bit interface ID.' },
          {
            t: 'list',
            ordered: true,
            items: ['Drop leading zeros in each group: `0db8` → `db8`, `0000` → `0`.', 'Replace one, the longest, run of all-zero groups with `::`.', 'Use lowercase. `::` may appear only once.'],
          },
          { t: 'code', lines: ['2001:0db8:0000:0000:0000:ff00:0042:8329', '2001:db8:0:0:0:ff00:42:8329', '2001:db8::ff00:42:8329'], caption: 'The same address in full form and shortened per RFC 5952.' },
        ],
      },
    },
    {
      id: 'rodzaje',
      title: l('Rodzaje adresów', 'Address types'),
      body: {
        pl: [
          {
            t: 'table',
            head: ['Prefiks', 'Rodzaj', 'Do czego'],
            rows: [
              ['`2000::/3`', 'globalny unicast (GUA)', 'adresy publiczne w internecie'],
              ['`fc00::/7` (w praktyce `fd00::/8`)', 'unikalny lokalny (ULA)', 'odpowiednik adresów prywatnych'],
              ['`fe80::/10`', 'link-local', 'każdy interfejs ma go zawsze, działa tylko w jednym łączu'],
              ['`ff00::/8`', 'multicast', 'zastępuje rozgłoszenia, których w IPv6 nie ma'],
              ['`::1`', 'pętla zwrotna', 'odpowiednik 127.0.0.1'],
              ['`2001:db8::/32`', 'dokumentacja', 'do przykładów'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Podsieć dla urządzeń końcowych ma prawie zawsze prefiks **/64**. Firma dostaje zwykle /48, czyli 65 536 takich podsieci, a dom /56 lub /64.' },
        ],
        en: [
          {
            t: 'table',
            head: ['Prefix', 'Type', 'Purpose'],
            rows: [
              ['`2000::/3`', 'global unicast (GUA)', 'public addresses on the internet'],
              ['`fc00::/7` (in practice `fd00::/8`)', 'unique local (ULA)', 'the private address counterpart'],
              ['`fe80::/10`', 'link-local', 'every interface always has one, works on one link only'],
              ['`ff00::/8`', 'multicast', 'replaces broadcasts, which IPv6 does not have'],
              ['`::1`', 'loopback', 'like 127.0.0.1'],
              ['`2001:db8::/32`', 'documentation', 'for examples'],
            ],
          },
          { t: 'callout', kind: 'tip', text: 'A subnet for end devices almost always uses a **/64** prefix. A company usually gets a /48, which is 65,536 such subnets, and a home a /56 or /64.' },
        ],
      },
    },
    {
      id: 'konfiguracja',
      title: l('SLAAC, DHCPv6, NDP i dual stack', 'SLAAC, DHCPv6, NDP and dual stack'),
      body: {
        pl: [
          {
            t: 'terms',
            items: [
              ['NDP', 'Neighbor Discovery zastępuje ARP: urządzenia pytają o adres MAC wiadomościami ICMPv6 do grup multicast.'],
              ['RA', 'Router Advertisement: router ogłasza prefiks i bramę. Brama to jego adres link-local.'],
              ['SLAAC', 'Urządzenie samo tworzy adres z prefiksu z RA i losowego identyfikatora (dla prywatności).'],
              ['DHCPv6', 'Serwer przydziela adresy lub tylko dodatkowe dane, np. DNS. Część systemów, m.in. Android, opiera się tylko na SLAAC.'],
              ['Dual stack', 'Urządzenie ma jednocześnie IPv4 i IPv6. To dziś najczęstszy sposób wdrożenia.'],
            ],
          },
          { t: 'code', lines: ['R1(config)# ipv6 unicast-routing', 'R1(config)# interface g0/0/0', 'R1(config-if)# ipv6 address 2001:db8:acad:10::1/64', 'R1(config-if)# exit', 'R1(config)# ipv6 route ::/0 2001:db8:acad:99::1', 'R1# show ipv6 route'], caption: 'Konfiguracja IPv6 na routerze. W symulatorze komputery z SLAAC tworzą identyfikator interfejsu metodą EUI-64 z adresu MAC, tak jak routery i starsze systemy.' },
          { t: 'callout', kind: 'warn', text: 'Brak NAT nie oznacza braku ochrony. Zapora musi blokować nowe połączenia z internetu do urządzeń, tak samo jak w IPv4.' },
        ],
        en: [
          {
            t: 'terms',
            items: [
              ['NDP', 'Neighbor Discovery replaces ARP: devices ask for MAC addresses with ICMPv6 messages to multicast groups.'],
              ['RA', 'Router Advertisement: the router announces the prefix and gateway. The gateway is its link-local address.'],
              ['SLAAC', 'The device builds its own address from the RA prefix and a random identifier (for privacy).'],
              ['DHCPv6', 'A server assigns addresses or just extra data such as DNS. Some systems, including Android, rely on SLAAC only.'],
              ['Dual stack', 'The device has IPv4 and IPv6 at the same time. This is the most common deployment today.'],
            ],
          },
          { t: 'code', lines: ['R1(config)# ipv6 unicast-routing', 'R1(config)# interface g0/0/0', 'R1(config-if)# ipv6 address 2001:db8:acad:10::1/64', 'R1(config-if)# exit', 'R1(config)# ipv6 route ::/0 2001:db8:acad:99::1', 'R1# show ipv6 route'], caption: 'IPv6 router configuration. In the simulator, SLAAC computers build the interface ID with EUI-64 from the MAC address, like routers and older systems do.' },
          { t: 'callout', kind: 'warn', text: 'No NAT does not mean no protection. The firewall must block new connections from the internet to devices, just like with IPv4.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q44-1', kind: 'input', q: l('Ile bitów ma adres IPv6?', 'How many bits does an IPv6 address have?'), answer: ['128'], explain: l('IPv6 ma 128 bitów, IPv4 32.', 'IPv6 has 128 bits, IPv4 has 32.') },
    { id: 'q44-2', kind: 'input', q: l('Skróć 2001:0db8:0000:0000:0000:0000:0000:0001.', 'Shorten 2001:0db8:0000:0000:0000:0000:0000:0001.'), answer: ['2001:db8::1'], explain: l('Usuwasz zera wiodące i zastępujesz ciąg zerowych grup przez ::.', 'Drop leading zeros and replace the zero run with ::.') },
    { id: 'q44-3', kind: 'single', q: l('Który prefiks ma adres link-local?', 'Which prefix does a link-local address use?'), options: [l('fe80::/10', 'fe80::/10'), l('2000::/3', '2000::/3'), l('ff00::/8', 'ff00::/8'), l('fd00::/8', 'fd00::/8')], answer: 0, explain: l('fe80::/10 to link-local, działa tylko w obrębie łącza.', 'fe80::/10 is link-local, valid on one link only.') },
    { id: 'q44-4', kind: 'single', q: l('Co zastępuje ARP w IPv6?', 'What replaces ARP in IPv6?'), options: [l('NDP (ICMPv6)', 'NDP (ICMPv6)'), l('DHCPv6', 'DHCPv6'), l('DNS', 'DNS'), l('Nic', 'Nothing')], answer: 0, explain: l('Neighbor Discovery używa komunikatów ICMPv6.', 'Neighbor Discovery uses ICMPv6 messages.') },
    { id: 'q44-5', kind: 'single', q: l('Jaki prefiks ma typowa podsieć IPv6 dla komputerów?', 'What prefix does a typical IPv6 subnet for computers use?'), options: [l('/24', '/24'), l('/48', '/48'), l('/64', '/64'), l('/128', '/128')], answer: 2, explain: l('/64 jest wymagane m.in. przez SLAAC.', '/64 is required by SLAAC among others.') },
    { id: 'q44-6', kind: 'single', q: l('Czy w IPv6 są rozgłoszenia?', 'Does IPv6 have broadcasts?'), options: [l('Tak', 'Yes'), l('Nie, zastępuje je multicast', 'No, multicast replaces them')], answer: 1, explain: l('IPv6 nie ma rozgłoszeń, używa grup multicast.', 'IPv6 has no broadcast, it uses multicast groups.') },
    { id: 'q44-7', kind: 'single', q: l('Ile razy może wystąpić :: w adresie?', 'How many times can :: appear in an address?'), options: [l('Raz', 'Once'), l('Dwa razy', 'Twice'), l('Dowolnie', 'Any'), l('Wcale', 'Never')], answer: 0, explain: l('Inaczej nie dałoby się ustalić, ile zer kryje każde ::.', 'Otherwise you could not tell how many zeros each :: hides.') },
    { id: 'q44-8', kind: 'single', q: l('Co oznacza dual stack?', 'What does dual stack mean?'), options: [l('Dwa routery', 'Two routers'), l('IPv4 i IPv6 działają jednocześnie', 'IPv4 and IPv6 run at the same time'), l('Dwa adresy MAC', 'Two MAC addresses'), l('Podwójny NAT', 'Double NAT')], answer: 1, explain: l('Urządzenie ma oba stosy protokołów naraz.', 'The device runs both protocol stacks at once.') },
    { id: 'q44-9', kind: 'single', q: l('Router ma adres 2001:db8:10::1/64, ale komputery nie dostają adresów z SLAAC. Czego najpewniej brakuje?', 'A router has 2001:db8:10::1/64, but computers get no SLAAC addresses. What is most likely missing?'), options: [l('ipv6 unicast-routing', 'ipv6 unicast-routing'), l('Serwera DHCPv4', 'A DHCPv4 server'), l('Trasy domyślnej na komputerach', 'A default route on the computers'), l('Rekordu DNS', 'A DNS record')], answer: 0, explain: l('Bez ipv6 unicast-routing router nie wysyła Router Advertisement, więc komputery nie znają prefiksu.', 'Without ipv6 unicast-routing the router sends no Router Advertisements, so computers do not learn the prefix.') },
    { id: 'q44-10', kind: 'single', q: l('Następny skok trasy IPv6 to adres fe80::2. Co jeszcze trzeba podać?', 'An IPv6 route next hop is fe80::2. What else must you specify?'), options: [l('Interfejs wyjściowy', 'The exit interface'), l('Maskę w notacji kropkowej', 'A dotted mask'), l('Numer VLAN', 'A VLAN number'), l('Nic więcej', 'Nothing else')], answer: 0, explain: l('Adres link-local jest unikalny tylko na jednym łączu, więc router musi wiedzieć, przez który interfejs wysłać pakiet.', 'A link-local address is unique only on one link, so the router must know which interface to use.') },
  ],
};
