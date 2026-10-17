import { describe, expect, it } from 'vitest';
import { NetBuilder } from '../../src/sim/builder';
import { cliComplete, cliExecute, cliHelp, cliPrompt, newSession } from '../../src/sim/cli/ios';
import { Simulator } from '../../src/sim/engine';
import { parseIp } from '../../src/sim/ip';

function setup() {
  const b = new NetBuilder();
  const r1 = b.add('router', 'R1', 0, 0);
  const sw = b.add('switch', 'SW1', 0, 0);
  const pc10 = b.add('pc', 'PC10', 0, 0);
  const pc20 = b.add('pc', 'PC20', 0, 0);
  b.link(pc10, 'eth0', sw, 'Gi1/0/1').link(pc20, 'eth0', sw, 'Gi1/0/2').link(sw, 'Gi1/0/24', r1, 'Gi0/0/0');
  b.host(pc10, '192.168.10.10/24', '192.168.10.1').host(pc20, '192.168.20.10/24', '192.168.20.1');
  const sim = new Simulator(b.net);
  return { sim, r1, sw, pc10, pc20 };
}

function run(sim: Simulator, deviceId: string, lines: string[]) {
  const session = newSession(deviceId);
  const output: string[] = [];
  for (const line of lines) {
    const result = cliExecute(sim, session, line);
    output.push(...result.lines);
    if (result.changed) sim.invalidate();
  }
  return { session, output };
}

describe('ios cli', () => {
  it('configures router on a stick with abbreviations', () => {
    const { sim, r1, sw, pc10 } = setup();
    run(sim, sw.id, [
      'en',
      'conf t',
      'vlan 10',
      'name BIURO',
      'vlan 20',
      'name GOSCIE',
      'int g1/0/1',
      'sw mo acc',
      'sw acc vl 10',
      'int g1/0/2',
      'switchport mode access',
      'switchport access vlan 20',
      'int gi1/0/24',
      'switchport mode trunk',
      'end',
    ]);
    const routerRun = run(sim, r1.id, [
      'enable',
      'configure terminal',
      'hostname BRAMA',
      'interface GigabitEthernet 0/0/0',
      'no shut',
      'int g0/0/0.10',
      'encapsulation dot1Q 10',
      'ip add 192.168.10.1 255.255.255.0',
      'int g0/0/0.20',
      'encapsulation dot1q 20',
      'ip address 192.168.20.1 255.255.255.0',
      'end',
    ]);
    expect(r1.name).toBe('BRAMA');
    expect(routerRun.session.mode).toBe('priv');
    expect(sw.vlans.map((v) => v.name)).toEqual(['default', 'BIURO', 'GOSCIE']);
    expect(sim.canReach(pc10.id, parseIp('192.168.20.10')!)).toBe(true);
    const brief = run(sim, r1.id, ['en', 'sh ip int br']).output.join('\n');
    expect(brief).toMatch(/GigabitEthernet0\/0\/0\.10\s+192\.168\.10\.1/);
    const vlans = run(sim, sw.id, ['sh vlan br']).output.join('\n');
    expect(vlans).toContain('BIURO');
    expect(vlans).toContain('Gi1/0/1');
  });

  it('reports invalid, ambiguous and incomplete commands like IOS', () => {
    const { sim, r1 } = setup();
    const session = newSession(r1.id);
    cliExecute(sim, session, 'enable');
    cliExecute(sim, session, 'configure terminal');
    expect(cliExecute(sim, session, 'ip adress 1.1.1.1').lines.at(-1)).toBe("% Invalid input detected at '^' marker.");
    expect(cliExecute(sim, session, 'ip ro').lines[0]).toContain('Ambiguous');
    expect(cliExecute(sim, session, 'ip route 10.0.0.0').lines[0]).toBe('% Incomplete command.');
    expect(cliPrompt(r1, session)).toBe('R1(config)#');
  });

  it('rejects bad masks and network addresses', () => {
    const { sim, r1 } = setup();
    const { output } = run(sim, r1.id, ['en', 'conf t', 'int g0/0/1', 'ip address 10.0.0.0 255.255.255.0', 'ip address 10.0.0.1 255.0.255.0']);
    expect(output.some((l) => l.includes('Bad mask /24'))).toBe(true);
    expect(output.some((l) => l.includes('Bad mask 0x'))).toBe(true);
    expect(r1.ports[1].ip).toBe('');
  });

  it('shows contextual help and completes keywords', () => {
    const { sim, r1 } = setup();
    const session = newSession(r1.id);
    cliExecute(sim, session, 'enable');
    const help = cliHelp(sim, session, 'show ip ', 'pl').join('\n');
    expect(help).toContain('route');
    expect(help).toContain('interface');
    expect(cliComplete(sim, session, 'conf')).toBe('configure ');
    expect(cliComplete(sim, session, 'show run')).toBe('show running-config ');
  });

  it('runs show commands with do from config mode and saves config', () => {
    const { sim, r1 } = setup();
    const { output } = run(sim, r1.id, ['en', 'conf t', 'int g0/0/1', 'do show ip interface brief', 'end', 'wr']);
    expect(output.join('\n')).toContain('GigabitEthernet0/0/1');
    expect(r1.startup).toContain('hostname R1');
  });

  it('builds ACLs, NAT and OSPF from the CLI', () => {
    const { sim, r1 } = setup();
    run(sim, r1.id, [
      'en',
      'conf t',
      'access-list 1 permit 192.168.0.0 0.0.255.255',
      'access-list 110 deny tcp any host 10.0.0.5 eq www',
      'access-list 110 permit ip any any',
      'ip access-list extended BLOKADA',
      'deny icmp any any echo',
      'permit ip any any',
      'exit',
      'int g0/0/1',
      'ip nat outside',
      'ip access-group 110 in',
      'exit',
      'ip nat inside source list 1 interface g0/0/1 overload',
      'router ospf 1',
      'network 10.0.0.0 0.255.255.255 area 0',
      'passive-interface g0/0/0',
      'end',
    ]);
    expect(r1.acls.map((a) => a.name)).toEqual(['1', '110', 'BLOKADA']);
    expect(r1.acls[1].entries[0].dstPort).toEqual({ op: 'eq', a: 80, b: 0 });
    expect(r1.acls[2].entries[0].icmpType).toBe('echo');
    expect(r1.nat[0]).toEqual({ kind: 'pat', acl: '1', iface: 'GigabitEthernet0/0/1' });
    expect(r1.ospf?.passive).toEqual(['GigabitEthernet0/0/0']);
    const config = run(sim, r1.id, ['en', 'show running-config']).output.join('\n');
    expect(config).toContain('ip nat inside source list 1 interface GigabitEthernet0/0/1 overload');
    expect(config).toContain('access-list 110 deny tcp any host 10.0.0.5 eq www');
  });

  it('protects enable mode with a secret', () => {
    const { sim, r1 } = setup();
    run(sim, r1.id, ['en', 'conf t', 'enable secret Tajne-2026', 'end']);
    const session = newSession(r1.id);
    const prompt = cliExecute(sim, session, 'enable');
    expect(prompt.secret).toBe(true);
    cliExecute(sim, session, 'zle');
    expect(session.mode).toBe('user');
    cliExecute(sim, session, 'enable');
    cliExecute(sim, session, 'Tajne-2026');
    expect(session.mode).toBe('priv');
    expect(r1.mgmt.enableSecret).not.toContain('Tajne');
  });
});

describe('host terminal', () => {
  it('prints Windows-style ping output in Polish and English', async () => {
    const { hostExecute, newHostSession } = await import('../../src/sim/cli/host');
    const { sim, pc10 } = setup();
    const session = newHostSession(pc10.id);
    const pl = hostExecute(sim, session, 'ping 192.168.10.10', 'pl').lines.join('\n');
    expect(pl).toContain('Badanie 192.168.10.10 z 32 bajtami danych:');
    expect(pl).toContain('Odpowiedź z 192.168.10.10: bajtów=32 czas<1 ms TTL=128');
    const en = hostExecute(sim, session, 'ipconfig /all', 'en').lines.join('\n');
    expect(en).toContain('IPv4 Address');
    expect(en).toContain('192.168.10.10');
  });

  it('logs in over SSH only after hardening the router', async () => {
    const { hostExecute, newHostSession } = await import('../../src/sim/cli/host');
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(pc, 'eth0', r1, 'Gi0/0/0').ip(r1, 'Gi0/0/0', '10.0.0.1/24').host(pc, '10.0.0.10/24', '10.0.0.1');
    const sim = new Simulator(b.net);
    const session = newHostSession(pc.id);
    expect(hostExecute(sim, session, 'ssh -l admin 10.0.0.1', 'pl').lines.join('\n')).toContain('odrzucone');
    run(sim, r1.id, ['en', 'conf t', 'ip domain-name firma.lan', 'crypto key generate rsa', 'ip ssh version 2', 'username admin secret Mocne-Haslo-1', 'line vty 0 4', 'login local', 'transport input ssh', 'end']);
    const login = hostExecute(sim, session, 'ssh -l admin 10.0.0.1', 'pl');
    expect(login.secret).toBe(true);
    hostExecute(sim, session, 'Mocne-Haslo-1', 'pl');
    expect(session.remote?.stage).toBe('cli');
    const brief = hostExecute(sim, session, 'show ip interface brief', 'pl').lines.join('\n');
    expect(brief).toContain('10.0.0.1');
    expect(hostExecute(sim, newHostSession(pc.id), 'telnet 10.0.0.1', 'pl').lines.join('\n')).toContain('odrzucone');
  });
});
