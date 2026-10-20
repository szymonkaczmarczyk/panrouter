import { describe, expect, it } from 'vitest';
import { NetBuilder, portByName } from '../../src/sim/builder';
import { cliExecute, newSession } from '../../src/sim/cli/ios';
import { Simulator } from '../../src/sim/engine';
import { parseIp } from '../../src/sim/ip';
import type { Device } from '../../src/sim/types';

function run(sim: Simulator, device: Device, lines: string[]) {
  const session = newSession(device.id);
  const output: string[] = [];
  for (const line of ['enable', 'configure terminal', ...lines, 'end']) {
    const result = cliExecute(sim, session, line);
    output.push(...result.lines);
    if (result.changed) sim.invalidate();
  }
  return output;
}

function show(sim: Simulator, device: Device, command: string): string[] {
  const session = newSession(device.id);
  cliExecute(sim, session, 'enable');
  return cliExecute(sim, session, command).lines;
}

const ip = (text: string) => parseIp(text)!;

describe('port security', () => {
  function setup() {
    const b = new NetBuilder();
    const sw = b.add('switch', 'SW1', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc2 = b.add('pc', 'PC2', 0, 0);
    const intruder = b.add('laptop', 'INTRUZ', 0, 0);
    b.link(pc1, 'eth0', sw, 'Gi1/0/1').link(pc2, 'eth0', sw, 'Gi1/0/2');
    b.host(pc1, '10.0.0.1/24').host(pc2, '10.0.0.2/24').host(intruder, '10.0.0.66/24');
    return { b, sim: new Simulator(b.net), sw, pc1, pc2, intruder };
  }

  it('uczy się adresu sticky i wyłącza port po podłączeniu obcego urządzenia', () => {
    const { b, sim, sw, pc1, pc2, intruder } = setup();
    const out = run(sim, sw, ['interface range g1/0/1-2', 'switchport mode access', 'switchport port-security', 'switchport port-security mac-address sticky']);
    expect(out.filter((l) => l.startsWith('%'))).toEqual([]);
    expect(sim.canReach(pc1.id, ip('10.0.0.2'))).toBe(true);
    const port2 = portByName(sw, 'Gi1/0/2');
    expect(port2.portSecurity.stickyMacs).toEqual([pc2.ports[0].mac]);
    expect(sim.dirty).toBe(true);
    expect(show(sim, sw, 'show running-config').join('\n')).toContain('switchport port-security mac-address sticky');

    b.net.links = b.net.links.filter((l) => l.a.dev !== pc2.id && l.b.dev !== pc2.id);
    b.link(intruder, 'eth0', sw, 'Gi1/0/2');
    sim.invalidate();
    expect(sim.canReach(intruder.id, ip('10.0.0.1'))).toBe(false);
    expect(port2.errDisabled).toBe(true);
    expect(show(sim, sw, 'show interfaces status').join('\n')).toMatch(/Gi1\/0\/2\s+err-disabled/);
    expect(show(sim, sw, 'show port-security interface g1/0/2').join('\n')).toContain('Secure-shutdown');

    run(sim, sw, ['interface g1/0/2', 'no shutdown']);
    expect(port2.errDisabled).toBe(true);
    run(sim, sw, ['interface g1/0/2', 'shutdown', 'no shutdown']);
    expect(port2.errDisabled).toBe(false);
  });

  it('restrict odrzuca ramki, ale nie wyłącza portu', () => {
    const { b, sim, sw, pc2, intruder } = setup();
    run(sim, sw, ['interface g1/0/2', 'switchport port-security', 'switchport port-security violation restrict', 'switchport port-security mac-address 0000.1111.2222']);
    b.net.links = b.net.links.filter((l) => l.a.dev !== pc2.id && l.b.dev !== pc2.id);
    b.link(intruder, 'eth0', sw, 'Gi1/0/2');
    sim.invalidate();
    expect(sim.canReach(intruder.id, ip('10.0.0.1'))).toBe(false);
    const port = portByName(sw, 'Gi1/0/2');
    expect(port.errDisabled).toBe(false);
    expect(sim.violation(sw, port).count).toBeGreaterThan(0);
  });

  it('odrzuca port security na trunku', () => {
    const { sim, sw } = setup();
    const out = run(sim, sw, ['interface g1/0/3', 'switchport mode trunk', 'switchport port-security']);
    expect(out.join('\n')).toContain('Command rejected');
  });
});

describe('DHCP snooping', () => {
  function setup() {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const rogue = b.add('server', 'ROGUE', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(pc, 'eth0', sw, 'Gi1/0/1').link(rogue, 'eth0', sw, 'Gi1/0/2').link(r1, 'Gi0/0/0', sw, 'Gi1/0/24');
    b.ip(r1, 'Gi0/0/0', '192.168.1.1/24');
    r1.dhcpPools.push({ name: 'LAN', network: '192.168.1.0', prefix: 24, router: '192.168.1.1', dns: '', domain: '' });
    r1.dhcpExcluded.push({ from: '192.168.1.1', to: '192.168.1.9' });
    b.host(rogue, '10.66.0.1/24');
    rogue.services.dhcp = true;
    rogue.dhcpPools.push({ name: 'ZLY', network: '10.66.0.0', prefix: 24, router: '10.66.0.1', dns: '', domain: '' });
    b.dhcp(pc);
    return { sim: new Simulator(b.net), sw, pc, r1 };
  }

  it('bez ochrony komputer bierze adres od fałszywego serwera', () => {
    const { sim, pc } = setup();
    const result = sim.dhcpRenew(pc.id);
    expect(result.ip.startsWith('10.66.0.')).toBe(true);
  });

  it('snooping z zaufanym portem do routera daje poprawny adres i powiązanie', () => {
    const { sim, sw, pc } = setup();
    run(sim, sw, ['ip dhcp snooping', 'ip dhcp snooping vlan 1', 'interface g1/0/24', 'ip dhcp snooping trust']);
    const result = sim.dhcpRenew(pc.id);
    expect(result.ip).toBe('192.168.1.10');
    expect(result.gateway).toBe('192.168.1.1');
    const binding = show(sim, sw, 'show ip dhcp snooping binding').join('\n');
    expect(binding).toContain('192.168.1.10');
    expect(binding).toContain('Total number of bindings: 1');
    expect(show(sim, sw, 'show running-config').join('\n')).toContain('ip dhcp snooping trust');
  });

  it('snooping bez zaufanego portu blokuje wszystkie odpowiedzi', () => {
    const { sim, sw, pc } = setup();
    run(sim, sw, ['ip dhcp snooping', 'ip dhcp snooping vlan 1']);
    const result = sim.dhcpRenew(pc.id);
    expect(result.apipa).toBe(true);
  });
});

describe('EtherChannel', () => {
  function setup() {
    const b = new NetBuilder();
    const sw1 = b.add('switch', 'SW1', 0, 0);
    const sw2 = b.add('switch', 'SW2', 0, 0);
    const pc1 = b.add('pc', 'PC1', 0, 0);
    const pc2 = b.add('pc', 'PC2', 0, 0);
    b.link(sw1, 'Gi1/0/23', sw2, 'Gi1/0/23').link(sw1, 'Gi1/0/24', sw2, 'Gi1/0/24');
    b.link(pc1, 'eth0', sw1, 'Gi1/0/1').link(pc2, 'eth0', sw2, 'Gi1/0/1');
    b.host(pc1, '10.0.0.1/24').host(pc2, '10.0.0.2/24');
    return { sim: new Simulator(b.net), sw1, sw2, pc1, pc2 };
  }

  const blocked = (sim: Simulator, dev: Device) => dev.ports.filter((p) => sim.topo.stpBlocked(dev.id, p.name)).length;

  it('bez kanału STP blokuje jedno łącze, z LACP oba działają', () => {
    const { sim, sw1, sw2, pc1 } = setup();
    expect(blocked(sim, sw1) + blocked(sim, sw2)).toBe(1);
    run(sim, sw1, ['interface range g1/0/23-24', 'channel-group 1 mode active']);
    run(sim, sw2, ['interface range g1/0/23-24', 'channel-group 1 mode passive', 'interface port-channel 1', 'switchport mode trunk']);
    run(sim, sw1, ['interface po1', 'switchport mode trunk']);
    expect(blocked(sim, sw1) + blocked(sim, sw2)).toBe(0);
    const summary = show(sim, sw1, 'show etherchannel summary').join('\n');
    expect(summary).toContain('Po1(SU)');
    expect(summary).toContain('Gi1/0/23(P) Gi1/0/24(P)');
    expect(sim.canReach(pc1.id, ip('10.0.0.2'))).toBe(true);
    expect(show(sim, sw1, 'show spanning-tree').join('\n')).toMatch(/Po1\s+\w+\s+FWD\s+3\s/);
    expect(show(sim, sw1, 'show running-config').join('\n')).toContain('interface Port-channel1');
  });

  it('kanał przeżywa awarię jednego kabla', () => {
    const { sim, sw1, sw2, pc1 } = setup();
    run(sim, sw1, ['interface range g1/0/23-24', 'channel-group 1 mode active']);
    run(sim, sw2, ['interface range g1/0/23-24', 'channel-group 1 mode active']);
    run(sim, sw1, ['interface g1/0/23', 'shutdown']);
    expect(sim.canReach(pc1.id, ip('10.0.0.2'))).toBe(true);
    run(sim, sw1, ['interface g1/0/23', 'no shutdown', 'interface g1/0/24', 'shutdown']);
    expect(sim.canReach(pc1.id, ip('10.0.0.2'))).toBe(true);
  });

  it('passive z obu stron nie tworzy kanału, a on z LACP zawiesza porty', () => {
    const { sim, sw1, sw2 } = setup();
    run(sim, sw1, ['interface range g1/0/23-24', 'channel-group 1 mode passive']);
    run(sim, sw2, ['interface range g1/0/23-24', 'channel-group 1 mode passive']);
    expect(show(sim, sw1, 'show etherchannel summary').join('\n')).toContain('Gi1/0/23(I) Gi1/0/24(I)');
    expect(blocked(sim, sw1) + blocked(sim, sw2)).toBe(1);
    run(sim, sw2, ['interface range g1/0/23-24', 'no channel-group', 'channel-group 1 mode on']);
    expect(show(sim, sw1, 'show etherchannel summary').join('\n')).toContain('Gi1/0/23(s) Gi1/0/24(s)');
  });

  it('niezgodna konfiguracja portów zawiesza członka kanału', () => {
    const { sim, sw1, sw2 } = setup();
    run(sim, sw1, ['interface range g1/0/23-24', 'channel-group 1 mode active', 'interface g1/0/24', 'switchport access vlan 20']);
    run(sim, sw2, ['interface range g1/0/23-24', 'channel-group 1 mode active']);
    expect(show(sim, sw1, 'show etherchannel summary').join('\n')).toContain('Gi1/0/23(P) Gi1/0/24(s)');
  });
});

describe('VRRP i HSRP', () => {
  function setup() {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const r2 = b.add('router', 'R2', 0, 0);
    const core = b.add('router', 'R3', 0, 0);
    const sw = b.add('switch', 'SW1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    const srv = b.add('server', 'SRV1', 0, 0);
    b.link(r1, 'Gi0/0/0', sw, 'Gi1/0/23').link(r2, 'Gi0/0/0', sw, 'Gi1/0/24').link(pc, 'eth0', sw, 'Gi1/0/1');
    b.link(r1, 'Gi0/0/1', core, 'Gi0/0/0').link(r2, 'Gi0/0/1', core, 'Gi0/0/1').link(srv, 'eth0', core, 'Gi0/0/2');
    b.ip(r1, 'Gi0/0/0', '192.168.10.2/24').ip(r2, 'Gi0/0/0', '192.168.10.3/24');
    b.ip(r1, 'Gi0/0/1', '10.0.1.1/30').ip(core, 'Gi0/0/0', '10.0.1.2/30');
    b.ip(r2, 'Gi0/0/1', '10.0.2.1/30').ip(core, 'Gi0/0/1', '10.0.2.2/30');
    b.ip(core, 'Gi0/0/2', '172.16.0.1/24');
    b.host(pc, '192.168.10.50/24', '192.168.10.1').host(srv, '172.16.0.10/24', '172.16.0.1');
    for (const r of [r1, r2, core]) r.ospf = { processId: 1, routerId: '', networks: [{ net: '0.0.0.0', wildcard: '255.255.255.255', area: 0 }], passive: [], refBw: 100, defaultOriginate: false };
    return { sim: new Simulator(b.net), r1, r2, pc };
  }

  it('wirtualna brama działa i przechodzi na zapasowy router po awarii', () => {
    const { sim, r1, r2, pc } = setup();
    expect(sim.canReach(pc.id, ip('172.16.0.10'))).toBe(false);
    run(sim, r1, ['interface g0/0/0', 'vrrp 10 ip 192.168.10.1', 'vrrp 10 priority 120']);
    run(sim, r2, ['interface g0/0/0', 'vrrp 10 ip 192.168.10.1']);
    expect(show(sim, r1, 'show vrrp brief').join('\n')).toMatch(/Gi0\/0\/0\s+10\s+120.*Master\s+192\.168\.10\.2\s+192\.168\.10\.1/);
    expect(show(sim, r2, 'show vrrp brief').join('\n')).toContain('Backup');
    expect(sim.canReach(pc.id, ip('172.16.0.10'))).toBe(true);
    expect(sim.arpTable(pc).find((e) => e.ip === ip('192.168.10.1'))?.mac).toBe('00005e00010a');
    expect(sim.traceroute(pc.id, ip('172.16.0.10'))[0].from).toBe(ip('192.168.10.2'));

    run(sim, r1, ['interface g0/0/0', 'shutdown']);
    expect(show(sim, r2, 'show vrrp brief').join('\n')).toContain('Master');
    expect(sim.canReach(pc.id, ip('172.16.0.10'))).toBe(true);
    expect(sim.traceroute(pc.id, ip('172.16.0.10'))[0].from).toBe(ip('192.168.10.3'));
  });

  it('HSRP pokazuje role Active i Standby', () => {
    const { sim, r1, r2, pc } = setup();
    run(sim, r1, ['interface g0/0/0', 'standby 1 ip 192.168.10.1', 'standby 1 priority 110', 'standby 1 preempt']);
    run(sim, r2, ['interface g0/0/0', 'standby 1 ip 192.168.10.1']);
    expect(show(sim, r1, 'show standby brief').join('\n')).toMatch(/Gi0\/0\/0\s+1\s+110 P Active\s+local\s+192\.168\.10\.3\s+192\.168\.10\.1/);
    expect(show(sim, r2, 'show standby brief').join('\n')).toMatch(/Standby\s+192\.168\.10\.2\s+local/);
    expect(sim.canReach(pc.id, ip('172.16.0.10'))).toBe(true);
    expect(show(sim, r1, 'show running-config').join('\n')).toContain(' standby 1 preempt');
  });

  it('odrzuca wirtualny adres spoza podsieci', () => {
    const { sim, r1 } = setup();
    const out = run(sim, r1, ['interface g0/0/0', 'vrrp 10 ip 10.9.9.9']);
    expect(out.join('\n')).toContain('is not in the subnet');
  });
});
