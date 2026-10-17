import { describe, expect, it } from 'vitest';
import { NetBuilder } from '../../src/sim/builder';
import { Simulator } from '../../src/sim/engine';
import { parseIp } from '../../src/sim/ip';

const ip = (text: string) => parseIp(text)!;

function lan() {
  const b = new NetBuilder();
  const sw = b.add('switch', 'SW1', 300, 200);
  const pc1 = b.add('pc', 'PC1', 100, 300);
  const pc2 = b.add('pc', 'PC2', 500, 300);
  b.link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
  b.host(pc1, '192.168.1.10/24').host(pc2, '192.168.1.20/24');
  return { b, sw, pc1, pc2 };
}

describe('switching', () => {
  it('pings between two hosts on one switch and learns MAC addresses', () => {
    const { b, sw, pc1, pc2 } = lan();
    const sim = new Simulator(b.net);
    const results = sim.ping(pc1.id, ip('192.168.1.20'));
    expect(results.map((r) => r.outcome)).toEqual(['reply', 'reply', 'reply', 'reply']);
    expect(results[0].ttl).toBe(128);
    const macs = sim.macTable(sw).map((e) => e.mac);
    expect(macs).toContain(pc1.ports[0].mac);
    expect(macs).toContain(pc2.ports[0].mac);
    expect(sim.arpTable(pc1).map((e) => e.ip)).toContain(ip('192.168.1.20'));
  });

  it('reports host unreachable for an unused address', () => {
    const { b, pc1 } = lan();
    const sim = new Simulator(b.net);
    expect(sim.echo(pc1.id, ip('192.168.1.99')).outcome).toBe('host-unreachable');
  });

  it('isolates VLANs', () => {
    const { b, sw, pc1 } = lan();
    b.access(sw, 10, 'Gi1/0/1').access(sw, 20, 'Gi1/0/2');
    const sim = new Simulator(b.net);
    expect(sim.echo(pc1.id, ip('192.168.1.20')).outcome).toBe('host-unreachable');
    b.access(sw, 10, 'Gi1/0/2');
    sim.invalidate();
    expect(sim.echo(pc1.id, ip('192.168.1.20')).outcome).toBe('reply');
  });

  it('blocks a redundant link with STP and still delivers', () => {
    const b = new NetBuilder();
    const sw1 = b.add('switch', 'SW1', 0, 0);
    const sw2 = b.add('switch', 'SW2', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc2 = b.add('pc', 'PC2', 0, 0);
    b.link(sw1, 'Gi1/0/23', sw2, 'Gi1/0/23').link(sw1, 'Gi1/0/24', sw2, 'Gi1/0/24');
    b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
    b.host(pc1, '10.0.0.1/24').host(pc2, '10.0.0.2/24');
    const sim = new Simulator(b.net);
    const blocked = [sw1, sw2].flatMap((sw) => ['GigabitEthernet1/0/23', 'GigabitEthernet1/0/24'].filter((p) => sim.topo.stpBlocked(sw.id, p)));
    expect(blocked).toHaveLength(1);
    expect(sim.echo(pc1.id, ip('10.0.0.2')).outcome).toBe('reply');
    expect(sim.storm).toBe(false);
  });

  it('does not power a PoE camera from a non-PoE port', () => {
    const b = new NetBuilder();
    const r = b.add('router', 'R1', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const cam1 = b.add('camera', 'CAM1', 0, 0);
    const cam2 = b.add('camera', 'CAM2', 0, 0);
    b.link(cam1, 'eth0', r, 'Gi0/0/0').link(cam2, 'eth0', sw, 'Gi1/0/5');
    b.up(r, 'Gi0/0/0');
    const sim = new Simulator(b.net);
    expect(sim.topo.isPowered(cam1)).toBe(false);
    expect(sim.topo.isPowered(cam2)).toBe(true);
  });
});

describe('routing', () => {
  function twoNets() {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw1 = b.add('switch', 'SW1', 0, 0);
    const sw2 = b.add('switch', 'SW2', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc2 = b.add('pc', 'PC2', 0, 0);
    b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(sw1, 'Gi1/0/24', r1, 'Gi0/0/0');
    b.link(pc2, 'eth0', sw2, 'Gi1/0/1').link(sw2, 'Gi1/0/24', r1, 'Gi0/0/1');
    b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '192.168.2.1/24');
    b.host(pc1, '192.168.1.10/24', '192.168.1.1').host(pc2, '192.168.2.10/24', '192.168.2.1');
    return { b, r1, pc1, pc2 };
  }

  it('routes between two subnets, losing the first echo to router ARP', () => {
    const { b, pc1 } = twoNets();
    const sim = new Simulator(b.net);
    const outcomes = sim.ping(pc1.id, ip('192.168.2.10')).map((r) => r.outcome);
    expect(outcomes).toEqual(['timeout', 'reply', 'reply', 'reply']);
  });

  it('fails without a default gateway', () => {
    const { b, pc1 } = twoNets();
    pc1.ports[0].gateway = '';
    const sim = new Simulator(b.net);
    expect(sim.echo(pc1.id, ip('192.168.2.10')).outcome).toBe('no-route');
  });

  it('keeps router interfaces down until no shutdown', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(pc, 'eth0', r1, 'Gi0/0/0').host(pc, '10.1.1.10/24', '10.1.1.1');
    r1.ports[0].ip = '10.1.1.1';
    const sim = new Simulator(b.net);
    expect(sim.topo.portUp(r1, 'GigabitEthernet0/0/0')).toBe(false);
    r1.ports[0].shutdown = false;
    sim.invalidate();
    expect(sim.echo(pc.id, ip('10.1.1.1')).outcome).toBe('reply');
  });

  it('routes across three routers with static routes and traceroute lists hops', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const r2 = b.add('router', 'R2', 0, 0);
    const r3 = b.add('router', 'R3', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc3 = b.add('pc', 'PC3', 0, 0);
    b.link(pc1, 'eth0', r1, 'Gi0/0/0').link(r1, 'Gi0/0/1', r2, 'Gi0/0/0').link(r2, 'Gi0/0/1', r3, 'Gi0/0/0').link(r3, 'Gi0/0/1', pc3, 'eth0');
    b.ip(r1, 'Gi0/0/0', '10.1.0.1/24').ip(r1, 'Gi0/0/1', '10.12.0.1/30');
    b.ip(r2, 'Gi0/0/0', '10.12.0.2/30').ip(r2, 'Gi0/0/1', '10.23.0.1/30');
    b.ip(r3, 'Gi0/0/0', '10.23.0.2/30').ip(r3, 'Gi0/0/1', '10.3.0.1/24');
    b.host(pc1, '10.1.0.10/24', '10.1.0.1').host(pc3, '10.3.0.10/24', '10.3.0.1');
    b.route(r1, '0.0.0.0/0', '10.12.0.2');
    b.route(r2, '10.1.0.0/24', '10.12.0.1').route(r2, '10.3.0.0/24', '10.23.0.2');
    b.route(r3, '0.0.0.0/0', '10.23.0.1');
    const sim = new Simulator(b.net);
    expect(sim.canReach(pc1.id, ip('10.3.0.10'))).toBe(true);
    const hops = sim.traceroute(pc1.id, ip('10.3.0.10'));
    expect(hops.map((h) => h.from)).toEqual([ip('10.1.0.1'), ip('10.12.0.2'), ip('10.23.0.2'), ip('10.3.0.10')]);
    expect(hops.at(-1)!.outcome).toBe('reply');
  });

  it('learns routes with OSPF', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const r2 = b.add('router', 'R2', 0, 0);
    const r3 = b.add('router', 'R3', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc3 = b.add('pc', 'PC3', 0, 0);
    b.link(pc1, 'eth0', r1, 'Gi0/0/0').link(r1, 'Gi0/0/1', r2, 'Gi0/0/0').link(r2, 'Gi0/0/1', r3, 'Gi0/0/0').link(r3, 'Gi0/0/1', pc3, 'eth0');
    b.ip(r1, 'Gi0/0/0', '10.1.0.1/24').ip(r1, 'Gi0/0/1', '10.12.0.1/30');
    b.ip(r2, 'Gi0/0/0', '10.12.0.2/30').ip(r2, 'Gi0/0/1', '10.23.0.1/30');
    b.ip(r3, 'Gi0/0/0', '10.23.0.2/30').ip(r3, 'Gi0/0/1', '10.3.0.1/24');
    b.host(pc1, '10.1.0.10/24', '10.1.0.1').host(pc3, '10.3.0.10/24', '10.3.0.1');
    for (const r of [r1, r2, r3]) b.ospf(r, [{ net: '10.0.0.0', wildcard: '0.255.255.255' }]);
    const sim = new Simulator(b.net);
    const r1Routes = sim.topo.routes(r1).filter((r) => r.code === 'O');
    expect(r1Routes.map((r) => r.net)).toContain(ip('10.3.0.0'));
    expect(sim.topo.ospf().neighbors.get(r2.id)).toHaveLength(2);
    expect(sim.canReach(pc1.id, ip('10.3.0.10'))).toBe(true);
  });

  it('does not form OSPF adjacency across mismatched areas', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const r2 = b.add('router', 'R2', 0, 0);
    b.link(r1, 'Gi0/0/1', r2, 'Gi0/0/0').ip(r1, 'Gi0/0/1', '10.12.0.1/30').ip(r2, 'Gi0/0/0', '10.12.0.2/30');
    b.ospf(r1, [{ net: '10.12.0.0', wildcard: '0.0.0.3', area: 0 }]);
    b.ospf(r2, [{ net: '10.12.0.0', wildcard: '0.0.0.3', area: 1 }]);
    const sim = new Simulator(b.net);
    expect(sim.topo.ospf().neighbors.get(r1.id) ?? []).toHaveLength(0);
  });
});

describe('vlan routing', () => {
  it('routes between VLANs with router on a stick', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const pc10 = b.add('pc', 'PC10', 0, 0);
    const pc20 = b.add('pc', 'PC20', 0, 0);
    b.link(pc10, 'eth0', sw, 'Gi1/0/1').link(pc20, 'eth0', sw, 'Gi1/0/2').link(sw, 'Gi1/0/24', r1, 'Gi0/0/0');
    b.access(sw, 10, 'Gi1/0/1').access(sw, 20, 'Gi1/0/2').trunk(sw, ['Gi1/0/24']);
    b.sub(r1, 'Gi0/0/0', 10, '192.168.10.1/24').sub(r1, 'Gi0/0/0', 20, '192.168.20.1/24');
    b.host(pc10, '192.168.10.10/24', '192.168.10.1').host(pc20, '192.168.20.10/24', '192.168.20.1');
    const sim = new Simulator(b.net);
    expect(sim.canReach(pc10.id, ip('192.168.20.10'))).toBe(true);
  });

  it('drops frames when the trunk is configured on one side only', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const pc10 = b.add('pc', 'PC10', 0, 0);
    b.link(pc10, 'eth0', sw, 'Gi1/0/1').link(sw, 'Gi1/0/24', r1, 'Gi0/0/0');
    b.access(sw, 10, 'Gi1/0/1');
    b.sub(r1, 'Gi0/0/0', 10, '192.168.10.1/24');
    b.host(pc10, '192.168.10.10/24', '192.168.10.1');
    const sim = new Simulator(b.net);
    expect(sim.canReach(pc10.id, ip('192.168.10.1'))).toBe(false);
  });

  it('routes between SVIs on a layer 3 switch only with ip routing', () => {
    const b = new NetBuilder();
    const sw = b.add('l3switch', 'DSW1', 0, 0);
    const pc10 = b.add('pc', 'PC10', 0, 0);
    const pc20 = b.add('pc', 'PC20', 0, 0);
    b.link(pc10, 'eth0', sw, 'Gi1/0/1').link(pc20, 'eth0', sw, 'Gi1/0/2');
    b.access(sw, 10, 'Gi1/0/1').access(sw, 20, 'Gi1/0/2');
    b.svi(sw, 10, '192.168.10.1/24').svi(sw, 20, '192.168.20.1/24');
    b.host(pc10, '192.168.10.10/24', '192.168.10.1').host(pc20, '192.168.20.10/24', '192.168.20.1');
    const sim = new Simulator(b.net);
    expect(sim.canReach(pc10.id, ip('192.168.20.10'))).toBe(false);
    sw.ipRouting = true;
    sim.invalidate();
    expect(sim.canReach(pc10.id, ip('192.168.20.10'))).toBe(true);
  });
});

describe('services', () => {
  it('hands out addresses with DHCP from a router pool', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(pc, 'eth0', sw, 'Gi1/0/1').link(sw, 'Gi1/0/24', r1, 'Gi0/0/0');
    b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').pool(r1, 'LAN', '192.168.1.0/24', '192.168.1.1', '192.168.1.1');
    r1.dhcpExcluded.push({ from: '192.168.1.1', to: '192.168.1.9' });
    const sim = new Simulator(b.net);
    const result = sim.dhcpRenew(pc.id);
    expect(result.ok).toBe(true);
    expect(result.ip).toBe('192.168.1.10');
    expect(result.gateway).toBe('192.168.1.1');
    expect(r1.dhcpBindings).toHaveLength(1);
  });

  it('falls back to APIPA when no DHCP server answers', () => {
    const { b, pc1 } = lan();
    pc1.ports[0].dhcp = true;
    const sim = new Simulator(b.net);
    const result = sim.dhcpRenew(pc1.id);
    expect(result.ok).toBe(false);
    expect(result.apipa).toBe(true);
    expect(pc1.ports[0].ip.startsWith('169.254.')).toBe(true);
  });

  it('relays DHCP to a server in another subnet', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const srv = b.add('server', 'SRV1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(pc, 'eth0', r1, 'Gi0/0/0').link(srv, 'eth0', r1, 'Gi0/0/1');
    b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '10.0.0.1/24');
    r1.ports[0].helper = '10.0.0.10';
    b.host(srv, '10.0.0.10/24', '10.0.0.1');
    srv.services.dhcp = true;
    b.pool(srv, 'BIURO', '192.168.1.0/24', '192.168.1.1');
    srv.dhcpExcluded.push({ from: '192.168.1.1', to: '192.168.1.49' });
    const sim = new Simulator(b.net);
    const result = sim.dhcpRenew(pc.id);
    expect(result.ok).toBe(true);
    expect(result.ip).toBe('192.168.1.50');
  });

  it('reaches the internet through a home router with Wi-Fi, NAT and DNS', () => {
    const b = new NetBuilder();
    const isp = b.add('internet', 'ISP', 600, 100);
    const gw = b.add('homeRouter', 'GW1', 300, 100);
    const laptop = b.add('laptop', 'LAPTOP1', 300, 300);
    b.link(gw, 'WAN', isp, 'port0');
    laptop.wifiClient = { ssid: gw.wifi!.ssid, key: gw.wifi!.key };
    const sim = new Simulator(b.net);
    sim.autoDhcp();
    expect(gw.ports[0].ip).toBe('203.0.113.2');
    expect(laptop.ports[1].ip).toBe('192.168.1.100');
    expect(sim.canReach(laptop.id, ip('198.51.100.80'))).toBe(true);
    expect(sim.natTable(gw).length).toBeGreaterThan(0);
    const dns = sim.resolve(laptop.id, 'www.przyklad.pl');
    expect(dns.status).toBe('ok');
    expect(dns.ip).toBe(ip('198.51.100.80'));
    const page = sim.http(laptop.id, 'https://www.przyklad.pl/');
    expect(page.status).toBe('ok');
    expect(page.code).toBe(200);
  });

  it('keeps a laptop offline with a wrong Wi-Fi key', () => {
    const b = new NetBuilder();
    const gw = b.add('homeRouter', 'GW1', 300, 100);
    const laptop = b.add('laptop', 'LAPTOP1', 300, 300);
    laptop.wifiClient = { ssid: gw.wifi!.ssid, key: 'zle' };
    const sim = new Simulator(b.net);
    expect(sim.topo.wifiStatus(laptop.id)).toBe('bad-key');
  });

  it('serves DNS and HTTP from a local server', () => {
    const { b, pc1, pc2 } = lan();
    pc2.kind = 'server';
    pc2.services = { dhcp: false, dns: true, http: true };
    pc2.dnsRecords = [{ name: 'intranet.firma.lan', type: 'A', value: '192.168.1.20' }];
    pc2.web = { title: 'Intranet', body: 'Witaj' };
    pc1.ports[0].dns = '192.168.1.20';
    const sim = new Simulator(b.net);
    expect(sim.resolve(pc1.id, 'intranet.firma.lan').ip).toBe(ip('192.168.1.20'));
    expect(sim.resolve(pc1.id, 'brak.firma.lan').status).toBe('nxdomain');
    expect(sim.http(pc1.id, 'http://intranet.firma.lan').title).toBe('Intranet');
  });
});

describe('security', () => {
  it('filters traffic with an extended ACL', () => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    const srv = b.add('server', 'SRV1', 0, 0);
    b.link(pc, 'eth0', r1, 'Gi0/0/0').link(srv, 'eth0', r1, 'Gi0/0/1');
    b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '10.0.0.1/24');
    b.host(pc, '192.168.1.10/24', '192.168.1.1').host(srv, '10.0.0.10/24', '10.0.0.1');
    srv.services.http = true;
    r1.acls.push({
      name: '100',
      type: 'extended',
      entries: [
        { action: 'deny', proto: 'icmp', src: { any: true, ip: '', wildcard: '' }, dst: { any: false, ip: '10.0.0.10', wildcard: '0.0.0.0' }, srcPort: null, dstPort: null, icmpType: '', remark: '' },
        { action: 'permit', proto: 'ip', src: { any: true, ip: '', wildcard: '' }, dst: { any: true, ip: '', wildcard: '' }, srcPort: null, dstPort: null, icmpType: '', remark: '' },
      ],
    });
    r1.ports[0].aclIn = '100';
    const sim = new Simulator(b.net);
    sim.echo(pc.id, ip('10.0.0.10'));
    expect(sim.echo(pc.id, ip('10.0.0.10')).outcome).toBe('admin-prohibited');
    expect(sim.http(pc.id, 'http://10.0.0.10').status).toBe('ok');
  });

  it('lets inside traffic out through a stateful firewall but blocks new outside connections', () => {
    const b = new NetBuilder();
    const fw = b.add('firewall', 'FW1', 0, 0);
    const inside = b.add('pc', 'PC1', 0, 0);
    const outside = b.add('server', 'WEB', 0, 0);
    b.link(inside, 'eth0', fw, 'eth1/1').link(outside, 'eth0', fw, 'eth1/2');
    b.ip(fw, 'eth1/1', '192.168.1.1/24').ip(fw, 'eth1/2', '203.0.113.1/24');
    fw.ports[0].zone = 'inside';
    fw.ports[1].zone = 'outside';
    b.host(inside, '192.168.1.10/24', '192.168.1.1').host(outside, '203.0.113.10/24', '203.0.113.1');
    const sim = new Simulator(b.net);
    expect(sim.canReach(inside.id, ip('203.0.113.10'))).toBe(true);
    expect(sim.canReach(outside.id, ip('192.168.1.10'))).toBe(false);
  });
});
