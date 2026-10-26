import { l } from '../../i18n/l10n';
import { NetBuilder, portByName } from '../../sim/builder';
import { parseIpv6 } from '../../sim/ip6';
import type { Lab } from '../types';
import { check } from './basic';

export const IPV6_LABS: Lab[] = [
  {
    id: 'ipv6-podstawy',
    level: 4,
    minutes: 15,
    title: l('IPv6: dwie sieci i SLAAC', 'IPv6: two networks and SLAAC'),
    summary: l('Włącz routing IPv6, nadaj adresy interfejsom routera i zobacz, jak komputery same konfigurują adres.', 'Enable IPv6 routing, address the router interfaces and watch computers configure themselves.'),
    goals: [l('Konfigurować ipv6 unicast-routing i ipv6 address', 'Configure ipv6 unicast-routing and ipv6 address'), l('Rozumieć SLAAC i adresy link-local', 'Understand SLAAC and link-local addresses')],
    steps: {
      pl: [
        { t: 'p', text: 'R1 łączy dwie sieci. Komputery mają IPv6 ustawione na automatyczne (SLAAC), ale router jeszcze nic nie ogłasza.' },
        {
          t: 'code',
          lines: ['R1(config)# ipv6 unicast-routing', 'R1(config)# interface g0/0/0', 'R1(config-if)# ipv6 address 2001:db8:10::1/64', 'R1(config-if)# no shutdown', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ipv6 address 2001:db8:20::1/64', 'R1(config-if)# no shutdown'],
          caption: 'Bez ipv6 unicast-routing router nie ogłasza prefiksów i nie przekazuje pakietów IPv6.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na PC1 wpisz `ipconfig`. Zobaczysz adres z prefiksu 2001:db8:10::/64 oraz adres link-local fe80::, a bramą jest adres link-local routera.',
            'Sprawdź adres PC2 i wpisz na PC1 `ping` z tym adresem.',
            'Na R1 sprawdź `show ipv6 interface brief`, `show ipv6 route` i `show ipv6 neighbors`.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'W trybie symulacji zobaczysz Neighbor Solicitation i Neighbor Advertisement. To NDP, który w IPv6 zastępuje ARP.' },
      ],
      en: [
        { t: 'p', text: 'R1 joins two networks. The computers use automatic IPv6 (SLAAC), but the router does not advertise anything yet.' },
        {
          t: 'code',
          lines: ['R1(config)# ipv6 unicast-routing', 'R1(config)# interface g0/0/0', 'R1(config-if)# ipv6 address 2001:db8:10::1/64', 'R1(config-if)# no shutdown', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ipv6 address 2001:db8:20::1/64', 'R1(config-if)# no shutdown'],
          caption: 'Without ipv6 unicast-routing the router does not advertise prefixes or forward IPv6 packets.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'On PC1 run `ipconfig`. You will see an address from 2001:db8:10::/64 and a link-local fe80:: address, and the gateway is the router’s link-local address.',
            'Check PC2’s address and run `ping` with it on PC1.',
            'On R1 run `show ipv6 interface brief`, `show ipv6 route` and `show ipv6 neighbors`.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'In simulation mode you will see Neighbor Solicitation and Neighbor Advertisement. That is NDP, which replaces ARP in IPv6.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 380, 100);
      const sw1 = b.add('switch', 'SW1', 200, 260);
      const sw2 = b.add('switch', 'SW2', 560, 260);
      const pc1 = b.add('pc', 'PC1', 200, 420);
      const pc2 = b.add('pc', 'PC2', 560, 420);
      b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r1, 'Gi0/0/1', sw2, 'Gi1/0/24').link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
      for (const pc of [pc1, pc2]) pc.ports[0].dhcp = false;
      return b.net;
    },
    checks: [
      check('c1', ['R1 ma włączony routing IPv6', 'R1 has IPv6 routing enabled'], ['ipv6 unicast-routing w trybie konfiguracji.', 'ipv6 unicast-routing in configuration mode.'], (c) => Boolean(c.device('R1')?.ipv6Routing)),
      check('c2', ['Interfejsy R1 mają adresy w 2001:db8:10::/64 i 2001:db8:20::/64', 'R1 interfaces have addresses in 2001:db8:10::/64 and 2001:db8:20::/64'], ['ipv6 address na Gi0/0/0 i Gi0/0/1, interfejsy włączone.', 'ipv6 address on Gi0/0/0 and Gi0/0/1, interfaces up.'], (c) => Boolean(c.ipv6In('R1', '2001:db8:10::/64') && c.ipv6In('R1', '2001:db8:20::/64'))),
      check('c3', ['PC1 i PC2 mają adresy z SLAAC', 'PC1 and PC2 have SLAAC addresses'], ['Router ogłasza prefiks tylko z prefiksem /64 i włączonym routingiem IPv6.', 'The router advertises only a /64 prefix with IPv6 routing on.'], (c) => Boolean(c.ipv6In('PC1', '2001:db8:10::/64') && c.ipv6In('PC2', '2001:db8:20::/64'))),
      check('c4', ['PC1 pinguje PC2 po IPv6', 'PC1 pings PC2 over IPv6'], ['Adres PC2 sprawdzisz poleceniem ipconfig.', 'Check PC2’s address with ipconfig.'], (c) => {
        const target = c.ipv6In('PC2', '2001:db8:20::/64');
        return Boolean(target && c.ping('PC1', target));
      }),
    ],
  },
  {
    id: 'ipv6-trasy',
    level: 4,
    minutes: 20,
    title: l('IPv6: trasy statyczne między routerami', 'IPv6: static routes between routers'),
    summary: l('Dwa routery mają już adresy IPv6. Dodaj trasy, żeby komputer dotarł do serwera w drugiej sieci.', 'Two routers already have IPv6 addresses. Add routes so the computer reaches the server in the other network.'),
    goals: [l('Konfigurować ipv6 route', 'Configure ipv6 route'), l('Czytać show ipv6 route i traceroute', 'Read show ipv6 route and traceroute')],
    steps: {
      pl: [
        { t: 'p', text: 'R1 obsługuje sieć 2001:db8:1::/64, R2 sieć 2001:db8:2::/64 z serwerem SRV1 (2001:db8:2::10). Łącze między routerami to 2001:db8:12::/64. Routery znają tylko swoje sieci.' },
        { t: 'code', lines: ['R1(config)# ipv6 route 2001:db8:2::/64 2001:db8:12::2', 'R2(config)# ipv6 route 2001:db8:1::/64 2001:db8:12::1'], caption: 'Ruch musi umieć wrócić, więc trasa potrzebna jest na obu routerach.' },
        { t: 'list', ordered: true, items: ['Na PC1 wpisz `ping 2001:db8:2::10`.', 'Wpisz `tracert 2001:db8:2::10` i zobacz oba routery po drodze.', 'Na R1 sprawdź `show ipv6 route`. Twoja trasa ma literę S.'] },
        { t: 'callout', kind: 'info', text: 'Następnym skokiem może być też adres link-local sąsiada. Wtedy trzeba podać interfejs, np. `ipv6 route 2001:db8:2::/64 g0/0/1 fe80::...`.' },
      ],
      en: [
        { t: 'p', text: 'R1 serves 2001:db8:1::/64 and R2 serves 2001:db8:2::/64 with server SRV1 (2001:db8:2::10). The link between the routers is 2001:db8:12::/64. Each router knows only its own networks.' },
        { t: 'code', lines: ['R1(config)# ipv6 route 2001:db8:2::/64 2001:db8:12::2', 'R2(config)# ipv6 route 2001:db8:1::/64 2001:db8:12::1'], caption: 'Traffic has to find its way back, so both routers need a route.' },
        { t: 'list', ordered: true, items: ['On PC1 run `ping 2001:db8:2::10`.', 'Run `tracert 2001:db8:2::10` and see both routers on the way.', 'On R1 run `show ipv6 route`. Your route has the letter S.'] },
        { t: 'callout', kind: 'info', text: 'The next hop can also be the neighbor’s link-local address. Then you must name the interface, e.g. `ipv6 route 2001:db8:2::/64 g0/0/1 fe80::...`.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 260, 160);
      const r2 = b.add('router', 'R2', 520, 160);
      const sw1 = b.add('switch', 'SW1', 160, 320);
      const sw2 = b.add('switch', 'SW2', 620, 320);
      const pc1 = b.add('pc', 'PC1', 160, 460);
      const srv = b.add('server', 'SRV1', 620, 460);
      b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r2, 'Gi0/0/0', sw2, 'Gi1/0/24').link(r1, 'Gi0/0/1', r2, 'Gi0/0/1').link(pc1, 'eth0', sw1, 'Gi1/0/1').link(srv, 'eth0', sw2, 'Gi1/0/1');
      const address: [typeof r1, string, string][] = [
        [r1, 'Gi0/0/0', '2001:db8:1::1/64'],
        [r1, 'Gi0/0/1', '2001:db8:12::1/64'],
        [r2, 'Gi0/0/0', '2001:db8:2::1/64'],
        [r2, 'Gi0/0/1', '2001:db8:12::2/64'],
      ];
      for (const [router, name, cidr] of address) {
        const port = portByName(router, name);
        port.shutdown = false;
        port.ipv6 = [cidr];
      }
      r1.ipv6Routing = true;
      r2.ipv6Routing = true;
      pc1.ports[0].dhcp = false;
      const srvPort = srv.ports[0];
      srvPort.ipv6 = ['2001:db8:2::10/64'];
      srvPort.gateway6 = '2001:db8:2::1';
      return b.net;
    },
    checks: [
      check('c1', ['R1 ma trasę do 2001:db8:2::/64', 'R1 has a route to 2001:db8:2::/64'], ['ipv6 route 2001:db8:2::/64 2001:db8:12::2.', 'ipv6 route 2001:db8:2::/64 2001:db8:12::2.'], (c) => {
        const r1 = c.device('R1');
        return Boolean(r1 && c.sim.topo.lookup6(r1, parseIpv6('2001:db8:2::10')!)?.route.code === 'S');
      }),
      check('c2', ['R2 ma trasę powrotną do 2001:db8:1::/64', 'R2 has a return route to 2001:db8:1::/64'], ['Bez trasy powrotnej odpowiedź serwera nie wróci.', 'Without a return route the server reply cannot come back.'], (c) => {
        const r2 = c.device('R2');
        return Boolean(r2 && c.sim.topo.lookup6(r2, parseIpv6('2001:db8:1::10')!)?.route.code === 'S');
      }),
      check('c3', ['PC1 pinguje SRV1 (2001:db8:2::10)', 'PC1 pings SRV1 (2001:db8:2::10)'], ['Pierwsze pakiety mogą zginąć, zanim routery poznają sąsiadów.', 'The first packets may be lost while routers learn their neighbors.'], (c) => c.ping('PC1', '2001:db8:2::10')),
    ],
  },
  {
    id: 'ipv6-ospf-dhcp',
    level: 4,
    minutes: 25,
    title: l('IPv6: OSPFv3 i DHCPv6', 'IPv6: OSPFv3 and DHCPv6'),
    summary: l('Zamiast tras statycznych włącz OSPFv3 na dwóch routerach, a komputerom podaj serwer DNS przez bezstanowe DHCPv6.', 'Instead of static routes enable OSPFv3 on two routers and give the computers a DNS server through stateless DHCPv6.'),
    goals: [l('Konfigurować OSPFv3 z router-id', 'Configure OSPFv3 with a router-id'), l('Rozróżniać flagi M i O oraz DHCPv6 stanowe i bezstanowe', 'Tell the M and O flags and stateful and stateless DHCPv6 apart')],
    steps: {
      pl: [
        { t: 'p', text: 'Adresy IPv6 na routerach są gotowe: R1 ma sieć biura 2001:db8:1::/64, R2 sieć serwerów 2001:db8:2::/64 z SRV1 (2001:db8:2::10), a łącze to 2001:db8:12::/64. Routery nie mają żadnych tras do cudzych sieci.' },
        {
          t: 'code',
          lines: ['R1(config)# ipv6 router ospf 1', 'R1(config-rtr)# router-id 1.1.1.1', 'R1(config-rtr)# interface g0/0/0', 'R1(config-if)# ipv6 ospf 1 area 0', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ipv6 ospf 1 area 0'],
          caption: 'OSPFv3 włączasz na interfejsie, a nie poleceniem network. Router-id dalej jest w formacie IPv4, a bez żadnego adresu IPv4 trzeba go wpisać ręcznie.',
        },
        { t: 'p', text: 'Zrób to samo na R2 z router-id 2.2.2.2. Potem na R1 skonfiguruj bezstanowe DHCPv6: adres komputery dalej budują z SLAAC, a z serwera biorą tylko DNS i domenę.' },
        {
          t: 'code',
          lines: ['R1(config)# ipv6 dhcp pool BIURO6', 'R1(config-dhcpv6)# dns-server 2001:db8:2::10', 'R1(config-dhcpv6)# domain-name firma.lan', 'R1(config-dhcpv6)# interface g0/0/0', 'R1(config-if)# ipv6 dhcp server BIURO6', 'R1(config-if)# ipv6 nd other-config-flag'],
          caption: 'Flaga O (other) mówi: adres zrób sam, resztę weź z DHCPv6. Flaga M (managed) kazałaby wziąć z DHCPv6 także adres.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na R1 sprawdź `show ipv6 ospf neighbor` i `show ipv6 route`. Trasy z OSPFv3 mają literę O, a następnym skokiem jest adres link-local sąsiada.',
            'Na PC1 wpisz `ipconfig /all` i znajdź serwer DNS z DHCPv6.',
            'Z PC1 wpisz `ping 2001:db8:2::10`.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Spróbuj dodać `ipv6 nd managed-config-flag` i adres prefix w puli. PC1 dostanie wtedy drugi adres, z DHCPv6, z maską /128.' },
      ],
      en: [
        { t: 'p', text: 'The IPv6 addresses on the routers are ready: R1 has the office network 2001:db8:1::/64, R2 the server network 2001:db8:2::/64 with SRV1 (2001:db8:2::10), and the link is 2001:db8:12::/64. The routers have no routes to other networks.' },
        {
          t: 'code',
          lines: ['R1(config)# ipv6 router ospf 1', 'R1(config-rtr)# router-id 1.1.1.1', 'R1(config-rtr)# interface g0/0/0', 'R1(config-if)# ipv6 ospf 1 area 0', 'R1(config-if)# interface g0/0/1', 'R1(config-if)# ipv6 ospf 1 area 0'],
          caption: 'You enable OSPFv3 on the interface, not with a network command. The router-id still looks like IPv4, and without any IPv4 address you have to set it by hand.',
        },
        { t: 'p', text: 'Do the same on R2 with router-id 2.2.2.2. Then configure stateless DHCPv6 on R1: computers still build their address with SLAAC and take only DNS and the domain from the server.' },
        {
          t: 'code',
          lines: ['R1(config)# ipv6 dhcp pool BIURO6', 'R1(config-dhcpv6)# dns-server 2001:db8:2::10', 'R1(config-dhcpv6)# domain-name firma.lan', 'R1(config-dhcpv6)# interface g0/0/0', 'R1(config-if)# ipv6 dhcp server BIURO6', 'R1(config-if)# ipv6 nd other-config-flag'],
          caption: 'The O (other) flag says: build the address yourself and take the rest from DHCPv6. The M (managed) flag would take the address from DHCPv6 too.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'On R1 run `show ipv6 ospf neighbor` and `show ipv6 route`. OSPFv3 routes have the letter O and the next hop is the neighbor’s link-local address.',
            'On PC1 run `ipconfig /all` and find the DNS server from DHCPv6.',
            'From PC1 run `ping 2001:db8:2::10`.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Try adding `ipv6 nd managed-config-flag` and an address prefix in the pool. PC1 then gets a second address from DHCPv6, with a /128 mask.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 260, 160);
      const r2 = b.add('router', 'R2', 520, 160);
      const sw1 = b.add('switch', 'SW1', 160, 320);
      const sw2 = b.add('switch', 'SW2', 620, 320);
      const pc1 = b.add('pc', 'PC1', 100, 460);
      const pc2 = b.add('pc', 'PC2', 240, 460);
      const srv = b.add('server', 'SRV1', 620, 460);
      b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r2, 'Gi0/0/0', sw2, 'Gi1/0/24').link(r1, 'Gi0/0/1', r2, 'Gi0/0/1');
      b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw1, 'Gi1/0/2').link(srv, 'eth0', sw2, 'Gi1/0/1');
      const address: [typeof r1, string, string][] = [
        [r1, 'Gi0/0/0', '2001:db8:1::1/64'],
        [r1, 'Gi0/0/1', '2001:db8:12::1/64'],
        [r2, 'Gi0/0/0', '2001:db8:2::1/64'],
        [r2, 'Gi0/0/1', '2001:db8:12::2/64'],
      ];
      for (const [router, name, cidr] of address) {
        const port = portByName(router, name);
        port.shutdown = false;
        port.ipv6 = [cidr];
      }
      r1.ipv6Routing = true;
      r2.ipv6Routing = true;
      for (const pc of [pc1, pc2]) pc.ports[0].dhcp = false;
      const srvPort = srv.ports[0];
      srvPort.ipv6 = ['2001:db8:2::10/64'];
      srvPort.gateway6 = '2001:db8:2::1';
      return b.net;
    },
    checks: [
      check('c1', ['R1 zna sieć 2001:db8:2::/64 z OSPFv3', 'R1 knows 2001:db8:2::/64 from OSPFv3'], ['ipv6 ospf 1 area 0 na obu interfejsach obu routerów i router-id w ipv6 router ospf 1.', 'ipv6 ospf 1 area 0 on both interfaces of both routers and a router-id under ipv6 router ospf 1.'], (c) => {
        const r1 = c.device('R1');
        return Boolean(r1 && c.sim.topo.lookup6(r1, parseIpv6('2001:db8:2::10')!)?.route.code === 'O');
      }),
      check('c2', ['R2 zna sieć 2001:db8:1::/64 z OSPFv3', 'R2 knows 2001:db8:1::/64 from OSPFv3'], ['Sieć biura musi być w OSPFv3 na R1 (interfejs Gi0/0/0).', 'The office network must be in OSPFv3 on R1 (interface Gi0/0/0).'], (c) => {
        const r2 = c.device('R2');
        return Boolean(r2 && c.sim.topo.lookup6(r2, parseIpv6('2001:db8:1::10')!)?.route.code === 'O');
      }),
      check('c3', ['PC1 dostaje DNS 2001:db8:2::10 z DHCPv6', 'PC1 gets DNS 2001:db8:2::10 from DHCPv6'], ['Pula z dns-server, ipv6 dhcp server na Gi0/0/0 i flaga O albo M.', 'A pool with dns-server, ipv6 dhcp server on Gi0/0/0 and the O or M flag.'], (c) => {
        const pc1 = c.device('PC1');
        return Boolean(pc1 && c.sim.topo.ip6Ifs(pc1).some((i) => i.dns6 === parseIpv6('2001:db8:2::10')));
      }),
      check('c4', ['PC1 pinguje SRV1 (2001:db8:2::10)', 'PC1 pings SRV1 (2001:db8:2::10)'], ['Ruch wraca tylko wtedy, gdy oba routery znają obie sieci.', 'Traffic returns only when both routers know both networks.'], (c) => c.ping('PC1', '2001:db8:2::10')),
    ],
  },
];
