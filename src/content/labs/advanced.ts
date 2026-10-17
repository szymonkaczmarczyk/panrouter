import { l } from '../../i18n/l10n';
import { NetBuilder } from '../../sim/builder';
import type { Lab } from '../types';
import { check, vifIs } from './basic';

export const ADVANCED_LABS: Lab[] = [
  {
    id: 'dhcp-przekaznik',
    level: 4,
    minutes: 20,
    title: l('Serwer DHCP i przekaźnik', 'DHCP server and relay'),
    summary: l('Jeden serwer DHCP obsługuje dwie sieci. Druga sieć dostaje adresy przez ip helper-address.', 'One DHCP server serves two networks. The second gets addresses through ip helper-address.'),
    goals: [l('Tworzyć pule DHCP', 'Create DHCP pools'), l('Konfigurować przekaźnik DHCP', 'Configure a DHCP relay')],
    steps: {
      pl: [
        { t: 'list', ordered: true, items: ['Na SRV1, w zakładce **Usługi**, dodaj pulę `LAN10`: sieć 192.168.10.0/24, brama 192.168.10.1, DNS 192.168.10.10.', 'Wyłącz z przydziału adresy 192.168.10.1 - 192.168.10.20.', 'Dodaj pulę `LAN20`: sieć 192.168.20.0/24, brama 192.168.20.1, DNS 192.168.10.10.', 'Na R1 ustaw na Gi0/0/1 przekaźnik: `ip helper-address 192.168.10.10`.', 'Komputery z DHCP pobiorą adresy same po każdej zmianie. Możesz też wpisać `ipconfig /renew`.'] },
      ],
      en: [
        { t: 'list', ordered: true, items: ['On SRV1, **Services** tab, add pool `LAN10`: network 192.168.10.0/24, gateway 192.168.10.1, DNS 192.168.10.10.', 'Exclude addresses 192.168.10.1 - 192.168.10.20.', 'Add pool `LAN20`: network 192.168.20.0/24, gateway 192.168.20.1, DNS 192.168.10.10.', 'On R1 set a relay on Gi0/0/1: `ip helper-address 192.168.10.10`.', 'DHCP computers fetch addresses automatically after each change. You can also run `ipconfig /renew`.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 380, 100);
      const sw1 = b.add('switch', 'SW1', 200, 250);
      const sw2 = b.add('switch', 'SW2', 560, 250);
      const srv = b.add('server', 'SRV1', 80, 400);
      const pc1 = b.add('pc', 'PC1', 220, 420);
      const pc2 = b.add('pc', 'PC2', 340, 400);
      const pc3 = b.add('pc', 'PC3', 560, 420);
      b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r1, 'Gi0/0/1', sw2, 'Gi1/0/24');
      b.link(srv, 'eth0', sw1, 'Gi1/0/10').link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw1, 'Gi1/0/2').link(pc3, 'eth0', sw2, 'Gi1/0/1');
      b.ip(r1, 'Gi0/0/0', '192.168.10.1/24').ip(r1, 'Gi0/0/1', '192.168.20.1/24');
      b.host(srv, '192.168.10.10/24', '192.168.10.1');
      srv.services.dhcp = true;
      return b.net;
    },
    checks: [
      check('c1', ['SRV1 ma pulę dla 192.168.10.0/24 z bramą .1', 'SRV1 has a pool for 192.168.10.0/24 with gateway .1'], ['Usługi na SRV1, sekcja DHCP.', 'Services on SRV1, DHCP section.'], (c) => Boolean(c.device('SRV1')?.dhcpPools.some((p) => p.network === '192.168.10.0' && p.prefix === 24 && p.router === '192.168.10.1'))),
      check('c2', ['SRV1 ma pulę dla 192.168.20.0/24 z bramą .1', 'SRV1 has a pool for 192.168.20.0/24 with gateway .1'], ['Druga pula na serwerze.', 'A second pool on the server.'], (c) => Boolean(c.device('SRV1')?.dhcpPools.some((p) => p.network === '192.168.20.0' && p.prefix === 24 && p.router === '192.168.20.1'))),
      check('c3', ['R1 przekazuje DHCP z Gi0/0/1 do SRV1', 'R1 relays DHCP from Gi0/0/1 to SRV1'], ['ip helper-address na interfejsie sieci klientów.', 'ip helper-address on the client network interface.'], (c) => c.port('R1', 'Gi0/0/1')?.helper === '192.168.10.10'),
      check('c4', ['PC1 ma adres z puli LAN10 spoza wyłączeń', 'PC1 has a LAN10 address outside the exclusions'], ['Dodaj wyłączenie .1-.20 przed przydziałem.', 'Add the .1-.20 exclusion before leasing.'], (c) => {
        const ip = c.port('PC1', 'eth0')?.ip ?? '';
        return c.inSubnet(ip, '192.168.10.0/24') && Number(ip.split('.')[3]) > 20;
      }),
      check('c5', ['PC3 ma adres z 192.168.20.0/24', 'PC3 has an address in 192.168.20.0/24'], ['Bez przekaźnika DHCP PC3 ma adres 169.254.x.x.', 'Without the relay PC3 has 169.254.x.x.'], (c) => c.inSubnet(c.port('PC3', 'eth0')?.ip ?? '', '192.168.20.0/24')),
      check('c6', ['PC3 pinguje SRV1', 'PC3 pings SRV1'], ['Brama z DHCP musi być poprawna.', 'The DHCP gateway must be correct.'], (c) => c.ping('PC3', '192.168.10.10')),
    ],
  },
  {
    id: 'ospf',
    level: 4,
    minutes: 20,
    title: l('OSPF w trójkącie routerów', 'OSPF in a router triangle'),
    summary: l('Włącz OSPF na trzech routerach, ogłoś sieci LAN i obejrzyj sąsiedztwa.', 'Enable OSPF on three routers, advertise the LANs and inspect adjacencies.'),
    goals: [l('Konfigurować router ospf i network', 'Configure router ospf and network'), l('Używać passive-interface', 'Use passive-interface')],
    steps: {
      pl: [
        { t: 'p', text: 'Wszystkie adresy są ustawione. Wszystkie sieci mieszczą się w 10.0.0.0/8.' },
        { t: 'code', lines: ['R1(config)# router ospf 1', 'R1(config-router)# network 10.0.0.0 0.255.255.255 area 0', 'R1(config-router)# passive-interface g0/0/0', 'R1# show ip ospf neighbor', 'R1# show ip route'], caption: 'To samo na R2 i R3. Interfejs Gi0/0/0 każdego routera to jego sieć LAN.' },
      ],
      en: [
        { t: 'p', text: 'All addresses are set. All networks fit in 10.0.0.0/8.' },
        { t: 'code', lines: ['R1(config)# router ospf 1', 'R1(config-router)# network 10.0.0.0 0.255.255.255 area 0', 'R1(config-router)# passive-interface g0/0/0', 'R1# show ip ospf neighbor', 'R1# show ip route'], caption: 'Repeat on R2 and R3. Each router’s Gi0/0/0 is its LAN.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const pos = [
        [380, 80],
        [180, 300],
        [580, 300],
      ];
      const routers = pos.map(([x, y], i) => b.add('router', `R${i + 1}`, x, y));
      const pcs = pos.map(([x, y], i) => b.add('pc', `PC${i + 1}`, x + (i === 0 ? 0 : i === 1 ? -120 : 120), y + (i === 0 ? -0 : 140)));
      pcs[0].x = 600;
      pcs[0].y = 80;
      routers.forEach((r, i) => {
        b.link(pcs[i], 'eth0', r, 'Gi0/0/0').ip(r, 'Gi0/0/0', `10.${i + 1}.0.1/24`);
        b.host(pcs[i], `10.${i + 1}.0.10/24`, `10.${i + 1}.0.1`);
      });
      b.link(routers[0], 'Gi0/0/1', routers[1], 'Gi0/0/1').ip(routers[0], 'Gi0/0/1', '10.0.12.1/30').ip(routers[1], 'Gi0/0/1', '10.0.12.2/30');
      b.link(routers[0], 'Gi0/0/2', routers[2], 'Gi0/0/1').ip(routers[0], 'Gi0/0/2', '10.0.13.1/30').ip(routers[2], 'Gi0/0/1', '10.0.13.2/30');
      b.link(routers[1], 'Gi0/0/2', routers[2], 'Gi0/0/2').ip(routers[1], 'Gi0/0/2', '10.0.23.1/30').ip(routers[2], 'Gi0/0/2', '10.0.23.2/30');
      return b.net;
    },
    checks: [
      check('c1', ['R1 ma dwóch sąsiadów OSPF', 'R1 has two OSPF neighbors'], ['OSPF na łączach do R2 i R3, ten sam obszar.', 'OSPF on links to R2 and R3, same area.'], (c) => c.ospfNeighbors('R1') === 2),
      check('c2', ['R2 i R3 mają po dwóch sąsiadów', 'R2 and R3 have two neighbors each'], ['Skonfiguruj OSPF na wszystkich routerach.', 'Configure OSPF on every router.'], (c) => c.ospfNeighbors('R2') === 2 && c.ospfNeighbors('R3') === 2),
      check('c3', ['R1 zna sieć 10.3.0.0/24 z OSPF', 'R1 learned 10.3.0.0/24 from OSPF'], ['Sieci LAN muszą być objęte poleceniem network.', 'LANs must be covered by a network statement.'], (c) => c.hasRoute('R1', '10.3.0.0/24', 'O')),
      check('c4', ['Sieci LAN są pasywne na wszystkich routerach', 'LANs are passive on all routers'], ['passive-interface g0/0/0 w router ospf.', 'passive-interface g0/0/0 under router ospf.'], (c) => ['R1', 'R2', 'R3'].every((r) => c.device(r)?.ospf?.passive.some((p) => p.toLowerCase() === 'gigabitethernet0/0/0'))),
      check('c5', ['PC1 pinguje PC2 i PC3', 'PC1 pings PC2 and PC3'], ['Pierwszy ping może zginąć przez ARP.', 'The first ping may be lost to ARP.'], (c) => c.ping('PC1', '10.2.0.10') && c.ping('PC1', '10.3.0.10')),
    ],
  },
  {
    id: 'nat',
    level: 4,
    minutes: 20,
    title: l('NAT: biuro w internecie', 'NAT: an office on the internet'),
    summary: l('Pobierz adres od dostawcy i skonfiguruj PAT, żeby sieć prywatna dotarła do internetu.', 'Get an address from the provider and configure PAT so the private network reaches the internet.'),
    goals: [l('Konfigurować ip address dhcp', 'Configure ip address dhcp'), l('Konfigurować PAT', 'Configure PAT')],
    steps: {
      pl: [
        {
          t: 'code',
          lines: [
            'R1(config)# interface g0/0/1',
            'R1(config-if)# ip address dhcp',
            'R1(config-if)# no shutdown',
            'R1(config-if)# ip nat outside',
            'R1(config-if)# interface g0/0/0',
            'R1(config-if)# ip nat inside',
            'R1(config-if)# exit',
            'R1(config)# access-list 1 permit 192.168.1.0 0.0.0.255',
            'R1(config)# ip nat inside source list 1 interface g0/0/1 overload',
          ],
          caption: 'Trasę domyślną router dostanie razem z adresem z DHCP dostawcy.',
        },
        { t: 'p', text: 'Sprawdź na PC1 `curl https://www.przyklad.pl`, a na R1 `show ip nat translations`.' },
      ],
      en: [
        {
          t: 'code',
          lines: [
            'R1(config)# interface g0/0/1',
            'R1(config-if)# ip address dhcp',
            'R1(config-if)# no shutdown',
            'R1(config-if)# ip nat outside',
            'R1(config-if)# interface g0/0/0',
            'R1(config-if)# ip nat inside',
            'R1(config-if)# exit',
            'R1(config)# access-list 1 permit 192.168.1.0 0.0.0.255',
            'R1(config)# ip nat inside source list 1 interface g0/0/1 overload',
          ],
          caption: 'The router gets a default route together with the provider DHCP address.',
        },
        { t: 'p', text: 'Run `curl https://www.przyklad.pl` on PC1 and `show ip nat translations` on R1.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const isp = b.add('internet', 'ISP', 680, 120);
      const r1 = b.add('router', 'R1', 440, 160);
      const sw = b.add('switch', 'SW1', 240, 260);
      const pc1 = b.add('pc', 'PC1', 120, 420);
      const pc2 = b.add('pc', 'PC2', 360, 420);
      b.link(r1, 'Gi0/0/1', isp, 'port0').link(r1, 'Gi0/0/0', sw, 'Gi1/0/24').link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
      b.ip(r1, 'Gi0/0/0', '192.168.1.1/24');
      b.host(pc1, '192.168.1.10/24', '192.168.1.1', '198.51.100.53').host(pc2, '192.168.1.11/24', '192.168.1.1', '198.51.100.53');
      return b.net;
    },
    checks: [
      check('c1', ['R1 dostał adres publiczny od ISP', 'R1 got a public address from the ISP'], ['ip address dhcp i no shutdown na Gi0/0/1.', 'ip address dhcp and no shutdown on Gi0/0/1.'], (c) => c.inSubnet(c.port('R1', 'Gi0/0/1')?.ip ?? '', '203.0.113.0/24')),
      check('c2', ['Interfejsy oznaczone inside i outside', 'Interfaces marked inside and outside'], ['ip nat inside na LAN, ip nat outside na WAN.', 'ip nat inside on the LAN, ip nat outside on the WAN.'], (c) => c.port('R1', 'Gi0/0/0')?.nat === 'inside' && c.port('R1', 'Gi0/0/1')?.nat === 'outside'),
      check('c3', ['Reguła PAT z overload', 'A PAT rule with overload'], ['ip nat inside source list ... overload.', 'ip nat inside source list ... overload.'], (c) => Boolean(c.device('R1')?.nat.some((r) => r.kind === 'pat'))),
      check('c4', ['PC1 otwiera www.przyklad.pl', 'PC1 opens www.przyklad.pl'], ['Lista ACL musi obejmować 192.168.1.0/24.', 'The ACL must cover 192.168.1.0/24.'], (c) => c.http('PC1', 'https://www.przyklad.pl')),
      check('c5', ['PC2 też ma internet', 'PC2 has internet too'], ['PAT obsługuje wiele komputerów naraz.', 'PAT serves many computers at once.'], (c) => c.ping('PC2', '198.51.100.80')),
    ],
  },
  {
    id: 'acl',
    level: 4,
    minutes: 20,
    title: l('Lista ACL dla serwera', 'An ACL for a server'),
    summary: l('Pracownicy mają dostęp do strony serwera, ale nikt go nie pinguje, a gość nie ma dostępu wcale.', 'Staff can reach the server website, nobody can ping it and the guest has no access at all.'),
    goals: [l('Pisać rozszerzone ACL', 'Write extended ACLs'), l('Pamiętać o niewidocznym deny any', 'Remember the implicit deny any')],
    steps: {
      pl: [
        { t: 'list', items: ['GOSC ma adres 192.168.1.200. Nie może dosięgnąć SRV1 (10.0.0.10) w żaden sposób.', 'Pozostali z sieci 192.168.1.0/24 mogą otwierać stronę SRV1 (TCP 80 i 443).', 'Ping do SRV1 ma być zablokowany dla wszystkich.', 'Listę przypisz na R1, na interfejsie Gi0/0/0 w kierunku `in`.'] },
        { t: 'code', lines: ['R1(config)# ip access-list extended SERWER', 'R1(config-ext-nacl)# deny ip host 192.168.1.200 any', 'R1(config-ext-nacl)# deny icmp any host 10.0.0.10 echo', 'R1(config-ext-nacl)# permit tcp 192.168.1.0 0.0.0.255 host 10.0.0.10 eq 443', '...'], caption: 'Początek rozwiązania. Kolejność reguł ma znaczenie.' },
      ],
      en: [
        { t: 'list', items: ['GOSC has 192.168.1.200. It must not reach SRV1 (10.0.0.10) in any way.', 'Everyone else in 192.168.1.0/24 can open SRV1’s site (TCP 80 and 443).', 'Ping to SRV1 must be blocked for everyone.', 'Apply the list on R1, interface Gi0/0/0, direction `in`.'] },
        { t: 'code', lines: ['R1(config)# ip access-list extended SERWER', 'R1(config-ext-nacl)# deny ip host 192.168.1.200 any', 'R1(config-ext-nacl)# deny icmp any host 10.0.0.10 echo', 'R1(config-ext-nacl)# permit tcp 192.168.1.0 0.0.0.255 host 10.0.0.10 eq 443', '...'], caption: 'The start of a solution. Rule order matters.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 380, 160);
      const sw = b.add('switch', 'SW1', 180, 260);
      const pc = b.add('pc', 'PC1', 80, 420);
      const guest = b.add('laptop', 'GOSC', 280, 420);
      const srv = b.add('server', 'SRV1', 600, 300);
      b.link(r1, 'Gi0/0/0', sw, 'Gi1/0/24').link(r1, 'Gi0/0/1', srv, 'eth0').link(pc, 'eth0', sw, 'Gi1/0/1').link(guest, 'eth0', sw, 'Gi1/0/2');
      b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '10.0.0.1/24');
      b.host(pc, '192.168.1.10/24', '192.168.1.1').host(guest, '192.168.1.200/24', '192.168.1.1').host(srv, '10.0.0.10/24', '10.0.0.1');
      srv.services.http = true;
      srv.web = { title: 'Serwer firmowy', body: 'Strona wewnętrzna.' };
      return b.net;
    },
    checks: [
      check('c1', ['Na R1 Gi0/0/0 jest ACL w kierunku in', 'R1 Gi0/0/0 has an inbound ACL'], ['ip access-group NAZWA in.', 'ip access-group NAME in.'], (c) => Boolean(c.port('R1', 'Gi0/0/0')?.aclIn)),
      check('c2', ['PC1 otwiera stronę SRV1', 'PC1 opens SRV1’s page'], ['Zezwól na TCP 80 i 443 z sieci 192.168.1.0/24.', 'Permit TCP 80 and 443 from 192.168.1.0/24.'], (c) => c.http('PC1', 'https://10.0.0.10') && c.http('PC1', 'http://10.0.0.10')),
      check('c3', ['PC1 nie pinguje SRV1', 'PC1 cannot ping SRV1'], ['deny icmp ... echo przed regułami permit.', 'deny icmp ... echo before the permit rules.'], (c) => !c.ping('PC1', '10.0.0.10')),
      check('c4', ['GOSC nie otwiera strony SRV1', 'GOSC cannot open SRV1’s page'], ['Reguła dla hosta 192.168.1.200 musi być pierwsza.', 'The rule for host 192.168.1.200 must come first.'], (c) => !c.http('GOSC', 'https://10.0.0.10')),
    ],
  },
  {
    id: 'zapora',
    level: 5,
    minutes: 25,
    title: l('Zapora NGFW ze strefami i DMZ', 'NGFW with zones and a DMZ'),
    summary: l('Podziel sieć na strefy, wpuść ruch HTTPS do DMZ i chroń sieć wewnętrzną.', 'Split the network into zones, allow HTTPS into the DMZ and protect the inside.'),
    goals: [l('Przypisywać strefy', 'Assign zones'), l('Tworzyć reguły stanowe', 'Write stateful rules')],
    steps: {
      pl: [
        { t: 'list', ordered: true, items: ['W panelu FW1 przypisz strefy: eth1/1 `outside`, eth1/2 `inside`, eth1/3 `dmz`. Adresy są już ustawione.', 'Dodaj regułę: z `outside` do `dmz`, TCP, port 443, cel 172.16.0.10, zezwól.', 'Reguła „LAN do internetu” już jest. Dodaj też zezwolenie z `inside` do `dmz`.', 'Nie dodawaj reguł z `outside` ani z `dmz` do `inside`. Domyślnie wszystko inne jest blokowane.', 'Wyłącz NAT (PAT) w panelu, bo w tym ćwiczeniu adresy są routowane bez translacji.'] },
      ],
      en: [
        { t: 'list', ordered: true, items: ['In FW1’s panel assign zones: eth1/1 `outside`, eth1/2 `inside`, eth1/3 `dmz`. Addresses are already set.', 'Add a rule: from `outside` to `dmz`, TCP, port 443, destination 172.16.0.10, allow.', 'The "LAN to internet" rule exists. Also allow `inside` to `dmz`.', 'Do not add rules from `outside` or `dmz` to `inside`. Everything else is blocked by default.', 'Turn NAT (PAT) off in the panel, since this exercise routes addresses without translation.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const fw = b.add('firewall', 'FW1', 380, 220);
      const ext = b.add('laptop', 'KLIENT', 680, 220);
      const pc = b.add('pc', 'PC1', 120, 220);
      const web = b.add('server', 'WEB', 380, 440);
      b.link(fw, 'eth1/1', ext, 'eth0').link(fw, 'eth1/2', pc, 'eth0').link(fw, 'eth1/3', web, 'eth0');
      b.ip(fw, 'eth1/1', '203.0.113.1/24').ip(fw, 'eth1/2', '192.168.1.1/24').ip(fw, 'eth1/3', '172.16.0.1/24');
      b.host(ext, '203.0.113.50/24', '203.0.113.1').host(pc, '192.168.1.10/24', '192.168.1.1').host(web, '172.16.0.10/24', '172.16.0.1');
      web.services.http = true;
      web.web = { title: 'Sklep firmy', body: 'Serwer w DMZ.' };
      return b.net;
    },
    checks: [
      check('c1', ['Strefy outside, inside i dmz przypisane', 'Zones outside, inside and dmz assigned'], ['Panel zapory, sekcja Interfejsy i strefy.', 'Firewall panel, Interfaces and zones.'], (c) => c.port('FW1', 'eth1/1')?.zone === 'outside' && c.port('FW1', 'eth1/2')?.zone === 'inside' && c.port('FW1', 'eth1/3')?.zone === 'dmz'),
      check('c2', ['KLIENT z internetu otwiera HTTPS w DMZ', 'The internet CLIENT opens HTTPS in the DMZ'], ['Reguła outside do dmz, TCP 443.', 'A rule outside to dmz, TCP 443.'], (c) => c.http('KLIENT', 'https://172.16.0.10')),
      check('c3', ['PC1 otwiera stronę w DMZ', 'PC1 opens the DMZ site'], ['Reguła inside do dmz.', 'An inside to dmz rule.'], (c) => c.http('PC1', 'https://172.16.0.10')),
      check('c4', ['KLIENT nie dosięga PC1', 'CLIENT cannot reach PC1'], ['Brak reguł outside do inside.', 'No outside to inside rules.'], (c) => !c.ping('KLIENT', '192.168.1.10')),
      check('c5', ['Serwer w DMZ nie dosięga PC1', 'The DMZ server cannot reach PC1'], ['DMZ nie może inicjować ruchu do sieci wewnętrznej.', 'The DMZ must not initiate traffic to the inside.'], (c) => !c.ping('WEB', '192.168.1.10')),
      check('c6', ['PC1 pinguje KLIENT', 'PC1 pings CLIENT'], ['Reguła LAN do internetu zostaje.', 'Keep the LAN to internet rule.'], (c) => c.ping('PC1', '203.0.113.50')),
    ],
  },
  {
    id: 'ssh',
    level: 5,
    minutes: 15,
    title: l('Bezpieczne zarządzanie: SSH zamiast Telnetu', 'Secure management: SSH instead of Telnet'),
    summary: l('Utwardź router: konta z secret, klucze RSA, SSH v2, brak Telnetu i szyfrowanie haseł.', 'Harden a router: secret-based accounts, RSA keys, SSH v2, no Telnet and password encryption.'),
    goals: [l('Konfigurować SSH', 'Configure SSH'), l('Wyłączać Telnet', 'Disable Telnet')],
    steps: {
      pl: [
        { t: 'list', ordered: true, items: ['Ustaw domenę `firma.lan` i wygeneruj klucze RSA co najmniej 2048 bitów.', 'Włącz `ip ssh version 2`.', 'Dodaj konto `admin` z `secret` i ustaw `enable secret`.', 'Na `line vty 0 4`: `login local` i `transport input ssh`.', 'Włącz `service password-encryption`.', 'Z PC1 wpisz `ssh -l admin 10.0.0.1` i zaloguj się.'] },
      ],
      en: [
        { t: 'list', ordered: true, items: ['Set domain `firma.lan` and generate RSA keys of at least 2048 bits.', 'Enable `ip ssh version 2`.', 'Add user `admin` with a `secret` and set `enable secret`.', 'Under `line vty 0 4`: `login local` and `transport input ssh`.', 'Enable `service password-encryption`.', 'From PC1 run `ssh -l admin 10.0.0.1` and log in.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 420, 200);
      const pc = b.add('pc', 'PC1', 160, 200);
      b.link(pc, 'eth0', r1, 'Gi0/0/0').ip(r1, 'Gi0/0/0', '10.0.0.1/24').host(pc, '10.0.0.10/24', '10.0.0.1');
      return b.net;
    },
    checks: [
      check('c1', ['Klucze RSA i SSH v2', 'RSA keys and SSH v2'], ['ip domain-name, crypto key generate rsa, ip ssh version 2.', 'ip domain-name, crypto key generate rsa, ip ssh version 2.'], (c) => Boolean(c.device('R1')?.mgmt.sshKeys && c.device('R1')?.mgmt.sshV2)),
      check('c2', ['Konto admin i enable secret', 'An admin account and enable secret'], ['username admin secret ..., enable secret ...', 'username admin secret ..., enable secret ...'], (c) => Boolean(c.device('R1')?.mgmt.users.some((u) => u.name === 'admin') && c.device('R1')?.mgmt.enableSecret)),
      check('c3', ['Linie vty: login local i tylko SSH', 'vty lines: login local and SSH only'], ['line vty 0 4, login local, transport input ssh.', 'line vty 0 4, login local, transport input ssh.'], (c) => c.device('R1')?.mgmt.vtyLogin === 'local' && c.device('R1')?.mgmt.vtyTransport === 'ssh'),
      check('c4', ['Szyfrowanie haseł włączone', 'Password encryption enabled'], ['service password-encryption.', 'service password-encryption.'], (c) => Boolean(c.device('R1')?.mgmt.passwordEncryption)),
      check('c5', ['SSH z PC1 działa, Telnet jest odrzucany', 'SSH from PC1 works, Telnet is refused'], ['transport input ssh blokuje Telnet.', 'transport input ssh blocks Telnet.'], (c) => c.connect('PC1', '10.0.0.1', 22) === 'open' && c.connect('PC1', '10.0.0.1', 23) === 'refused'),
    ],
  },
  {
    id: 'stp',
    level: 5,
    minutes: 15,
    title: l('STP: wybór mostu głównego', 'STP: choosing the root bridge'),
    summary: l('Trzy przełączniki w pętli. Ustaw most główny na rdzeniu i zobacz, który port się zablokuje.', 'Three switches in a loop. Make the core the root bridge and see which port blocks.'),
    goals: [l('Ustawiać priorytet STP', 'Set STP priority'), l('Czytać show spanning-tree', 'Read show spanning-tree')],
    steps: {
      pl: [
        { t: 'p', text: 'Teraz mostem głównym jest przypadkowy przełącznik z najniższym MAC. Rdzeniem sieci ma być **SW3**.' },
        { t: 'list', ordered: true, items: ['Na SW3 wpisz `spanning-tree vlan 1 root primary` albo ustaw priorytet 4096.', 'Na każdym przełączniku sprawdź `show spanning-tree`.', 'Zablokowany (bursztynowy) port powinien być na łączu między SW1 a SW2.'] },
      ],
      en: [
        { t: 'p', text: 'Right now the root is a random switch with the lowest MAC. **SW3** should be the network core.' },
        { t: 'list', ordered: true, items: ['On SW3 run `spanning-tree vlan 1 root primary` or set priority 4096.', 'Run `show spanning-tree` on each switch.', 'The blocked (amber) port should end up on the SW1-SW2 link.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const sw1 = b.add('switch', 'SW1', 200, 300);
      const sw2 = b.add('switch', 'SW2', 560, 300);
      const sw3 = b.add('switch', 'SW3', 380, 100);
      const pc1 = b.add('pc', 'PC1', 200, 460);
      const pc2 = b.add('pc', 'PC2', 560, 460);
      b.link(sw1, 'Gi1/0/23', sw3, 'Gi1/0/23').link(sw2, 'Gi1/0/23', sw3, 'Gi1/0/24').link(sw1, 'Gi1/0/24', sw2, 'Gi1/0/24');
      b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
      b.host(pc1, '10.0.0.1/24').host(pc2, '10.0.0.2/24');
      return b.net;
    },
    checks: [
      check('c1', ['SW3 jest mostem głównym', 'SW3 is the root bridge'], ['Niższy priorytet niż 32768, np. root primary.', 'A priority below 32768, e.g. root primary.'], (c) => c.stpRoot('SW3')),
      check('c2', ['SW3 nie ma zablokowanych portów', 'SW3 has no blocked ports'], ['Most główny ma wszystkie porty desygnowane.', 'The root has all ports designated.'], (c) => c.stpBlockedOn('SW3') === 0),
      check('c3', ['Jeden port na łączu SW1-SW2 jest zablokowany', 'One port on the SW1-SW2 link is blocked'], ['Wynika to z wyboru SW3 jako mostu głównego.', 'It follows from choosing SW3 as root.'], (c) => c.stpBlockedOn('SW1') + c.stpBlockedOn('SW2') === 1),
      check('c4', ['PC1 pinguje PC2', 'PC1 pings PC2'], ['Ruch idzie przez SW3.', 'Traffic flows via SW3.'], (c) => c.ping('PC1', '10.0.0.2')),
    ],
  },
  {
    id: 'awaria',
    level: 5,
    minutes: 25,
    title: l('Awaria w biurze', 'Office outage'),
    summary: l('Sieć ma cztery ukryte usterki. Znajdź je metodycznie i przywróć działanie.', 'The network has four hidden faults. Find them methodically and restore service.'),
    goals: [l('Diagnozować warstwa po warstwie', 'Troubleshoot layer by layer'), l('Czytać wyniki show i ipconfig', 'Read show and ipconfig output')],
    steps: {
      pl: [
        { t: 'p', text: 'Zgłoszenia od użytkowników: „PC1 nie otwiera intranetu po nazwie”, „PC3 nie ma sieci”, „PC2 nie dosięga nikogo w biurze A”. Serwer SRV1 (192.168.2.20) udostępnia DNS i stronę `intranet.firma.lan`.' },
        { t: 'list', items: ['Zacznij od `ipconfig /all` na każdym komputerze.', 'Na R1: `show ip interface brief`.', 'Na SW1: `show vlan brief`.', 'Zmieniaj jedną rzecz naraz i sprawdzaj efekt.'] },
      ],
      en: [
        { t: 'p', text: 'User tickets: "PC1 cannot open the intranet by name", "PC3 has no network", "PC2 cannot reach anyone in office A". Server SRV1 (192.168.2.20) provides DNS and the site `intranet.firma.lan`.' },
        { t: 'list', items: ['Start with `ipconfig /all` on each computer.', 'On R1: `show ip interface brief`.', 'On SW1: `show vlan brief`.', 'Change one thing at a time and verify.'] },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 380, 100);
      const sw1 = b.add('switch', 'SW1', 200, 260);
      const sw2 = b.add('switch', 'SW2', 560, 260);
      const pc1 = b.add('pc', 'PC1', 100, 420);
      const pc3 = b.add('pc', 'PC3', 280, 420);
      const pc2 = b.add('pc', 'PC2', 480, 420);
      const srv = b.add('server', 'SRV1', 640, 420);
      b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r1, 'Gi0/0/1', sw2, 'Gi1/0/24');
      b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc3, 'eth0', sw1, 'Gi1/0/2').link(pc2, 'eth0', sw2, 'Gi1/0/1').link(srv, 'eth0', sw2, 'Gi1/0/2');
      b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '192.168.2.1/24');
      b.down(r1, 'Gi0/0/1');
      b.access(sw1, 99, 'Gi1/0/2');
      b.host(pc1, '192.168.1.10/24', '192.168.1.1', '192.168.2.99').host(pc3, '192.168.1.30/24', '192.168.1.1', '192.168.2.20');
      b.host(pc2, '192.168.2.10/24', '192.168.2.254', '192.168.2.20').host(srv, '192.168.2.20/24', '192.168.2.1', '192.168.2.20');
      srv.services = { dhcp: false, dns: true, http: true };
      srv.dnsRecords = [{ name: 'intranet.firma.lan', type: 'A', value: '192.168.2.20' }];
      srv.web = { title: 'Intranet', body: 'Wszystko działa.' };
      return b.net;
    },
    checks: [
      check('c1', ['PC1 otwiera http://intranet.firma.lan', 'PC1 opens http://intranet.firma.lan'], ['Sprawdź serwer DNS w ipconfig /all.', 'Check the DNS server in ipconfig /all.'], (c) => c.http('PC1', 'http://intranet.firma.lan')),
      check('c2', ['PC3 otwiera intranet', 'PC3 opens the intranet'], ['Do jakiego VLAN-u należy port PC3?', 'Which VLAN is PC3’s port in?'], (c) => c.http('PC3', 'http://intranet.firma.lan')),
      check('c3', ['PC2 pinguje PC1', 'PC2 pings PC1'], ['Brama PC2 musi istnieć w jego sieci.', 'PC2’s gateway must exist on its network.'], (c) => c.ping('PC2', '192.168.1.10')),
      check('c4', ['Interfejs R1 do biura B działa', 'R1’s interface to office B is up'], ['show ip interface brief: administratively down?', 'show ip interface brief: administratively down?'], (c) => c.portUp('R1', 'Gi0/0/1')),
    ],
  },
  {
    id: 'kampus',
    level: 5,
    minutes: 40,
    title: l('Projekt końcowy: kampus', 'Capstone: a campus'),
    summary: l('VLAN-y na trzech przełącznikach, routing na przełączniku L3, przekaźnik DHCP i wyjście do internetu przez zaporę.', 'VLANs on three switches, routing on an L3 switch, DHCP relay and internet through a firewall.'),
    goals: [l('Połączyć wszystkie umiejętności', 'Combine all skills'), l('Zbudować działającą sieć firmy', 'Build a working company network')],
    steps: {
      pl: [
        { t: 'p', text: 'Zapora FW1 i serwer SRV1 są gotowe. SRV1 (10.10.30.10) ma pule DHCP dla VLAN 10 i 20. Twoje zadania:' },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na DSW1, SW1 i SW2 utwórz VLAN 10, 20 i 30.',
            'Łącza między DSW1 a SW1 i SW2 ustaw jako trunki po obu stronach.',
            'Na SW1: PC1 (Gi1/0/1) w VLAN 10, PC2 (Gi1/0/2) w VLAN 20. Na SW2: SRV1 (Gi1/0/10) w VLAN 30.',
            'Na DSW1: `ip routing`, interfejsy `vlan 10/20/30` z adresami 10.10.X.1/24 i `ip helper-address 10.10.30.10` na VLAN 10 i 20.',
            'Port DSW1 Gi1/0/24 (do zapory) jako `no switchport` z adresem 10.0.0.2/30 oraz trasa domyślna przez 10.0.0.1.',
            'Sprawdź, czy PC1 otwiera https://www.przyklad.pl.',
          ],
        },
      ],
      en: [
        { t: 'p', text: 'Firewall FW1 and server SRV1 are ready. SRV1 (10.10.30.10) has DHCP pools for VLANs 10 and 20. Your tasks:' },
        {
          t: 'list',
          ordered: true,
          items: [
            'Create VLANs 10, 20 and 30 on DSW1, SW1 and SW2.',
            'Make the links between DSW1 and SW1 and SW2 trunks on both ends.',
            'On SW1: PC1 (Gi1/0/1) in VLAN 10, PC2 (Gi1/0/2) in VLAN 20. On SW2: SRV1 (Gi1/0/10) in VLAN 30.',
            'On DSW1: `ip routing`, interfaces `vlan 10/20/30` with 10.10.X.1/24 and `ip helper-address 10.10.30.10` on VLANs 10 and 20.',
            'DSW1 port Gi1/0/24 (to the firewall) as `no switchport` with 10.0.0.2/30 and a default route via 10.0.0.1.',
            'Check that PC1 opens https://www.przyklad.pl.',
          ],
        },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const isp = b.add('internet', 'ISP', 900, 100);
      const fw = b.add('firewall', 'FW1', 700, 100);
      const core = b.add('l3switch', 'DSW1', 480, 160);
      const sw1 = b.add('switch', 'SW1', 280, 320);
      const sw2 = b.add('switch', 'SW2', 680, 320);
      const pc1 = b.add('pc', 'PC1', 180, 470);
      const pc2 = b.add('pc', 'PC2', 380, 470);
      const srv = b.add('server', 'SRV1', 680, 470);
      b.link(fw, 'eth1/1', isp, 'port0').link(fw, 'eth1/2', core, 'Gi1/0/24');
      b.link(core, 'Gi1/0/1', sw1, 'Gi1/0/24').link(core, 'Gi1/0/2', sw2, 'Gi1/0/24');
      b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw1, 'Gi1/0/2').link(srv, 'eth0', sw2, 'Gi1/0/10');
      b.host(srv, '10.10.30.10/24', '10.10.30.1', '198.51.100.53');
      srv.services = { dhcp: true, dns: false, http: true };
      b.pool(srv, 'BIURO', '10.10.10.0/24', '10.10.10.1', '198.51.100.53').pool(srv, 'TELEFONY', '10.10.20.0/24', '10.10.20.1', '198.51.100.53');
      srv.dhcpExcluded = [
        { from: '10.10.10.1', to: '10.10.10.20' },
        { from: '10.10.20.1', to: '10.10.20.20' },
      ];
      b.ip(fw, 'eth1/2', '10.0.0.1/30');
      fw.ports[0].dhcp = true;
      fw.ports[0].zone = 'outside';
      fw.ports[1].zone = 'inside';
      fw.routes.push({ net: '10.10.0.0', prefix: 16, via: '10.0.0.2', iface: '', ad: 1 });
      return b.net;
    },
    checks: [
      check('c1', ['VLAN 10, 20 i 30 na wszystkich przełącznikach', 'VLANs 10, 20 and 30 on every switch'], ['Polecenie vlan na DSW1, SW1 i SW2.', 'The vlan command on DSW1, SW1 and SW2.'], (c) => ['DSW1', 'SW1', 'SW2'].every((s) => [10, 20, 30].every((v) => c.device(s)?.vlans.some((x) => x.id === v)))),
      check('c2', ['Trunki DSW1-SW1 i DSW1-SW2', 'Trunks DSW1-SW1 and DSW1-SW2'], ['switchport mode trunk po obu stronach.', 'switchport mode trunk on both ends.'], (c) => c.port('DSW1', 'Gi1/0/1')?.mode === 'trunk' && c.port('DSW1', 'Gi1/0/2')?.mode === 'trunk' && c.port('SW1', 'Gi1/0/24')?.mode === 'trunk' && c.port('SW2', 'Gi1/0/24')?.mode === 'trunk'),
      check('c3', ['SVI na DSW1 i ip routing', 'SVIs on DSW1 and ip routing'], ['interface vlan 10/20/30 z adresami .1 oraz ip routing.', 'interface vlan 10/20/30 with .1 addresses plus ip routing.'], (c) => Boolean(c.device('DSW1')?.ipRouting) && vifIs(c, 'DSW1', 'Vlan10', '10.10.10.1', 24) && vifIs(c, 'DSW1', 'Vlan20', '10.10.20.1', 24) && vifIs(c, 'DSW1', 'Vlan30', '10.10.30.1', 24)),
      check('c4', ['PC1 dostał adres z VLAN 10', 'PC1 got a VLAN 10 address'], ['Port PC1 w VLAN 10 i ip helper-address na Vlan10.', 'PC1’s port in VLAN 10 and ip helper-address on Vlan10.'], (c) => c.inSubnet(c.port('PC1', 'eth0')?.ip ?? '', '10.10.10.0/24')),
      check('c5', ['PC2 dostał adres z VLAN 20', 'PC2 got a VLAN 20 address'], ['Port PC2 w VLAN 20 i przekaźnik na Vlan20.', 'PC2’s port in VLAN 20 and a relay on Vlan20.'], (c) => c.inSubnet(c.port('PC2', 'eth0')?.ip ?? '', '10.10.20.0/24')),
      check('c6', ['PC1 pinguje PC2', 'PC1 pings PC2'], ['Routing między VLAN-ami na DSW1.', 'Inter-VLAN routing on DSW1.'], (c) => c.ping('PC1', 'PC2')),
      check('c7', ['PC1 otwiera www.przyklad.pl', 'PC1 opens www.przyklad.pl'], ['Port routowany do FW1 i trasa domyślna przez 10.0.0.1.', 'A routed port to FW1 and a default route via 10.0.0.1.'], (c) => c.http('PC1', 'https://www.przyklad.pl')),
    ],
  },
];
