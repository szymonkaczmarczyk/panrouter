import { l } from '../../i18n/l10n';
import { NetBuilder } from '../../sim/builder';
import { parseIp } from '../../sim/ip';
import type { VirtualIf } from '../../sim/types';
import type { Lab, LabContext } from '../types';
import { check } from './basic';

const SECURED = ['Gi1/0/1', 'Gi1/0/2'];

function bundledCount(c: LabContext, name: string): number {
  const device = c.device(name);
  if (!device) return 0;
  const channel = c.sim.topo.channels(device).find((g) => g.group === 1);
  return channel?.members.filter((m) => m.state === 'primary' || m.state === 'bundled').length ?? 0;
}

function vrrpActive(c: LabContext, name: string): boolean {
  const device = c.device(name);
  const entry = device && c.sim.topo.l3If(device, 'GigabitEthernet0/0/0');
  return Boolean(device && entry && c.sim.topo.fhrpOf(device, entry)?.active);
}

function viaTunnel(c: LabContext, router: string, target: string): boolean {
  const device = c.device(router);
  const ip = parseIp(target);
  if (!device || ip === null) return false;
  const found = c.sim.topo.lookup(device, ip);
  const exit = found && c.sim.topo.l3If(device, found.ifName);
  return Boolean(exit && exit.attach.kind === 'tunnel' && exit.up && (exit.cfg as VirtualIf).tunnelMode === 'ipsec');
}

export const EXPERT_LABS: Lab[] = [
  {
    id: 'etherchannel',
    level: 5,
    minutes: 15,
    title: l('EtherChannel: dwa kable jak jeden', 'EtherChannel: two cables as one'),
    summary: l('Połącz dwa łącza między przełącznikami w kanał LACP. STP przestanie blokować, a awaria kabla nie przerwie ruchu.', 'Bundle two links between switches into an LACP channel. STP stops blocking and a cable failure no longer stops traffic.'),
    goals: [l('Konfigurować channel-group i LACP', 'Configure channel-group and LACP'), l('Czytać show etherchannel summary', 'Read show etherchannel summary')],
    steps: {
      pl: [
        { t: 'p', text: 'SW1 i SW2 łączą dwa kable. STP blokuje jeden z nich, więc połowa przepustowości stoi bezczynnie. Oba łącza są też portami dostępowymi VLAN 1, przez co VLAN-y 10 i 20 nie przechodzą między przełącznikami.' },
        {
          t: 'code',
          lines: ['SW1(config)# interface range g1/0/23-24', 'SW1(config-if-range)# channel-group 1 mode active', 'SW1(config-if-range)# exit', 'SW1(config)# interface port-channel 1', 'SW1(config-if)# switchport mode trunk'],
          caption: 'To samo na SW2. Druga strona może mieć mode active albo passive.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Sprawdź `show etherchannel summary`. Litera P przy porcie oznacza, że jest w kanale, a Po1(SU) to działający kanał.',
            'Sprawdź `show spanning-tree`. Zamiast dwóch portów widać jeden Po1 i nic nie jest zablokowane.',
            'Odłącz jeden kabel narzędziem **Usuń** i sprawdź, że ping z PC1 do PC2 dalej działa.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Ustawienia kanału zmieniaj przez `interface port-channel 1`. Port z innymi ustawieniami niż reszta kanału zostanie zawieszony i w podsumowaniu dostanie literę s.' },
      ],
      en: [
        { t: 'p', text: 'SW1 and SW2 are joined by two cables. STP blocks one of them, so half of the bandwidth sits idle. Both links are also VLAN 1 access ports, so VLANs 10 and 20 do not cross between the switches.' },
        {
          t: 'code',
          lines: ['SW1(config)# interface range g1/0/23-24', 'SW1(config-if-range)# channel-group 1 mode active', 'SW1(config-if-range)# exit', 'SW1(config)# interface port-channel 1', 'SW1(config-if)# switchport mode trunk'],
          caption: 'Do the same on SW2. The other side can use mode active or passive.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Run `show etherchannel summary`. The letter P next to a port means it is in the channel and Po1(SU) is a working channel.',
            'Run `show spanning-tree`. Instead of two ports you see one Po1 and nothing is blocked.',
            'Remove one cable with the **Delete** tool and check that PC1 can still ping PC2.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Change channel settings through `interface port-channel 1`. A port with different settings from the rest of the channel gets suspended and shows the letter s in the summary.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const sw1 = b.add('switch', 'SW1', 220, 200);
      const sw2 = b.add('switch', 'SW2', 540, 200);
      const pc1 = b.add('pc', 'PC1', 120, 380);
      const pc3 = b.add('pc', 'PC3', 300, 400);
      const pc2 = b.add('pc', 'PC2', 460, 400);
      const pc4 = b.add('pc', 'PC4', 640, 380);
      b.link(sw1, 'Gi1/0/23', sw2, 'Gi1/0/23').link(sw1, 'Gi1/0/24', sw2, 'Gi1/0/24');
      b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc3, 'eth0', sw1, 'Gi1/0/2').link(pc2, 'eth0', sw2, 'Gi1/0/1').link(pc4, 'eth0', sw2, 'Gi1/0/2');
      for (const sw of [sw1, sw2]) {
        b.vlan(sw, 10, 'BIURO').vlan(sw, 20, 'KSIEGOWOSC');
        b.access(sw, 10, 'Gi1/0/1').access(sw, 20, 'Gi1/0/2');
      }
      b.host(pc1, '10.10.0.1/24').host(pc2, '10.10.0.2/24').host(pc3, '10.20.0.3/24').host(pc4, '10.20.0.4/24');
      return b.net;
    },
    checks: [
      check('c1', ['SW1 i SW2 mają kanał Po1 z dwoma aktywnymi portami', 'SW1 and SW2 have Po1 with two active ports'], ['channel-group 1 mode active na Gi1/0/23 i Gi1/0/24 obu przełączników.', 'channel-group 1 mode active on Gi1/0/23 and Gi1/0/24 of both switches.'], (c) => bundledCount(c, 'SW1') === 2 && bundledCount(c, 'SW2') === 2),
      check('c2', ['Kanał działa jako trunk', 'The channel runs as a trunk'], ['switchport mode trunk w interface port-channel 1 po obu stronach.', 'switchport mode trunk under interface port-channel 1 on both sides.'], (c) => ['SW1', 'SW2'].every((sw) => ['Gi1/0/23', 'Gi1/0/24'].every((p) => c.port(sw, p)?.mode === 'trunk'))),
      check('c3', ['STP niczego nie blokuje', 'STP blocks nothing'], ['Kanał widziany przez STP to jedno łącze.', 'STP sees the channel as a single link.'], (c) => c.stpBlockedOn('SW1') + c.stpBlockedOn('SW2') === 0),
      check('c4', ['PC1 pinguje PC2 (VLAN 10), a PC3 pinguje PC4 (VLAN 20)', 'PC1 pings PC2 (VLAN 10) and PC3 pings PC4 (VLAN 20)'], ['Oba VLAN-y muszą przechodzić przez trunk.', 'Both VLANs must cross the trunk.'], (c) => c.ping('PC1', '10.10.0.2') && c.ping('PC3', '10.20.0.4')),
      check('c5', ['Ruch przetrwa awarię jednego kabla', 'Traffic survives one cable failure'], ['Sprawdzarka odłącza Gi1/0/23 na kopii sieci.', 'The checker unplugs Gi1/0/23 on a copy of the network.'], (c) => {
        const f = c.fork();
        f.unplug('SW1', 'Gi1/0/23');
        return f.ping('PC1', '10.10.0.2') && f.ping('PC3', '10.20.0.4');
      }),
    ],
  },
  {
    id: 'vrrp',
    level: 5,
    minutes: 20,
    title: l('VRRP: brama, która nie pada', 'VRRP: a gateway that does not fail'),
    summary: l('Dwa routery udostępniają jedną wirtualną bramę. Gdy główny padnie, zapasowy przejmuje ruch, a komputery niczego nie zauważą.', 'Two routers share one virtual gateway. When the main one fails, the backup takes over and computers notice nothing.'),
    goals: [l('Konfigurować grupę VRRP i priorytet', 'Configure a VRRP group and priority'), l('Sprawdzać przełączenie po awarii', 'Verify failover')],
    steps: {
      pl: [
        { t: 'p', text: 'Komputery mają bramę 192.168.10.1, ale żaden router nie ma tego adresu. R1 (.2) i R2 (.3) mają razem udostępnić wirtualną bramę. R1 ma być głównym, a R2 zapasowym. Routing OSPF do serwera jest już gotowy.' },
        { t: 'code', lines: ['R1(config)# interface g0/0/0', 'R1(config-if)# vrrp 10 ip 192.168.10.1', 'R1(config-if)# vrrp 10 priority 120'], caption: 'Wyższy priorytet wygrywa. Domyślny to 100.' },
        { t: 'code', lines: ['R2(config)# interface g0/0/0', 'R2(config-if)# vrrp 10 ip 192.168.10.1'] },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na R1 i R2 sprawdź `show vrrp brief`. R1 ma stan Master, a R2 Backup.',
            'Na PC1 wpisz `tracert 172.16.0.10`. Pierwszy skok to 192.168.10.2, czyli R1.',
            'Na R1 wyłącz interfejs: `interface g0/0/0` i `shutdown`. Powtórz tracert. Teraz pierwszym skokiem jest R2.',
            'Włącz interfejs R1 z powrotem poleceniem `no shutdown`.',
          ],
        },
        { t: 'callout', kind: 'info', text: 'To samo zrobisz protokołem HSRP od Cisco: `standby 10 ip 192.168.10.1`, `standby 10 priority 120` i `standby 10 preempt`. W symulatorze główny router jest wybierany od razu, tak jakby preempt był zawsze włączony.' },
      ],
      en: [
        { t: 'p', text: 'Computers use gateway 192.168.10.1, but no router has that address. R1 (.2) and R2 (.3) should share a virtual gateway. R1 is the main router and R2 the backup. OSPF routing to the server is already set up.' },
        { t: 'code', lines: ['R1(config)# interface g0/0/0', 'R1(config-if)# vrrp 10 ip 192.168.10.1', 'R1(config-if)# vrrp 10 priority 120'], caption: 'The higher priority wins. The default is 100.' },
        { t: 'code', lines: ['R2(config)# interface g0/0/0', 'R2(config-if)# vrrp 10 ip 192.168.10.1'] },
        {
          t: 'list',
          ordered: true,
          items: [
            'Run `show vrrp brief` on R1 and R2. R1 is Master and R2 is Backup.',
            'On PC1 run `tracert 172.16.0.10`. The first hop is 192.168.10.2, which is R1.',
            'Shut down the R1 interface: `interface g0/0/0` and `shutdown`. Repeat tracert. Now the first hop is R2.',
            'Bring the R1 interface back with `no shutdown`.',
          ],
        },
        { t: 'callout', kind: 'info', text: 'Cisco HSRP does the same: `standby 10 ip 192.168.10.1`, `standby 10 priority 120` and `standby 10 preempt`. In the simulator the main router is chosen immediately, as if preempt were always on.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r3 = b.add('router', 'R3', 380, 70);
      const srv = b.add('server', 'SRV1', 620, 70);
      const r1 = b.add('router', 'R1', 220, 210);
      const r2 = b.add('router', 'R2', 540, 210);
      const sw = b.add('switch', 'SW1', 380, 340);
      const pc1 = b.add('pc', 'PC1', 260, 470);
      const pc2 = b.add('pc', 'PC2', 500, 470);
      b.link(r1, 'Gi0/0/0', sw, 'Gi1/0/23').link(r2, 'Gi0/0/0', sw, 'Gi1/0/24').link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
      b.link(r1, 'Gi0/0/1', r3, 'Gi0/0/0').link(r2, 'Gi0/0/1', r3, 'Gi0/0/1').link(srv, 'eth0', r3, 'Gi0/0/2');
      b.ip(r1, 'Gi0/0/0', '192.168.10.2/24').ip(r2, 'Gi0/0/0', '192.168.10.3/24');
      b.ip(r1, 'Gi0/0/1', '10.0.1.1/30').ip(r3, 'Gi0/0/0', '10.0.1.2/30');
      b.ip(r2, 'Gi0/0/1', '10.0.2.1/30').ip(r3, 'Gi0/0/1', '10.0.2.2/30');
      b.ip(r3, 'Gi0/0/2', '172.16.0.1/24');
      b.host(pc1, '192.168.10.50/24', '192.168.10.1').host(pc2, '192.168.10.51/24', '192.168.10.1').host(srv, '172.16.0.10/24', '172.16.0.1');
      srv.services.http = true;
      srv.web = { title: 'Intranet', body: 'Strona działa niezależnie od tego, który router jest bramą.' };
      const networks = [
        { net: '10.0.0.0', wildcard: '0.255.255.255' },
        { net: '192.168.10.0', wildcard: '0.0.0.255' },
        { net: '172.16.0.0', wildcard: '0.0.255.255' },
      ];
      for (const router of [r1, r2, r3]) b.ospf(router, networks);
      return b.net;
    },
    checks: [
      check('c1', ['R1 i R2 mają grupę VRRP 10 z adresem 192.168.10.1', 'R1 and R2 have VRRP group 10 with address 192.168.10.1'], ['vrrp 10 ip 192.168.10.1 na Gi0/0/0 obu routerów.', 'vrrp 10 ip 192.168.10.1 on Gi0/0/0 of both routers.'], (c) =>
        ['R1', 'R2'].every((r) => {
          const fhrp = c.port(r, 'Gi0/0/0')?.fhrp;
          return fhrp?.proto === 'vrrp' && fhrp.group === 10 && fhrp.ip === '192.168.10.1';
        }),
      ),
      check('c2', ['R1 jest routerem głównym (Master)', 'R1 is the main router (Master)'], ['Priorytet R1 wyższy niż 100, np. vrrp 10 priority 120.', 'R1 priority above 100, e.g. vrrp 10 priority 120.'], (c) => vrrpActive(c, 'R1')),
      check('c3', ['PC1 i PC2 pingują SRV1 przez wirtualną bramę', 'PC1 and PC2 ping SRV1 through the virtual gateway'], ['Brama komputerów to 192.168.10.1.', 'The computers use gateway 192.168.10.1.'], (c) => c.ping('PC1', '172.16.0.10') && c.ping('PC2', '172.16.0.10')),
      check('c4', ['Po awarii R1 ruch przejmuje R2', 'After R1 fails, R2 takes over'], ['Sprawdzarka wyłącza Gi0/0/0 na R1 w kopii sieci.', 'The checker shuts Gi0/0/0 on R1 in a copy of the network.'], (c) => {
        const f = c.fork();
        const port = f.port('R1', 'Gi0/0/0');
        if (!port) return false;
        port.shutdown = true;
        f.sim.invalidate();
        return vrrpActive(f, 'R2') && f.ping('PC1', '172.16.0.10');
      }),
    ],
  },
  {
    id: 'port-security',
    level: 5,
    minutes: 20,
    title: l('Port security: tylko swoje komputery', 'Port security: only your own computers'),
    summary: l('Ogranicz porty przełącznika do jednego zapamiętanego komputera. Obcy laptop wpięty do gniazdka wyłączy port.', 'Limit switch ports to one remembered computer. A stranger’s laptop plugged into the socket shuts the port down.'),
    goals: [l('Konfigurować port security i sticky', 'Configure port security and sticky'), l('Przywracać port ze stanu err-disabled', 'Recover a port from err-disabled')],
    steps: {
      pl: [
        { t: 'p', text: 'SW1 obsługuje gniazdka w otwartej przestrzeni biura. Każdy może wpiąć do nich własny laptop. Ogranicz porty komputerów PC1 i PC2 do jednego, zapamiętanego urządzenia.' },
        {
          t: 'code',
          lines: [
            'SW1(config)# interface range g1/0/1-2',
            'SW1(config-if-range)# switchport mode access',
            'SW1(config-if-range)# switchport port-security',
            'SW1(config-if-range)# switchport port-security maximum 1',
            'SW1(config-if-range)# switchport port-security mac-address sticky',
            'SW1(config-if-range)# switchport port-security violation shutdown',
          ],
          caption: 'Sticky zapisuje pierwszy adres MAC, który pojawi się na porcie, prosto do konfiguracji.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na PC1 i PC2 wpisz `ping 192.168.50.10`. Na SW1 sprawdź `show port-security interface g1/0/2` i `show running-config`.',
            'Czas na test. Narzędziem **Usuń** odłącz kabel PC2, a narzędziem **Połącz kablem** podłącz INTRUZ do Gi1/0/2.',
            'Na INTRUZ wpisz `ping 192.168.50.10`. Port przejdzie w stan err-disabled, a dioda zrobi się czerwona.',
            'Przywróć porządek. Podłącz PC2 z powrotem do Gi1/0/2, a na SW1 wpisz `interface g1/0/2`, `shutdown` i `no shutdown`.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'Sprawdzarka sama symuluje podłączenie intruza na kopii sieci. Test z punktów 2 i 3 jest dla Ciebie, nie do oceny.' },
      ],
      en: [
        { t: 'p', text: 'SW1 serves the sockets in an open-plan office. Anyone can plug in their own laptop. Limit the PC1 and PC2 ports to one remembered device each.' },
        {
          t: 'code',
          lines: [
            'SW1(config)# interface range g1/0/1-2',
            'SW1(config-if-range)# switchport mode access',
            'SW1(config-if-range)# switchport port-security',
            'SW1(config-if-range)# switchport port-security maximum 1',
            'SW1(config-if-range)# switchport port-security mac-address sticky',
            'SW1(config-if-range)# switchport port-security violation shutdown',
          ],
          caption: 'Sticky writes the first MAC address seen on the port straight into the configuration.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'On PC1 and PC2 run `ping 192.168.50.10`. On SW1 run `show port-security interface g1/0/2` and `show running-config`.',
            'Time for a test. Remove the PC2 cable with the **Delete** tool and connect INTRUZ to Gi1/0/2 with **Connect cable**.',
            'On INTRUZ run `ping 192.168.50.10`. The port goes err-disabled and its LED turns red.',
            'Clean up. Reconnect PC2 to Gi1/0/2 and on SW1 run `interface g1/0/2`, `shutdown` and `no shutdown`.',
          ],
        },
        { t: 'callout', kind: 'tip', text: 'The checker simulates the intruder on a copy of the network by itself. Steps 2 and 3 are for you, not for grading.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const sw = b.add('switch', 'SW1', 380, 210);
      const srv = b.add('server', 'SRV1', 380, 60);
      const pc1 = b.add('pc', 'PC1', 200, 390);
      const pc2 = b.add('pc', 'PC2', 380, 410);
      const intruder = b.add('laptop', 'INTRUZ', 600, 390);
      b.link(srv, 'eth0', sw, 'Gi1/0/24').link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
      b.host(srv, '192.168.50.10/24').host(pc1, '192.168.50.21/24').host(pc2, '192.168.50.22/24').host(intruder, '192.168.50.66/24');
      return b.net;
    },
    checks: [
      check('c1', ['Porty Gi1/0/1 i Gi1/0/2 mają włączone port security', 'Ports Gi1/0/1 and Gi1/0/2 have port security enabled'], ['switchport port-security na obu portach, wcześniej switchport mode access.', 'switchport port-security on both ports, after switchport mode access.'], (c) => SECURED.every((p) => c.port('SW1', p)?.portSecurity.enabled && c.port('SW1', p)?.mode === 'access')),
      check('c2', ['Limit to jeden adres MAC, a naruszenie wyłącza port', 'The limit is one MAC address and a violation shuts the port'], ['maximum 1 i violation shutdown.', 'maximum 1 and violation shutdown.'], (c) => SECURED.every((p) => c.port('SW1', p)?.portSecurity.maximum === 1 && c.port('SW1', p)?.portSecurity.violation === 'shutdown')),
      check('c3', ['Przełącznik zapamiętuje komputery w konfiguracji (sticky)', 'The switch remembers the computers in its configuration (sticky)'], ['switchport port-security mac-address sticky.', 'switchport port-security mac-address sticky.'], (c) => {
        const f = c.fork();
        f.ping('PC1', '192.168.50.10');
        f.ping('PC2', '192.168.50.10');
        return ['PC1', 'PC2'].every((pc, i) => f.port('SW1', SECURED[i])?.portSecurity.stickyMacs.includes(f.device(pc)?.ports[0].mac ?? ''));
      }),
      check('c4', ['Obcy laptop na porcie PC2 wyłącza ten port', 'A stranger’s laptop on the PC2 port shuts it down'], ['Sprawdzarka podłącza INTRUZ zamiast PC2 na kopii sieci.', 'The checker plugs INTRUZ in place of PC2 on a copy of the network.'], (c) => {
        const f = c.fork();
        f.ping('PC2', '192.168.50.10');
        f.unplug('PC2', 'eth0');
        f.plug('INTRUZ', 'eth0', 'SW1', 'Gi1/0/2');
        return !f.ping('INTRUZ', '192.168.50.10') && Boolean(f.port('SW1', 'Gi1/0/2')?.errDisabled);
      }),
      check('c5', ['PC1 i PC2 pingują SRV1, a porty działają', 'PC1 and PC2 ping SRV1 and the ports are up'], ['Po teście podłącz PC2 z powrotem i zrób shutdown oraz no shutdown na Gi1/0/2.', 'After the test reconnect PC2 and run shutdown and no shutdown on Gi1/0/2.'], (c) =>
        SECURED.every((p) => !c.port('SW1', p)?.errDisabled) && c.ping('PC1', '192.168.50.10') && c.ping('PC2', '192.168.50.10'),
      ),
    ],
  },
  {
    id: 'dhcp-snooping',
    level: 5,
    minutes: 15,
    title: l('DHCP snooping: fałszywy serwer', 'DHCP snooping: a rogue server'),
    summary: l('Ktoś podłączył domowy router, który rozdaje złe adresy. Zablokuj go przez DHCP snooping.', 'Someone plugged in a home router that hands out wrong addresses. Block it with DHCP snooping.'),
    goals: [l('Konfigurować DHCP snooping i porty zaufane', 'Configure DHCP snooping and trusted ports'), l('Czytać tablicę powiązań snoopingu', 'Read the snooping binding table')],
    steps: {
      pl: [
        { t: 'p', text: 'Użytkownicy zgłaszają, że od rana nie działa sieć. PC1 ma adres 192.168.1.x zamiast 192.168.60.x. Ktoś wpiął do gniazdka domowy router Wi-Fi (ROGUE), który odpowiada na DHCP szybciej niż R1.' },
        { t: 'list', items: ['Na PC1 wpisz `ipconfig /all` i sprawdź, kto jest serwerem DHCP i jaką masz bramę.'] },
        {
          t: 'code',
          lines: ['SW1(config)# ip dhcp snooping', 'SW1(config)# ip dhcp snooping vlan 1', 'SW1(config)# interface g1/0/24', 'SW1(config-if)# ip dhcp snooping trust'],
          caption: 'Zaufany jest tylko port w stronę prawdziwego serwera. Wszystkie pozostałe porty są domyślnie niezaufane.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na PC1 i PC2 wpisz `ipconfig /release`, a potem `ipconfig /renew`.',
            'Na SW1 sprawdź `show ip dhcp snooping binding`.',
            'W trybie symulacji zobaczysz, jak SW1 odrzuca DHCPOFFER od ROGUE.',
          ],
        },
        { t: 'callout', kind: 'info', text: 'Prawdziwe przełączniki Cisco dopisują do zapytań opcję 82. Gdy serwerem DHCP jest router Cisco, często trzeba dodać `no ip dhcp snooping information option`. Symulator przyjmuje to polecenie, ale niczego ono nie zmienia.' },
      ],
      en: [
        { t: 'p', text: 'Users report that the network has been down since the morning. PC1 has a 192.168.1.x address instead of 192.168.60.x. Someone plugged a home Wi-Fi router (ROGUE) into a socket, and it answers DHCP faster than R1.' },
        { t: 'list', items: ['On PC1 run `ipconfig /all` and check which DHCP server and gateway you got.'] },
        {
          t: 'code',
          lines: ['SW1(config)# ip dhcp snooping', 'SW1(config)# ip dhcp snooping vlan 1', 'SW1(config)# interface g1/0/24', 'SW1(config-if)# ip dhcp snooping trust'],
          caption: 'Only the port towards the real server is trusted. Every other port is untrusted by default.',
        },
        {
          t: 'list',
          ordered: true,
          items: ['On PC1 and PC2 run `ipconfig /release` and then `ipconfig /renew`.', 'On SW1 run `show ip dhcp snooping binding`.', 'In simulation mode you can watch SW1 drop the DHCPOFFER from ROGUE.'],
        },
        { t: 'callout', kind: 'info', text: 'Real Cisco switches add option 82 to requests. When the DHCP server is a Cisco router you often need `no ip dhcp snooping information option`. The simulator accepts this command, but it changes nothing.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const r1 = b.add('router', 'R1', 380, 70);
      const sw = b.add('switch', 'SW1', 380, 230);
      const rogue = b.add('homeRouter', 'ROGUE', 620, 230);
      const pc1 = b.add('pc', 'PC1', 240, 400);
      const pc2 = b.add('pc', 'PC2', 520, 400);
      b.link(r1, 'Gi0/0/0', sw, 'Gi1/0/24').link(rogue, 'LAN1', sw, 'Gi1/0/12').link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
      b.ip(r1, 'Gi0/0/0', '192.168.60.1/24').pool(r1, 'BIURO', '192.168.60.0/24', '192.168.60.1');
      r1.dhcpExcluded.push({ from: '192.168.60.1', to: '192.168.60.9' });
      rogue.wifi = null;
      return b.net;
    },
    checks: [
      check('c1', ['DHCP snooping działa w VLAN 1', 'DHCP snooping runs in VLAN 1'], ['ip dhcp snooping i ip dhcp snooping vlan 1.', 'ip dhcp snooping and ip dhcp snooping vlan 1.'], (c) => Boolean(c.device('SW1')?.dhcpSnooping.enabled && c.device('SW1')?.dhcpSnooping.vlans.includes(1))),
      check('c2', ['Port do R1 jest zaufany, a port ROGUE nie', 'The R1 port is trusted and the ROGUE port is not'], ['ip dhcp snooping trust tylko na Gi1/0/24.', 'ip dhcp snooping trust on Gi1/0/24 only.'], (c) => Boolean(c.port('SW1', 'Gi1/0/24')?.dhcpTrust && !c.port('SW1', 'Gi1/0/12')?.dhcpTrust)),
      check('c3', ['PC1 i PC2 mają adresy od R1', 'PC1 and PC2 have addresses from R1'], ['ipconfig /release i ipconfig /renew na obu komputerach.', 'ipconfig /release and ipconfig /renew on both computers.'], (c) => ['PC1', 'PC2'].every((pc) => c.inSubnet(c.port(pc, 'eth0')?.ip ?? '', '192.168.60.0/24'))),
      check('c4', ['ROGUE nie może już rozdawać adresów', 'ROGUE can no longer hand out addresses'], ['Sprawdzarka odłącza R1 na kopii sieci i prosi o adres.', 'The checker unplugs R1 on a copy of the network and requests an address.'], (c) => {
        const f = c.fork();
        f.unplug('R1', 'Gi0/0/0');
        const pc = f.device('PC1');
        return Boolean(pc && f.sim.dhcpRenew(pc.id).apipa);
      }),
      check('c5', ['PC1 pinguje bramę 192.168.60.1', 'PC1 pings gateway 192.168.60.1'], ['Brama przychodzi z DHCP razem z adresem.', 'The gateway comes from DHCP together with the address.'], (c) => c.ping('PC1', '192.168.60.1')),
    ],
  },
  {
    id: 'vpn-ipsec',
    level: 5,
    minutes: 30,
    title: l('VPN IPsec między oddziałami', 'IPsec VPN between branches'),
    summary: l('Dwa oddziały mają prywatne sieci, a dostawca internetu ich nie zna. Zestaw szyfrowany tunel IPsec i poprowadź nim ruch.', 'Two branches have private networks that the internet provider does not know. Build an encrypted IPsec tunnel and route traffic through it.'),
    goals: [l('Konfigurować tunel VTI z IPsec', 'Configure a VTI tunnel with IPsec'), l('Rozumieć, co widać po drodze w ruchu szyfrowanym', 'Understand what is visible on the way in encrypted traffic')],
    steps: {
      pl: [
        { t: 'p', text: 'Oddział A (R1) ma sieć 192.168.1.0/24, oddział B (R2) sieć 192.168.2.0/24 z serwerem SRV2 (192.168.2.10). Oba routery mają publiczne adresy u dostawcy (ISP) i trasę domyślną do niego. ISP nie przepuści prywatnych adresów, więc PC1 nie widzi SRV2.' },
        {
          t: 'code',
          lines: [
            'R1(config)# crypto isakmp key Oddzialy2026 address 198.51.100.1',
            'R1(config)# crypto ipsec profile VPN',
            'R1(ipsec-profile)# exit',
            'R1(config)# interface Tunnel0',
            'R1(config-if)# ip address 10.255.0.1 255.255.255.252',
            'R1(config-if)# tunnel source g0/0/1',
            'R1(config-if)# tunnel mode ipsec ipv4',
            'R1(config-if)# tunnel destination 198.51.100.1',
            'R1(config-if)# tunnel protection ipsec profile VPN',
            'R1(config-if)# exit',
            'R1(config)# ip route 192.168.2.0 255.255.255.0 10.255.0.2',
          ],
          caption: 'Klucz (pre-shared key) musi być identyczny po obu stronach. Tunel ma własną małą sieć 10.255.0.0/30.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Na R2 zrób lustrzaną konfigurację: klucz dla 203.0.113.1, Tunnel0 z adresem 10.255.0.2, cel 203.0.113.1 i trasa do 192.168.1.0/24 przez 10.255.0.1.',
            'Na R1 sprawdź `show ip interface brief` (Tunnel0 ma być up/up) i `show crypto isakmp sa`.',
            'Z PC1 wyślij ping do 192.168.2.10, a potem w trybie symulacji otwórz analizator (klawisz A). Między routerami a ISP zobaczysz tylko ESP z adresami routerów.',
          ],
        },
        { t: 'callout', kind: 'warn', text: 'Gdy klucze się różnią, tunel zostaje w stanie down, a show crypto isakmp sa pokazuje MM_KEY_EXCH. W prawdziwej sieci to najczęstsza przyczyna niedziałającego VPN.' },
      ],
      en: [
        { t: 'p', text: 'Branch A (R1) has 192.168.1.0/24 and branch B (R2) has 192.168.2.0/24 with server SRV2 (192.168.2.10). Both routers have public addresses at the provider (ISP) and a default route to it. The ISP will not carry private addresses, so PC1 cannot see SRV2.' },
        {
          t: 'code',
          lines: [
            'R1(config)# crypto isakmp key Oddzialy2026 address 198.51.100.1',
            'R1(config)# crypto ipsec profile VPN',
            'R1(ipsec-profile)# exit',
            'R1(config)# interface Tunnel0',
            'R1(config-if)# ip address 10.255.0.1 255.255.255.252',
            'R1(config-if)# tunnel source g0/0/1',
            'R1(config-if)# tunnel mode ipsec ipv4',
            'R1(config-if)# tunnel destination 198.51.100.1',
            'R1(config-if)# tunnel protection ipsec profile VPN',
            'R1(config-if)# exit',
            'R1(config)# ip route 192.168.2.0 255.255.255.0 10.255.0.2',
          ],
          caption: 'The pre-shared key must be identical on both sides. The tunnel has its own small network 10.255.0.0/30.',
        },
        {
          t: 'list',
          ordered: true,
          items: [
            'Mirror the configuration on R2: the key for 203.0.113.1, Tunnel0 with 10.255.0.2, destination 203.0.113.1 and a route to 192.168.1.0/24 via 10.255.0.1.',
            'On R1 check `show ip interface brief` (Tunnel0 must be up/up) and `show crypto isakmp sa`.',
            'Ping 192.168.2.10 from PC1, then open the analyzer in simulation mode (key A). Between the routers and the ISP you will see only ESP with router addresses.',
          ],
        },
        { t: 'callout', kind: 'warn', text: 'When the keys differ, the tunnel stays down and show crypto isakmp sa shows MM_KEY_EXCH. In real networks this is the most common reason a VPN does not work.' },
      ],
    },
    build: () => {
      const b = new NetBuilder();
      const pc1 = b.add('pc', 'PC1', 80, 300);
      const r1 = b.add('router', 'R1', 260, 300);
      const isp = b.add('router', 'ISP', 440, 160);
      const r2 = b.add('router', 'R2', 620, 300);
      const srv = b.add('server', 'SRV2', 800, 300);
      b.link(pc1, 'eth0', r1, 'Gi0/0/0').link(r1, 'Gi0/0/1', isp, 'Gi0/0/0').link(isp, 'Gi0/0/1', r2, 'Gi0/0/1').link(r2, 'Gi0/0/0', srv, 'eth0');
      b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '203.0.113.1/30');
      b.ip(isp, 'Gi0/0/0', '203.0.113.2/30').ip(isp, 'Gi0/0/1', '198.51.100.2/30');
      b.ip(r2, 'Gi0/0/1', '198.51.100.1/30').ip(r2, 'Gi0/0/0', '192.168.2.1/24');
      b.host(pc1, '192.168.1.10/24', '192.168.1.1').host(srv, '192.168.2.10/24', '192.168.2.1');
      r1.routes.push({ net: '0.0.0.0', prefix: 0, via: '203.0.113.2', iface: '', ad: 1 });
      r2.routes.push({ net: '0.0.0.0', prefix: 0, via: '198.51.100.2', iface: '', ad: 1 });
      return b.net;
    },
    checks: [
      check('c1', ['Tunnel0 na R1 działa w trybie IPsec', 'Tunnel0 on R1 is up in IPsec mode'], ['Ten sam klucz po obu stronach, tunnel mode ipsec ipv4 i tunnel protection ipsec profile.', 'The same key on both sides, tunnel mode ipsec ipv4 and tunnel protection ipsec profile.'], (c) => {
        const r1 = c.device('R1');
        const tunnel = r1?.vifs.find((v) => v.kind === 'tunnel' && v.tunnelMode === 'ipsec');
        return Boolean(r1 && tunnel && c.sim.topo.l3If(r1, tunnel.name)?.up);
      }),
      check('c2', ['R1 wysyła ruch do 192.168.2.0/24 przez tunel', 'R1 sends traffic for 192.168.2.0/24 through the tunnel'], ['Trasa statyczna do sieci oddziału B przez adres drugiego końca tunelu.', 'A static route to branch B through the far end of the tunnel.'], (c) => viaTunnel(c, 'R1', '192.168.2.10')),
      check('c3', ['R2 odsyła ruch do 192.168.1.0/24 przez tunel', 'R2 sends traffic for 192.168.1.0/24 back through the tunnel'], ['Bez trasy powrotnej odpowiedź nie wróci.', 'Without a return route the reply cannot come back.'], (c) => viaTunnel(c, 'R2', '192.168.1.10')),
      check('c4', ['PC1 pinguje SRV2 (192.168.2.10)', 'PC1 pings SRV2 (192.168.2.10)'], ['Pierwsze pakiety mogą zginąć, zanim routery poznają adresy MAC.', 'The first packets may be lost while routers learn MAC addresses.'], (c) => c.ping('PC1', '192.168.2.10')),
    ],
  },
];
