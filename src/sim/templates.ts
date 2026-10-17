import { l, type L10n } from '../i18n/l10n';
import { NetBuilder } from './builder';
import { emptyNetwork } from './network';
import type { Network } from './types';

export interface Template {
  id: string;
  title: L10n;
  summary: L10n;
  build: () => Network;
}

function homeNetwork(): Network {
  const b = new NetBuilder();
  const isp = b.add('internet', 'ISP', 760, 200);
  b.add('homeRouter', 'GW1', 500, 200);
  const gw = b.net.devices[1];
  const pc = b.add('pc', 'PC1', 300, 80);
  const laptop = b.add('laptop', 'LAPTOP1', 360, 360);
  const phone = b.add('phone', 'TEL1', 560, 400);
  const printer = b.add('printer', 'PRN1', 260, 230);
  b.link(gw, 'WAN', isp, 'port0').link(pc, 'eth0', gw, 'LAN1').link(printer, 'eth0', gw, 'LAN2');
  gw.wifi = { ssid: 'Dom', security: 'wpa3', key: 'Haslo-Do-Sieci-1', band: '5', vlan: 1 };
  laptop.wifiClient = { ssid: 'Dom', key: 'Haslo-Do-Sieci-1' };
  phone.wifiClient = { ssid: 'Dom', key: 'Haslo-Do-Sieci-1' };
  return b.net;
}

function smallOffice(): Network {
  const b = new NetBuilder();
  const isp = b.add('internet', 'ISP', 860, 160);
  const r1 = b.add('router', 'R1', 640, 160);
  const sw = b.add('switch', 'SW1', 420, 260);
  const srv = b.add('server', 'SRV1', 640, 380);
  const ap = b.add('ap', 'AP1', 260, 420);
  const pc1 = b.add('pc', 'PC1', 200, 140);
  const pc2 = b.add('pc', 'PC2', 340, 100);
  const cam = b.add('camera', 'CAM1', 500, 460);
  const laptop = b.add('laptop', 'LAPTOP1', 140, 540);
  b.link(r1, 'Gi0/0/1', isp, 'port0').link(r1, 'Gi0/0/0', sw, 'Gi1/0/24');
  b.link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2').link(srv, 'eth0', sw, 'Gi1/0/10').link(ap, 'eth0', sw, 'Gi1/0/20').link(cam, 'eth0', sw, 'Gi1/0/21');
  b.ip(r1, 'Gi0/0/0', '192.168.10.1/24').up(r1, 'Gi0/0/1');
  r1.ports[1].dhcp = true;
  r1.ports[1].nat = 'outside';
  r1.ports[0].nat = 'inside';
  r1.acls.push({ name: '1', type: 'standard', entries: [{ action: 'permit', proto: 'ip', src: { any: false, ip: '192.168.10.0', wildcard: '0.0.0.255' }, dst: { any: true, ip: '', wildcard: '' }, srcPort: null, dstPort: null, icmpType: '', remark: '' }] });
  r1.nat.push({ kind: 'pat', acl: '1', iface: 'GigabitEthernet0/0/1' });
  b.pool(r1, 'BIURO', '192.168.10.0/24', '192.168.10.1', '192.168.10.10');
  r1.dhcpExcluded.push({ from: '192.168.10.1', to: '192.168.10.49' });
  b.host(srv, '192.168.10.10/24', '192.168.10.1', '198.51.100.53');
  srv.services = { dhcp: false, dns: true, http: true };
  srv.dnsRecords = [{ name: 'intranet.firma.lan', type: 'A', value: '192.168.10.10' }];
  srv.web = { title: 'Intranet firmy', body: 'Witaj w sieci biura.' };
  ap.wifi = { ssid: 'Biuro', security: 'wpa3', key: 'Haslo-Do-Sieci-1', band: '6', vlan: 1 };
  laptop.wifiClient = { ssid: 'Biuro', key: 'Haslo-Do-Sieci-1' };
  return b.net;
}

function twoBranches(): Network {
  const b = new NetBuilder();
  const r1 = b.add('router', 'R1', 300, 200);
  const r2 = b.add('router', 'R2', 600, 200);
  const sw1 = b.add('switch', 'SW1', 160, 340);
  const sw2 = b.add('switch', 'SW2', 740, 340);
  const pc1 = b.add('pc', 'PC1', 80, 480);
  const pc2 = b.add('pc', 'PC2', 240, 480);
  const pc3 = b.add('pc', 'PC3', 680, 480);
  const srv = b.add('server', 'SRV2', 820, 480);
  b.link(r1, 'Te0/1/0', r2, 'Te0/1/0').link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r2, 'Gi0/0/0', sw2, 'Gi1/0/24');
  b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw1, 'Gi1/0/2').link(pc3, 'eth0', sw2, 'Gi1/0/1').link(srv, 'eth0', sw2, 'Gi1/0/2');
  b.ip(r1, 'Te0/1/0', '10.0.12.1/30').ip(r1, 'Gi0/0/0', '192.168.1.1/24');
  b.ip(r2, 'Te0/1/0', '10.0.12.2/30').ip(r2, 'Gi0/0/0', '192.168.2.1/24');
  b.ospf(r1, [{ net: '10.0.12.0', wildcard: '0.0.0.3' }, { net: '192.168.1.0', wildcard: '0.0.0.255' }]);
  b.ospf(r2, [{ net: '10.0.12.0', wildcard: '0.0.0.3' }, { net: '192.168.2.0', wildcard: '0.0.0.255' }]);
  r1.ospf!.passive = ['GigabitEthernet0/0/0'];
  r2.ospf!.passive = ['GigabitEthernet0/0/0'];
  b.host(pc1, '192.168.1.10/24', '192.168.1.1').host(pc2, '192.168.1.11/24', '192.168.1.1');
  b.host(pc3, '192.168.2.10/24', '192.168.2.1').host(srv, '192.168.2.20/24', '192.168.2.1');
  srv.services.http = true;
  srv.web = { title: 'Serwer oddziału 2', body: 'Ruch dotarł przez OSPF.' };
  return b.net;
}

function campus(): Network {
  const b = new NetBuilder();
  const isp = b.add('internet', 'ISP', 960, 120);
  const fw = b.add('firewall', 'FW1', 760, 120);
  const core = b.add('l3switch', 'DSW1', 520, 200);
  const as1 = b.add('switch', 'SW1', 320, 340);
  const as2 = b.add('switch', 'SW2', 720, 340);
  const pc1 = b.add('pc', 'PC1', 200, 480);
  const pc2 = b.add('pc', 'PC2', 380, 480);
  const voip = b.add('voip', 'VOIP1', 640, 480);
  const srv = b.add('server', 'SRV1', 820, 480);
  b.link(fw, 'eth1/1', isp, 'port0').link(fw, 'eth1/2', core, 'Gi1/0/24');
  b.link(core, 'Gi1/0/1', as1, 'Gi1/0/24').link(core, 'Gi1/0/2', as2, 'Gi1/0/24');
  b.link(pc1, 'eth0', as1, 'Gi1/0/1').link(pc2, 'eth0', as1, 'Gi1/0/2').link(voip, 'eth0', as2, 'Gi1/0/1').link(srv, 'eth0', as2, 'Gi1/0/10');
  for (const sw of [core, as1, as2]) b.vlan(sw, 10, 'BIURO').vlan(sw, 20, 'TELEFONY').vlan(sw, 30, 'SERWERY');
  b.trunk(as1, ['Gi1/0/24']).trunk(as2, ['Gi1/0/24']).trunk(core, ['Gi1/0/1', 'Gi1/0/2']);
  b.access(as1, 10, 'Gi1/0/1', 'Gi1/0/2').access(as2, 20, 'Gi1/0/1').access(as2, 30, 'Gi1/0/10');
  core.ipRouting = true;
  b.svi(core, 10, '10.10.10.1/24').svi(core, 20, '10.10.20.1/24').svi(core, 30, '10.10.30.1/24');
  const uplink = core.ports.find((p) => p.short === 'Gi1/0/24')!;
  uplink.switchport = false;
  uplink.ip = '10.0.0.2';
  uplink.prefix = 30;
  b.route(core, '0.0.0.0/0', '10.0.0.1');
  for (const vif of core.vifs) if (vif.vlan === 10 || vif.vlan === 20) vif.helper = '10.10.30.10';
  b.host(srv, '10.10.30.10/24', '10.10.30.1', '198.51.100.53');
  srv.services = { dhcp: true, dns: false, http: true };
  b.pool(srv, 'BIURO', '10.10.10.0/24', '10.10.10.1', '198.51.100.53').pool(srv, 'TELEFONY', '10.10.20.0/24', '10.10.20.1', '198.51.100.53');
  srv.dhcpExcluded = [{ from: '10.10.10.1', to: '10.10.10.20' }, { from: '10.10.20.1', to: '10.10.20.20' }];
  srv.web = { title: 'Portal kampusu', body: 'Serwer w VLAN 30.' };
  b.ip(fw, 'eth1/2', '10.0.0.1/30');
  fw.ports[0].dhcp = true;
  fw.ports[0].zone = 'outside';
  fw.ports[1].zone = 'inside';
  fw.routes.push({ net: '10.10.0.0', prefix: 16, via: '10.0.0.2', iface: '', ad: 1 });
  return b.net;
}

export const TEMPLATES: Template[] = [
  {
    id: 'empty',
    title: l('Pusta plansza', 'Empty canvas'),
    summary: l('Zacznij od zera i przeciągnij urządzenia z palety.', 'Start from scratch and drag devices from the palette.'),
    build: emptyNetwork,
  },
  {
    id: 'home',
    title: l('Sieć domowa', 'Home network'),
    summary: l('Router Wi-Fi 7, komputer, drukarka, laptop i telefon przez Wi-Fi, internet od dostawcy.', 'A Wi-Fi 7 router, a PC, a printer, a laptop and a phone on Wi-Fi, internet from the provider.'),
    build: homeNetwork,
  },
  {
    id: 'office',
    title: l('Małe biuro', 'Small office'),
    summary: l('Router z NAT i DHCP, przełącznik PoE, serwer DNS i WWW, punkt dostępowy i kamera IP.', 'A router with NAT and DHCP, a PoE switch, a DNS and web server, an access point and an IP camera.'),
    build: smallOffice,
  },
  {
    id: 'branches',
    title: l('Dwa oddziały z OSPF', 'Two branches with OSPF'),
    summary: l('Dwa routery połączone światłowodem 10 Gb/s, routing dynamiczny OSPF między sieciami.', 'Two routers linked by 10 Gb/s fiber, OSPF dynamic routing between the networks.'),
    build: twoBranches,
  },
  {
    id: 'campus',
    title: l('Kampus z VLAN-ami', 'Campus with VLANs'),
    summary: l('Przełącznik warstwy 3, trzy VLAN-y, przekaźnik DHCP, serwer i zapora NGFW na brzegu.', 'A layer 3 switch, three VLANs, a DHCP relay, a server and an NGFW at the edge.'),
    build: campus,
  },
];
