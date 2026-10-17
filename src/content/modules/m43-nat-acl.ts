import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m43: Module = {
  id: 'nat-acl',
  level: 4,
  icon: 'shield',
  minutes: 22,
  title: l('NAT, listy ACL i zapory NGFW', 'NAT, ACLs and NGFW firewalls'),
  summary: l(
    'Translacja adresów statyczna i PAT, listy kontroli dostępu standardowe i rozszerzone, maski odwrotne oraz zapory stanowe ze strefami.',
    'Static and PAT address translation, standard and extended access lists, wildcard masks and stateful zone-based firewalls.',
  ),
  labs: ['nat', 'acl', 'zapora'],
  games: ['detektyw-sieci'],
  sections: [
    {
      id: 'nat',
      title: l('NAT i PAT', 'NAT and PAT'),
      body: {
        pl: [
          { t: 'p', text: '**NAT** zamienia adresy prywatne na publiczne na granicy sieci. Router oznacza interfejsy jako `inside` (LAN) i `outside` (internet) i prowadzi **tablicę translacji**, żeby odpowiedź trafiła do właściwego komputera.' },
          { t: 'figure', id: 'nat-pat', caption: 'PAT: wiele komputerów wychodzi pod jednym adresem, rozróżnianych numerami portów.' },
          {
            t: 'terms',
            items: [
              ['NAT statyczny', 'jeden adres wewnętrzny na stałe zamieniany na jeden publiczny, np. serwer WWW dostępny z internetu'],
              ['PAT (overload)', 'cała sieć za jednym adresem publicznym, rozróżniana portami, tak działa każdy router domowy'],
              ['CGNAT', 'NAT po stronie operatora, gdy klienci dostają adresy 100.64.0.0/10'],
            ],
          },
          { t: 'code', lines: ['R1(config)# access-list 1 permit 192.168.10.0 0.0.0.255', 'R1(config)# interface g0/0/0', 'R1(config-if)# ip nat inside', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ip nat outside', 'R1(config)# ip nat inside source list 1 interface g0/0/1 overload', 'R1# show ip nat translations'], caption: 'PAT na routerze: lista ACL wskazuje, kogo tłumaczyć.' },
          { t: 'callout', kind: 'info', text: 'NAT nie jest zaporą. Ukrywa adresy, ale bezpieczeństwo zapewniają reguły filtrowania. W IPv6 NAT zwykle nie jest potrzebny, a zapora zostaje.' },
        ],
        en: [
          { t: 'p', text: '**NAT** translates private addresses to public ones at the network edge. The router marks interfaces as `inside` (LAN) and `outside` (internet) and keeps a **translation table** so replies reach the right computer.' },
          { t: 'figure', id: 'nat-pat', caption: 'PAT: many computers go out under one address, told apart by port numbers.' },
          {
            t: 'terms',
            items: [
              ['Static NAT', 'one inside address permanently mapped to one public address, e.g. a web server reachable from the internet'],
              ['PAT (overload)', 'a whole network behind one public address, told apart by ports, which is how every home router works'],
              ['CGNAT', 'NAT on the operator side when customers get 100.64.0.0/10 addresses'],
            ],
          },
          { t: 'code', lines: ['R1(config)# access-list 1 permit 192.168.10.0 0.0.0.255', 'R1(config)# interface g0/0/0', 'R1(config-if)# ip nat inside', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ip nat outside', 'R1(config)# ip nat inside source list 1 interface g0/0/1 overload', 'R1# show ip nat translations'], caption: 'PAT on a router: the ACL selects who gets translated.' },
          { t: 'callout', kind: 'info', text: 'NAT is not a firewall. It hides addresses, but filtering rules provide security. IPv6 usually does not need NAT, but it keeps the firewall.' },
        ],
      },
    },
    {
      id: 'acl',
      title: l('Listy kontroli dostępu (ACL)', 'Access control lists (ACLs)'),
      body: {
        pl: [
          { t: 'p', text: 'ACL to lista reguł `permit` i `deny` sprawdzanych **od góry**. Pierwsza pasująca reguła decyduje. Na końcu każdej listy jest niewidoczne **deny any**, więc lista z samymi deny blokuje wszystko.' },
          {
            t: 'table',
            head: ['Rodzaj', 'Numery', 'Co sprawdza', 'Gdzie stawiać'],
            rows: [
              ['standardowa', '1-99', 'tylko adres źródłowy', 'blisko celu'],
              ['rozszerzona', '100-199 lub nazwa', 'protokół, źródło, cel, porty', 'blisko źródła'],
            ],
          },
          { t: 'code', lines: ['R1(config)# ip access-list extended SERWERY', 'R1(config-ext-nacl)# permit tcp 192.168.10.0 0.0.0.255 host 10.0.0.10 eq 443', 'R1(config-ext-nacl)# deny icmp any host 10.0.0.10 echo', 'R1(config-ext-nacl)# permit ip any any', 'R1(config)# interface g0/0/0', 'R1(config-if)# ip access-group SERWERY in', 'R1# show access-lists'], caption: 'Biuro może otwierać stronę serwera, ale nikt go nie spinguje. Reszta ruchu przechodzi.' },
          { t: 'callout', kind: 'tip', text: 'Maska odwrotna: 0 = ten bit musi się zgadzać, 1 = dowolny. `host 10.0.0.10` to skrót od `10.0.0.10 0.0.0.0`, a `any` od `0.0.0.0 255.255.255.255`.' },
        ],
        en: [
          { t: 'p', text: 'An ACL is a list of `permit` and `deny` rules checked **from the top**. The first match decides. Every list ends with an invisible **deny any**, so a list with only deny rules blocks everything.' },
          {
            t: 'table',
            head: ['Type', 'Numbers', 'What it checks', 'Where to place'],
            rows: [
              ['standard', '1-99', 'source address only', 'close to the destination'],
              ['extended', '100-199 or a name', 'protocol, source, destination, ports', 'close to the source'],
            ],
          },
          { t: 'code', lines: ['R1(config)# ip access-list extended SERWERY', 'R1(config-ext-nacl)# permit tcp 192.168.10.0 0.0.0.255 host 10.0.0.10 eq 443', 'R1(config-ext-nacl)# deny icmp any host 10.0.0.10 echo', 'R1(config-ext-nacl)# permit ip any any', 'R1(config)# interface g0/0/0', 'R1(config-if)# ip access-group SERWERY in', 'R1# show access-lists'], caption: 'The office can open the server’s site, but nobody can ping it. Other traffic passes.' },
          { t: 'callout', kind: 'tip', text: 'Wildcard: 0 = this bit must match, 1 = any. `host 10.0.0.10` is short for `10.0.0.10 0.0.0.0` and `any` for `0.0.0.0 255.255.255.255`.' },
        ],
      },
    },
    {
      id: 'ngfw',
      title: l('Zapory stanowe i NGFW', 'Stateful firewalls and NGFWs'),
      body: {
        pl: [
          { t: 'p', text: 'Zwykła lista ACL patrzy na każdy pakiet osobno. **Zapora stanowa** pamięta sesje: jeśli komputer z sieci wewnętrznej zaczął połączenie, odpowiedź wraca automatycznie, a nowe połączenia z internetu do środka są domyślnie blokowane.' },
          {
            t: 'list',
            items: [
              '**Strefy**: inside (pracownicy), DMZ (serwery publiczne), outside (internet). Reguły opisują ruch między strefami.',
              '**Aplikacje zamiast portów**: NGFW rozpoznaje aplikację, nawet gdy działa na porcie 443.',
              '**IPS**: wykrywa i blokuje znane ataki i złośliwe oprogramowanie.',
              '**Tożsamość**: reguły dla grup użytkowników, nie tylko adresów IP.',
              '**Inspekcja TLS**: opcjonalne odszyfrowanie ruchu w firmie, zgodne z polityką i prawem.',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Zasada najmniejszych uprawnień: domyślnie blokuj, a zezwalaj tylko na to, czego biznes naprawdę potrzebuje.' },
        ],
        en: [
          { t: 'p', text: 'A plain ACL looks at each packet separately. A **stateful firewall** remembers sessions: if an inside computer started a connection, the reply returns automatically, and new connections from the internet inward are blocked by default.' },
          {
            t: 'list',
            items: [
              '**Zones**: inside (staff), DMZ (public servers), outside (internet). Rules describe traffic between zones.',
              '**Applications instead of ports**: an NGFW recognizes the app even when it runs on port 443.',
              '**IPS**: detects and blocks known attacks and malware.',
              '**Identity**: rules for user groups, not just IP addresses.',
              '**TLS inspection**: optional decryption of company traffic, in line with policy and law.',
            ],
          },
          { t: 'callout', kind: 'tip', text: 'Least privilege: block by default and allow only what the business really needs.' },
        ],
      },
    },
  ],
  quiz: [
    { id: 'q43-1', kind: 'single', q: l('Jak nazywa się NAT, w którym cała sieć wychodzi pod jednym adresem?', 'What is NAT called when a whole network goes out under one address?'), options: [l('NAT statyczny', 'Static NAT'), l('PAT (overload)', 'PAT (overload)'), l('DNS', 'DNS'), l('VLAN', 'VLAN')], answer: 1, explain: l('PAT rozróżnia połączenia numerami portów.', 'PAT tells connections apart by port numbers.') },
    { id: 'q43-2', kind: 'single', q: l('Co jest na końcu każdej listy ACL?', 'What sits at the end of every ACL?'), options: [l('permit any', 'permit any'), l('Niewidoczne deny any', 'An invisible deny any'), l('Nic', 'Nothing'), l('Reguła NAT', 'A NAT rule')], answer: 1, explain: l('Ruch niepasujący do żadnej reguły jest odrzucany.', 'Traffic matching no rule is dropped.') },
    { id: 'q43-3', kind: 'single', q: l('Gdzie stawiasz rozszerzoną listę ACL?', 'Where do you place an extended ACL?'), options: [l('Blisko źródła', 'Close to the source'), l('Blisko celu', 'Close to the destination'), l('Zawsze na routerze brzegowym', 'Always on the edge router'), l('Na przełączniku L2', 'On an L2 switch')], answer: 0, explain: l('Rozszerzona ACL jest precyzyjna, więc odrzuca niechciany ruch jak najwcześniej.', 'An extended ACL is precise, so it drops unwanted traffic as early as possible.') },
    { id: 'q43-4', kind: 'input', q: l('Jak skrócić 10.0.0.10 0.0.0.0 w ACL?', 'How do you shorten 10.0.0.10 0.0.0.0 in an ACL?'), answer: ['host 10.0.0.10'], explain: l('Słowo host oznacza dokładnie jeden adres.', 'The host keyword means exactly one address.') },
    { id: 'q43-5', kind: 'single', q: l('Czym różni się zapora stanowa od zwykłej ACL?', 'How does a stateful firewall differ from a plain ACL?'), options: [l('Pamięta sesje i wpuszcza odpowiedzi', 'It remembers sessions and lets replies in'), l('Jest wolniejsza', 'It is slower'), l('Działa tylko na IPv6', 'It works only on IPv6'), l('Nie ma reguł', 'It has no rules')], answer: 0, explain: l('Zapora stanowa śledzi połączenia, więc nie potrzebujesz reguły dla każdej odpowiedzi.', 'A stateful firewall tracks connections, so you do not need a rule for every reply.') },
    { id: 'q43-6', kind: 'single', q: l('Serwer WWW firmy ma być dostępny z internetu. Gdzie go umieścisz?', 'The company web server must be reachable from the internet. Where do you put it?'), options: [l('W strefie DMZ', 'In the DMZ'), l('W sieci pracowników', 'In the staff network'), l('Za NAT bez reguł', 'Behind NAT with no rules'), l('W VLAN gości', 'In the guest VLAN')], answer: 0, explain: l('DMZ oddziela serwery publiczne od sieci wewnętrznej.', 'A DMZ separates public servers from the internal network.') },
    { id: 'q43-7', kind: 'single', q: l('Interfejs w stronę internetu na routerze z PAT oznaczasz jako:', 'On a PAT router the internet-facing interface is marked as:'), options: [l('ip nat inside', 'ip nat inside'), l('ip nat outside', 'ip nat outside'), l('ip helper-address', 'ip helper-address'), l('passive-interface', 'passive-interface')], answer: 1, explain: l('Strona LAN to inside, strona internetu to outside.', 'The LAN side is inside and the internet side is outside.') },
    { id: 'q43-8', kind: 'single', q: l('Lista: deny tcp any host 10.0.0.5 eq 80, a dalej nic. Co się stanie z pingiem do 10.0.0.5?', 'ACL: deny tcp any host 10.0.0.5 eq 80 and nothing else. What happens to a ping to 10.0.0.5?'), options: [l('Przejdzie', 'It passes'), l('Zostanie odrzucony przez niewidoczne deny any', 'It is dropped by the implicit deny any')], answer: 1, explain: l('Ping nie pasuje do reguły TCP i trafia na końcowe deny any. Potrzebujesz permit ip any any.', 'Ping does not match the TCP rule and hits the final deny any. You need permit ip any any.') },
  ],
};
