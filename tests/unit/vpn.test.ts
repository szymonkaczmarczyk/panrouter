import { describe, expect, it } from 'vitest';
import { NetBuilder } from '../../src/sim/builder';
import { packetRow } from '../../src/sim/capture';
import { cliExecute, newSession } from '../../src/sim/cli/ios';
import { runningConfig, showIsakmpSa } from '../../src/sim/cli/show';
import { Simulator } from '../../src/sim/engine';
import { parseIp } from '../../src/sim/ip';
import type { Device, TraceEvent } from '../../src/sim/types';
import { encodeFrame } from '../../src/sim/wire';

function branches() {
  const b = new NetBuilder();
  const r1 = b.add('router', 'R1', 0, 0);
  const isp = b.add('router', 'ISP', 0, 0);
  const r2 = b.add('router', 'R2', 0, 0);
  const pc1 = b.add('pc', 'PC1', 0, 0);
  const pc2 = b.add('pc', 'PC2', 0, 0);
  b.link(pc1, 'eth0', r1, 'Gi0/0/0').link(r1, 'Gi0/0/1', isp, 'Gi0/0/0').link(isp, 'Gi0/0/1', r2, 'Gi0/0/1').link(r2, 'Gi0/0/0', pc2, 'eth0');
  b.ip(r1, 'Gi0/0/0', '192.168.1.1/24').ip(r1, 'Gi0/0/1', '203.0.113.1/30');
  b.ip(isp, 'Gi0/0/0', '203.0.113.2/30').ip(isp, 'Gi0/0/1', '198.51.100.2/30');
  b.ip(r2, 'Gi0/0/1', '198.51.100.1/30').ip(r2, 'Gi0/0/0', '192.168.2.1/24');
  b.host(pc1, '192.168.1.10/24', '192.168.1.1').host(pc2, '192.168.2.10/24', '192.168.2.1');
  r1.routes.push({ net: '0.0.0.0', prefix: 0, via: '203.0.113.2', iface: '', ad: 1 });
  r2.routes.push({ net: '0.0.0.0', prefix: 0, via: '198.51.100.2', iface: '', ad: 1 });
  const sim = new Simulator(b.net);
  const run = (device: Device, lines: string[]) => {
    const session = newSession(device.id);
    const out: string[] = [];
    for (const line of ['enable', 'conf t', ...lines, 'end']) {
      const result = cliExecute(sim, session, line);
      out.push(...result.lines);
      if (result.changed) sim.invalidate();
    }
    return out.join('\n');
  };
  return { sim, run, r1, r2, isp, pc1, pc2 };
}

const tunnel = (key: string, local: string, peer: string, inside: string, mode = 'ipsec ipv4') => [
  `crypto isakmp key ${key} address ${peer}`,
  'crypto ipsec profile VPN',
  'exit',
  'interface Tunnel0',
  `ip address ${inside} 255.255.255.252`,
  `tunnel source ${local}`,
  `tunnel mode ${mode}`,
  `tunnel destination ${peer}`,
  ...(mode === 'ipsec ipv4' ? ['tunnel protection ipsec profile VPN'] : []),
];

describe('VPN między oddziałami', () => {
  it('bez tunelu dostawca nie zna prywatnych sieci', () => {
    const { sim, pc1 } = branches();
    expect(sim.canReach(pc1.id, parseIp('192.168.2.10')!)).toBe(false);
  });

  it('tunel IPsec przenosi ruch, a po drodze widać tylko ESP między routerami', () => {
    const { sim, run, r1, r2, pc1, isp } = branches();
    run(r1, [...tunnel('Tajne123', 'g0/0/1', '198.51.100.1', '10.255.0.1'), 'exit', 'ip route 192.168.2.0 255.255.255.0 10.255.0.2']);
    run(r2, [...tunnel('Tajne123', 'g0/0/1', '203.0.113.1', '10.255.0.2'), 'exit', 'ip route 192.168.1.0 255.255.255.0 10.255.0.1']);
    expect(sim.topo.l3If(r1, 'Tunnel0')?.up).toBe(true);
    expect(sim.canReach(pc1.id, parseIp('192.168.2.10')!)).toBe(true);
    const events: TraceEvent[] = [];
    sim.onTrace = (batch) => events.push(...batch);
    const result = sim.echo(pc1.id, parseIp('192.168.2.10')!);
    expect(result.outcome).toBe('reply');
    const onIsp = events.filter((e) => e.to?.dev === isp.id || e.from.dev === isp.id).filter((e) => e.frame.type === 'ipv4');
    expect(onIsp.length).toBeGreaterThan(0);
    expect(onIsp.every((e) => e.frame.ip?.proto === 'esp')).toBe(true);
    const row = packetRow(onIsp[0], 1);
    expect(row.protocol).toBe('ESP');
    expect(row.source === '203.0.113.1' || row.source === '198.51.100.1').toBe(true);
    const bytes = encodeFrame(onIsp[0].frame, 1);
    expect(bytes[14 + 9]).toBe(50);
    expect(showIsakmpSa(sim, r1).join('\n')).toContain('QM_IDLE');
    const config = runningConfig(sim, r1).join('\n');
    expect(config).toContain('crypto isakmp key Tajne123 address 198.51.100.1');
    expect(config).toContain('interface Tunnel0');
    expect(config).toContain(' tunnel mode ipsec ipv4');
    expect(config).toContain(' tunnel protection ipsec profile VPN');
  });

  it('różne klucze nie zestawiają tunelu IPsec', () => {
    const { sim, run, r1, r2, pc1 } = branches();
    run(r1, [...tunnel('Tajne123', 'g0/0/1', '198.51.100.1', '10.255.0.1'), 'exit', 'ip route 192.168.2.0 255.255.255.0 10.255.0.2']);
    run(r2, [...tunnel('Inne999', 'g0/0/1', '203.0.113.1', '10.255.0.2'), 'exit', 'ip route 192.168.1.0 255.255.255.0 10.255.0.1']);
    expect(sim.topo.l3If(r1, 'Tunnel0')?.up).toBe(false);
    expect(sim.canReach(pc1.id, parseIp('192.168.2.10')!)).toBe(false);
    expect(showIsakmpSa(sim, r1).join('\n')).toContain('MM_KEY_EXCH');
  });

  it('GRE działa bez szyfrowania i pokazuje pakiet w środku', () => {
    const { sim, run, r1, r2, pc1, isp } = branches();
    run(r1, [...tunnel('x', 'g0/0/1', '198.51.100.1', '10.255.0.1', 'gre ip'), 'exit', 'ip route 192.168.2.0 255.255.255.0 Tunnel0']);
    run(r2, [...tunnel('x', 'g0/0/1', '203.0.113.1', '10.255.0.2', 'gre ip'), 'exit', 'ip route 192.168.1.0 255.255.255.0 Tunnel0']);
    expect(sim.canReach(pc1.id, parseIp('192.168.2.10')!)).toBe(true);
    const events: TraceEvent[] = [];
    sim.onTrace = (batch) => events.push(...batch);
    sim.echo(pc1.id, parseIp('192.168.2.10')!);
    const gre = events.find((e) => e.to?.dev === isp.id && e.frame.ip?.proto === 'gre')!;
    expect(packetRow(gre, 1).info).toContain('192.168.1.10 → 192.168.2.10');
  });

  it('trasa do końca tunelu przez sam tunel to pętla', () => {
    const { sim, run, r1, r2, pc1 } = branches();
    run(r1, [...tunnel('Tajne123', 'g0/0/1', '198.51.100.1', '10.255.0.1'), 'exit', 'ip route 192.168.2.0 255.255.255.0 10.255.0.2', 'no ip route 0.0.0.0 0.0.0.0 203.0.113.2', 'ip route 198.51.100.0 255.255.255.252 10.255.0.2']);
    run(r2, [...tunnel('Tajne123', 'g0/0/1', '203.0.113.1', '10.255.0.2'), 'exit', 'ip route 192.168.1.0 255.255.255.0 10.255.0.1']);
    expect(sim.canReach(pc1.id, parseIp('192.168.2.10')!)).toBe(false);
  });
});
