import { describe, expect, it } from 'vitest';
import { EXAM_LAB } from '../../src/content/exam';
import { LABS } from '../../src/content/labs';
import { makeLabContext } from '../../src/content/labs/context';
import { cliExecute, newSession } from '../../src/sim/cli/ios';
import { Simulator } from '../../src/sim/engine';
import { connect, findDeviceByName } from '../../src/sim/network';
import type { Network } from '../../src/sim/types';

function cli(sim: Simulator, name: string, lines: string[]) {
  const dev = findDeviceByName(sim.net, name)!;
  const session = newSession(dev.id);
  for (const line of ['enable', 'configure terminal', ...lines, 'end']) {
    const result = cliExecute(sim, session, line);
    const bad = result.lines.find((l) => l.includes('Invalid input') || l.includes('Incomplete') || l.includes('Ambiguous'));
    if (bad) throw new Error(`${name}: ${line} -> ${bad}`);
    if (result.changed) sim.invalidate();
  }
}

function dev(net: Network, name: string) {
  return findDeviceByName(net, name)!;
}

function setHost(net: Network, name: string, ip: string, prefix: number, gateway = '') {
  const port = dev(net, name).ports[0];
  Object.assign(port, { dhcp: false, ip, prefix, gateway });
}

const SOLUTIONS: Record<string, (sim: Simulator) => void> = {
  'pierwsza-siec': (sim) => {
    const n = sim.net;
    connect(n, { dev: dev(n, 'PC1').id, port: 'eth0' }, { dev: dev(n, 'SW1').id, port: 'GigabitEthernet1/0/1' }, 'copper');
    connect(n, { dev: dev(n, 'PC2').id, port: 'eth0' }, { dev: dev(n, 'SW1').id, port: 'GigabitEthernet1/0/2' }, 'copper');
    setHost(n, 'PC1', '192.168.1.10', 24);
    setHost(n, 'PC2', '192.168.1.20', 24);
  },
  'siec-domowa': (sim) => {
    const n = sim.net;
    connect(n, { dev: dev(n, 'GW1').id, port: 'WAN' }, { dev: dev(n, 'ISP').id, port: 'port0' }, 'copper');
    connect(n, { dev: dev(n, 'PC1').id, port: 'eth0' }, { dev: dev(n, 'GW1').id, port: 'LAN1' }, 'copper');
    dev(n, 'GW1').wifi = { ssid: 'MojDom', security: 'wpa3', key: 'Bardzo-Dlugie-Haslo', band: '5', vlan: 1 };
    dev(n, 'LAPTOP1').wifiClient = { ssid: 'MojDom', key: 'Bardzo-Dlugie-Haslo' };
    dev(n, 'TEL1').wifiClient = { ssid: 'MojDom', key: 'Bardzo-Dlugie-Haslo' };
  },
  'arp-krok-po-kroku': (sim) => {
    sim.echo(dev(sim.net, 'PC1').id, 0xc0a8011e);
  },
  'dwie-sieci': (sim) => {
    cli(sim, 'R1', ['int g0/0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'int g0/0/1', 'ip address 192.168.2.1 255.255.255.0', 'no shutdown']);
    dev(sim.net, 'PC2').ports[0].gateway = '192.168.2.1';
  },
  podsieci: (sim) => {
    cli(sim, 'R1', ['int g0/0/0', 'ip add 172.16.0.1 255.255.255.128', 'no sh', 'int g0/0/1', 'ip add 172.16.0.129 255.255.255.192', 'no sh', 'int g0/0/2', 'ip add 172.16.0.193 255.255.255.224', 'no sh']);
    setHost(sim.net, 'PC-A', '172.16.0.126', 25, '172.16.0.1');
    setHost(sim.net, 'PC-B', '172.16.0.190', 26, '172.16.0.129');
    setHost(sim.net, 'PC-C', '172.16.0.222', 27, '172.16.0.193');
  },
  'routing-statyczny': (sim) => {
    cli(sim, 'R1', ['ip route 0.0.0.0 0.0.0.0 10.0.12.2']);
    cli(sim, 'R3', ['ip route 0.0.0.0 0.0.0.0 10.0.23.1']);
    cli(sim, 'R2', ['ip route 10.1.0.0 255.255.255.0 10.0.12.1', 'ip route 10.3.0.0 255.255.255.0 10.0.23.2']);
  },
  vlan: (sim) => {
    cli(sim, 'SW1', ['vlan 10', 'name BIURO', 'vlan 20', 'name GOSCIE', 'interface range g1/0/1 - 2', 'switchport mode access', 'switchport access vlan 10', 'interface range g1/0/3 - 4', 'switchport mode access', 'switchport access vlan 20']);
  },
  'inter-vlan': (sim) => {
    cli(sim, 'SW1', ['int g1/0/24', 'switchport mode trunk']);
    cli(sim, 'R1', ['int g0/0/0', 'no shut', 'int g0/0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'int g0/0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0']);
  },
  'dhcp-przekaznik': (sim) => {
    const srv = dev(sim.net, 'SRV1');
    srv.dhcpPools.push({ name: 'LAN10', network: '192.168.10.0', prefix: 24, router: '192.168.10.1', dns: '192.168.10.10', domain: '' });
    srv.dhcpPools.push({ name: 'LAN20', network: '192.168.20.0', prefix: 24, router: '192.168.20.1', dns: '192.168.10.10', domain: '' });
    srv.dhcpExcluded.push({ from: '192.168.10.1', to: '192.168.10.20' });
    cli(sim, 'R1', ['int g0/0/1', 'ip helper-address 192.168.10.10']);
  },
  ospf: (sim) => {
    for (const r of ['R1', 'R2', 'R3']) cli(sim, r, ['router ospf 1', 'network 10.0.0.0 0.255.255.255 area 0', 'passive-interface g0/0/0']);
  },
  nat: (sim) => {
    cli(sim, 'R1', ['int g0/0/1', 'ip address dhcp', 'no shutdown', 'ip nat outside', 'int g0/0/0', 'ip nat inside', 'exit', 'access-list 1 permit 192.168.1.0 0.0.0.255', 'ip nat inside source list 1 interface g0/0/1 overload']);
  },
  acl: (sim) => {
    cli(sim, 'R1', [
      'ip access-list extended SERWER',
      'deny ip host 192.168.1.200 any',
      'deny icmp any host 10.0.0.10 echo',
      'permit tcp 192.168.1.0 0.0.0.255 host 10.0.0.10 eq 443',
      'permit tcp 192.168.1.0 0.0.0.255 host 10.0.0.10 eq 80',
      'permit ip any any',
      'exit',
      'int g0/0/0',
      'ip access-group SERWER in',
    ]);
  },
  zapora: (sim) => {
    const fw = dev(sim.net, 'FW1');
    fw.ports[0].zone = 'outside';
    fw.ports[1].zone = 'inside';
    fw.ports[2].zone = 'dmz';
    fw.nat = [];
    fw.fwRules.push({ name: 'HTTPS do DMZ', from: 'outside', to: 'dmz', proto: 'tcp', port: 443, dst: '172.16.0.10', action: 'allow' });
    fw.fwRules.push({ name: 'LAN do DMZ', from: 'inside', to: 'dmz', proto: 'any', port: 0, dst: '', action: 'allow' });
  },
  ssh: (sim) => {
    cli(sim, 'R1', ['ip domain-name firma.lan', 'crypto key generate rsa modulus 3072', 'ip ssh version 2', 'username admin secret Dlugie-Haslo-1', 'enable secret Inne-Haslo-2', 'service password-encryption', 'line vty 0 4', 'login local', 'transport input ssh']);
  },
  stp: (sim) => {
    cli(sim, 'SW3', ['spanning-tree vlan 1 root primary']);
  },
  awaria: (sim) => {
    cli(sim, 'R1', ['int g0/0/1', 'no shutdown']);
    cli(sim, 'SW1', ['int g1/0/2', 'switchport access vlan 1']);
    dev(sim.net, 'PC2').ports[0].gateway = '192.168.2.1';
    dev(sim.net, 'PC1').ports[0].dns = '192.168.2.20';
  },
  kampus: (sim) => {
    const vlans = ['vlan 10', 'vlan 20', 'vlan 30'];
    cli(sim, 'SW1', [...vlans, 'int g1/0/24', 'switchport mode trunk', 'int g1/0/1', 'switchport access vlan 10', 'int g1/0/2', 'switchport access vlan 20']);
    cli(sim, 'SW2', [...vlans, 'int g1/0/24', 'switchport mode trunk', 'int g1/0/10', 'switchport access vlan 30']);
    cli(sim, 'DSW1', [
      ...vlans,
      'int range g1/0/1 - 2',
      'switchport mode trunk',
      'ip routing',
      'int vlan 10',
      'ip address 10.10.10.1 255.255.255.0',
      'ip helper-address 10.10.30.10',
      'no shut',
      'int vlan 20',
      'ip address 10.10.20.1 255.255.255.0',
      'ip helper-address 10.10.30.10',
      'no shut',
      'int vlan 30',
      'ip address 10.10.30.1 255.255.255.0',
      'no shut',
      'int g1/0/24',
      'no switchport',
      'ip address 10.0.0.2 255.255.255.252',
      'exit',
      'ip route 0.0.0.0 0.0.0.0 10.0.0.1',
    ]);
  },
};

SOLUTIONS.etherchannel = (sim) => {
  for (const sw of ['SW1', 'SW2']) cli(sim, sw, ['interface range g1/0/23-24', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport mode trunk']);
};

SOLUTIONS.vrrp = (sim) => {
  cli(sim, 'R1', ['interface g0/0/0', 'vrrp 10 ip 192.168.10.1', 'vrrp 10 priority 120']);
  cli(sim, 'R2', ['interface g0/0/0', 'vrrp 10 ip 192.168.10.1']);
};

SOLUTIONS['port-security'] = (sim) => {
  cli(sim, 'SW1', ['interface range g1/0/1-2', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown']);
};

SOLUTIONS['dhcp-snooping'] = (sim) => {
  cli(sim, 'SW1', ['ip dhcp snooping', 'ip dhcp snooping vlan 1', 'interface g1/0/24', 'ip dhcp snooping trust']);
  for (const pc of ['PC1', 'PC2']) {
    sim.dhcpRelease(dev(sim.net, pc).id);
    sim.dhcpRenew(dev(sim.net, pc).id);
  }
};

SOLUTIONS.egzamin = (sim) => {
  cli(sim, 'SW1', ['vlan 10', 'vlan 20', 'int g1/0/1', 'switchport access vlan 10', 'int g1/0/2', 'switchport access vlan 20', 'int g1/0/24', 'switchport mode trunk']);
  cli(sim, 'R1', [
    'int g0/0/0',
    'no shut',
    'int g0/0/0.10',
    'encapsulation dot1Q 10',
    'ip address 192.168.10.1 255.255.255.0',
    'ip nat inside',
    'int g0/0/0.20',
    'encapsulation dot1Q 20',
    'ip address 192.168.20.1 255.255.255.0',
    'ip nat inside',
    'int g0/0/1',
    'ip address dhcp',
    'ip nat outside',
    'no shut',
    'exit',
    'ip dhcp excluded-address 192.168.10.1 192.168.10.9',
    'ip dhcp excluded-address 192.168.20.1 192.168.20.9',
    'ip dhcp pool BIURO',
    'network 192.168.10.0 255.255.255.0',
    'default-router 192.168.10.1',
    'dns-server 198.51.100.53',
    'ip dhcp pool SPRZEDAZ',
    'network 192.168.20.0 255.255.255.0',
    'default-router 192.168.20.1',
    'dns-server 198.51.100.53',
    'exit',
    'access-list 1 permit 192.168.0.0 0.0.255.255',
    'ip nat inside source list 1 interface g0/0/1 overload',
  ]);
};

describe('labs', () => {
  it('has a scripted solution for every lab', () => {
    expect([...LABS, EXAM_LAB].map((l) => l.id).sort()).toEqual(Object.keys(SOLUTIONS).sort());
  });

  for (const lab of [...LABS, EXAM_LAB]) {
    it(`${lab.id}: starts unsolved and passes every check when solved`, () => {
      const net = lab.build();
      const sim = new Simulator(net);
      sim.autoDhcp();
      const before = makeLabContext(net, sim);
      expect(lab.checks.some((c) => !c.test(before))).toBe(true);
      SOLUTIONS[lab.id](sim);
      sim.refresh();
      sim.autoDhcp();
      const ctx = makeLabContext(net, sim);
      const failed = lab.checks.filter((c) => !c.test(ctx)).map((c) => c.label.en);
      expect(failed).toEqual([]);
    });
  }
});
