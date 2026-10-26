import { describe, expect, it } from 'vitest';
import { NetBuilder, portByName } from '../../src/sim/builder';
import { Simulator } from '../../src/sim/engine';
import { eui64, formatIpv6, inSubnet6, linkLocal, parseCidr6, parseIpv6 } from '../../src/sim/ip6';

const v6 = (text: string) => parseIpv6(text)!;

describe('adresy IPv6', () => {
  it('parsuje i skraca zgodnie z RFC 5952', () => {
    for (const [input, out] of [
      ['2001:0db8:0000:0000:0000:ff00:0042:8329', '2001:db8::ff00:42:8329'],
      ['2001:db8::1', '2001:db8::1'],
      ['::', '::'],
      ['::1', '::1'],
      ['fe80::a0:c9ff:fe00:9', 'fe80::a0:c9ff:fe00:9'],
      ['2001:db8:0:1:0:0:0:1', '2001:db8:0:1::1'],
      ['2001:db8:1:0:1:2:3:4', '2001:db8:1:0:1:2:3:4'],
    ]) {
      expect(formatIpv6(v6(input))).toBe(out);
    }
    for (const bad of ['2001:db8::1::2', '12345::', 'g::1', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', '']) expect(parseIpv6(bad)).toBeNull();
    expect(parseCidr6('2001:db8:1::/64')).toEqual({ addr: v6('2001:db8:1::'), prefix: 64 });
    expect(parseCidr6('2001:db8::/129')).toBeNull();
  });

  it('tworzy EUI-64 i adres link-local z MAC', () => {
    expect(formatIpv6(linkLocal('02a0c9000009'))).toBe('fe80::a0:c9ff:fe00:9');
    expect(formatIpv6(eui64(v6('2001:db8:1::'), '0050796668ab'))).toBe('2001:db8:1:0:250:79ff:fe66:68ab');
    expect(inSubnet6(v6('2001:db8:1::5'), v6('2001:db8:1::'), 64)).toBe(true);
    expect(inSubnet6(v6('2001:db8:2::5'), v6('2001:db8:1::'), 64)).toBe(false);
  });
});

describe('IPv6 w symulatorze', () => {
  function setup() {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const r2 = b.add('router', 'R2', 0, 0);
    const sw1 = b.add('switch', 'SW1', 0, 0);
    const sw2 = b.add('switch', 'SW2', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc2 = b.add('pc', 'PC2', 0, 0);
    b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r2, 'Gi0/0/0', sw2, 'Gi1/0/24').link(r1, 'Gi0/0/1', r2, 'Gi0/0/1');
    b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
    for (const r of [r1, r2]) {
      r.ipv6Routing = true;
      for (const name of ['Gi0/0/0', 'Gi0/0/1']) portByName(r, name).shutdown = false;
    }
    portByName(r1, 'Gi0/0/0').ipv6 = ['2001:db8:1::1/64'];
    portByName(r2, 'Gi0/0/0').ipv6 = ['2001:db8:2::1/64'];
    portByName(r1, 'Gi0/0/1').ipv6 = ['2001:db8:12::1/64'];
    portByName(r2, 'Gi0/0/1').ipv6 = ['2001:db8:12::2/64'];
    return { b, sim: new Simulator(b.net), r1, r2, pc1, pc2 };
  }

  it('komputer dostaje adres z SLAAC i bramę link-local routera', () => {
    const { sim, pc1, r1 } = setup();
    const ifs = sim.topo.ip6Ifs(pc1);
    const slaac = ifs[0].addrs.find((a) => a.origin === 'slaac')!;
    expect(formatIpv6(slaac.addr)).toBe(formatIpv6(eui64(v6('2001:db8:1::'), pc1.ports[0].mac)));
    expect(ifs[0].router).toBe(linkLocal(portByName(r1, 'Gi0/0/0').mac));
    expect(sim.canReach6(pc1.id, v6('2001:db8:1::1'))).toBe(true);
    expect(sim.ndTable(pc1).length).toBeGreaterThan(0);
  });

  it('bez trasy router odsyła Destination Unreachable, z trasami ping przechodzi', () => {
    const { sim, r1, r2, pc1, pc2 } = setup();
    const target = sim.topo.ip6Ifs(pc2)[0].addrs.find((a) => a.origin === 'slaac')!.addr;
    expect(sim.echo6(pc1.id, target).outcome).toBe('timeout');
    expect(sim.echo6(pc1.id, target).outcome).toBe('net-unreachable');
    r1.routes6.push({ net: '2001:db8:2::', prefix: 64, via: '2001:db8:12::2', iface: '' });
    r2.routes6.push({ net: '2001:db8:1::', prefix: 64, via: '2001:db8:12::1', iface: '' });
    sim.invalidate();
    expect(sim.canReach6(pc1.id, target)).toBe(true);
    const hops = sim.traceroute6(pc1.id, target);
    expect(hops.map((h) => (h.from === null ? '*' : formatIpv6(h.from)))).toEqual(['2001:db8:1::1', '2001:db8:12::2', formatIpv6(target)]);
  });

  it('trasa przez adres link-local wymaga interfejsu wyjściowego', () => {
    const { sim, r1, r2, pc1, pc2 } = setup();
    const r2ll = formatIpv6(linkLocal(portByName(r2, 'Gi0/0/1').mac));
    const r1ll = formatIpv6(linkLocal(portByName(r1, 'Gi0/0/1').mac));
    r1.routes6.push({ net: '2001:db8:2::', prefix: 64, via: r2ll, iface: '' });
    sim.invalidate();
    expect(sim.topo.routes6(r1).some((r) => r.code === 'S')).toBe(false);
    r1.routes6 = [{ net: '2001:db8:2::', prefix: 64, via: r2ll, iface: 'GigabitEthernet0/0/1' }];
    r2.routes6 = [{ net: '2001:db8:1::', prefix: 64, via: r1ll, iface: 'GigabitEthernet0/0/1' }];
    sim.invalidate();
    const target = sim.topo.ip6Ifs(pc2)[0].addrs.find((a) => a.origin === 'slaac')!.addr;
    expect(sim.canReach6(pc1.id, target)).toBe(true);
  });

  it('wyłączony routing IPv6 zatrzymuje SLAAC i przekazywanie', () => {
    const { sim, r1, pc1 } = setup();
    r1.ipv6Routing = false;
    sim.invalidate();
    expect(sim.topo.ip6Ifs(pc1)[0].addrs.filter((a) => a.origin === 'slaac')).toEqual([]);
    expect(sim.echo6(pc1.id, v6('2001:db8:2::1')).outcome).toBe('no-route');
  });
});

describe('IPv6 w CLI', () => {
  it('konfiguruje router poleceniami i pokazuje wyniki', async () => {
    const { cliExecute, newSession } = await import('../../src/sim/cli/ios');
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(r1, 'Gi0/0/0', sw, 'Gi1/0/24').link(pc, 'eth0', sw, 'Gi1/0/1');
    const sim = new Simulator(b.net);
    const session = newSession(r1.id);
    const out: string[] = [];
    for (const line of ['enable', 'conf t', 'ipv6 unicast-routing', 'int g0/0/0', 'no shut', 'ipv6 address 2001:db8:1::/64 eui-64', 'ipv6 address 2001:db8:1::1/64', 'exit', 'ipv6 route ::/0 2001:db8:1::fe', 'ipv6 route 2001:db8:9::/64 fe80::1', 'end']) {
      const result = cliExecute(sim, session, line);
      out.push(...result.lines);
      if (result.changed) sim.invalidate();
    }
    expect(out.join('\n')).toContain('Interface has to be specified for a link-local nexthop');
    expect(r1.ports[0].ipv6).toHaveLength(2);
    const pcAddr = sim.topo.ip6Ifs(pc)[0].addrs.find((a) => a.origin === 'slaac')!.addr;
    const ping = cliExecute(sim, session, `ping ${formatIpv6(pcAddr)}`).lines.join('\n');
    expect(ping).toMatch(/Success rate is (80|100) percent/);
    const brief = cliExecute(sim, session, 'show ipv6 interface brief').lines.join('\n');
    expect(brief).toContain('2001:DB8:1::1');
    expect(brief).toMatch(/FE80::/);
    const routes = cliExecute(sim, session, 'show ipv6 route').lines.join('\n');
    expect(routes).toContain('C   2001:DB8:1::/64');
    expect(routes).toContain('S   ::/0');
    expect(cliExecute(sim, session, 'show ipv6 neighbors').lines.length).toBeGreaterThan(1);
    const config = cliExecute(sim, session, 'show running-config').lines.join('\n');
    expect(config).toContain('ipv6 unicast-routing');
    expect(config).toContain(' ipv6 address 2001:DB8:1::1/64');
    expect(config).toContain('ipv6 route ::/0 2001:DB8:1::FE');
  });
});

describe('OSPFv3 i DHCPv6', () => {
  async function build() {
    const { cliExecute, newSession } = await import('../../src/sim/cli/ios');
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const r2 = b.add('router', 'R2', 0, 0);
    const sw1 = b.add('switch', 'SW1', 0, 0);
    const sw2 = b.add('switch', 'SW2', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc2 = b.add('pc', 'PC2', 0, 0);
    b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(r2, 'Gi0/0/0', sw2, 'Gi1/0/24').link(r1, 'Gi0/0/1', r2, 'Gi0/0/1');
    b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
    const sim = new Simulator(b.net);
    const run = (device: typeof r1, lines: string[]) => {
      const session = newSession(device.id);
      const out: string[] = [];
      for (const line of ['enable', 'conf t', ...lines, 'end']) {
        const result = cliExecute(sim, session, line);
        out.push(...result.lines);
        if (result.changed) sim.invalidate();
      }
      return out.join('\n');
    };
    return { sim, run, r1, r2, pc1, pc2, cliExecute, newSession };
  }

  it('OSPFv3 bez router-id nie startuje, a po ustawieniu uczy się tras przez link-local', async () => {
    const { sim, run, r1, r2, pc1, pc2 } = await build();
    const r1Out = run(r1, ['ipv6 unicast-routing', 'int g0/0/0', 'no shut', 'ipv6 address 2001:db8:1::1/64', 'ipv6 ospf 1 area 0', 'int g0/0/1', 'no shut', 'ipv6 address 2001:db8:12::1/64', 'ipv6 ospf 1 area 0']);
    expect(r1Out).toContain('%OSPFv3-4-NORTRID');
    run(r2, ['ipv6 unicast-routing', 'ipv6 router ospf 1', 'router-id 2.2.2.2', 'passive-interface GigabitEthernet0/0/0', 'int g0/0/0', 'no shut', 'ipv6 address 2001:db8:2::1/64', 'ipv6 ospf 1 area 0', 'int g0/0/1', 'no shut', 'ipv6 address 2001:db8:12::2/64', 'ipv6 ospf 1 area 0']);
    const target = sim.topo.ip6Ifs(pc2)[0].addrs.find((a) => a.origin === 'slaac')!.addr;
    expect(sim.topo.routes6(r1).some((r) => r.code === 'O')).toBe(false);
    expect(sim.canReach6(pc1.id, target)).toBe(false);
    run(r1, ['ipv6 router ospf 1', 'router-id 1.1.1.1']);
    const learned = sim.topo.routes6(r1).find((r) => r.code === 'O' && formatIpv6(r.net) === '2001:db8:2::')!;
    expect(learned.via).toBe(linkLocal(portByName(r2, 'Gi0/0/1').mac));
    expect(learned.ifName).toBe('GigabitEthernet0/0/1');
    expect(sim.canReach6(pc1.id, target)).toBe(true);
    const neighbors = run(r1, ['do show ipv6 ospf neighbor']);
    const show = (await import('../../src/sim/cli/show')).showOspf6Neighbors(sim, r1).join('\n');
    expect(neighbors.length).toBeGreaterThan(0);
    expect(show).toContain('2.2.2.2');
    expect(show).toContain('FULL/');
    const config = (await import('../../src/sim/cli/show')).runningConfig(sim, r2).join('\n');
    expect(config).toContain(' ipv6 ospf 1 area 0');
    expect(config).toContain('ipv6 router ospf 1');
    expect(config).toContain(' passive-interface GigabitEthernet0/0/0');
    const routes = (await import('../../src/sim/cli/show')).showIpv6Route(sim, r1).join('\n');
    expect(routes).toMatch(/O {3}2001:DB8:2::\/64 \[110\/\d+\]/);
  });

  it('DHCPv6 daje adres przy fladze M, a sam DNS przy fladze O', async () => {
    const { sim, run, r1, pc1 } = await build();
    run(r1, ['ipv6 unicast-routing', 'ipv6 dhcp pool BIURO6', 'address prefix 2001:db8:1::/64', 'dns-server 2001:db8:1::53', 'domain-name firma.lan', 'int g0/0/0', 'no shut', 'ipv6 address 2001:db8:1::1/64', 'ipv6 dhcp server BIURO6', 'ipv6 nd other-config-flag']);
    let ifs = sim.topo.ip6Ifs(pc1)[0];
    expect(ifs.addrs.some((a) => a.origin === 'dhcpv6')).toBe(false);
    expect(ifs.dns6).toBe(v6('2001:db8:1::53'));
    run(r1, ['int g0/0/0', 'ipv6 nd managed-config-flag']);
    ifs = sim.topo.ip6Ifs(pc1)[0];
    const leased = ifs.addrs.find((a) => a.origin === 'dhcpv6')!;
    expect(inSubnet6(leased.addr, v6('2001:db8:1::'), 64)).toBe(true);
    expect(leased.prefix).toBe(128);
    expect(sim.canReach6(pc1.id, v6('2001:db8:1::1'))).toBe(true);
    expect(sim.canReach6(r1.id, leased.addr)).toBe(true);
    const config = (await import('../../src/sim/cli/show')).runningConfig(sim, r1).join('\n');
    expect(config).toContain('ipv6 dhcp pool BIURO6');
    expect(config).toContain(' address prefix 2001:DB8:1::/64');
    expect(config).toContain(' ipv6 nd managed-config-flag');
    expect(config).toContain(' ipv6 dhcp server BIURO6');
    expect(run(r1, ['ipv6 dhcp pool X', 'address prefix 2001:db8:5::/48'])).toContain('only from /64');
  });
});
