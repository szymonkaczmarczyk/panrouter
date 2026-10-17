import { describe, expect, it } from 'vitest';
import { Simulator } from '../../src/sim/engine';
import { findDeviceByName } from '../../src/sim/network';
import { TEMPLATES } from '../../src/sim/templates';

function boot(id: string) {
  const net = TEMPLATES.find((t) => t.id === id)!.build();
  const sim = new Simulator(net);
  sim.autoDhcp();
  const dev = (name: string) => findDeviceByName(net, name)!;
  return { sim, dev };
}

describe('templates', () => {
  it('home network reaches the internet over Wi-Fi and cable', () => {
    const { sim, dev } = boot('home');
    expect(sim.http(dev('LAPTOP1').id, 'https://www.przyklad.pl').status).toBe('ok');
    expect(sim.http(dev('PC1').id, 'https://www.przyklad.pl').status).toBe('ok');
    expect(dev('PRN1').ports[0].ip).toMatch(/^192\.168\.1\.1\d\d$/);
  });

  it('small office gives DHCP leases, NATs to the internet and serves the intranet', () => {
    const { sim, dev } = boot('office');
    const pc = dev('PC1');
    expect(pc.ports[0].ip).toBe('192.168.10.50');
    expect(sim.http(pc.id, 'http://intranet.firma.lan').title).toBe('Intranet firmy');
    expect(sim.http(pc.id, 'https://www.przyklad.pl').status).toBe('ok');
    expect(sim.topo.isPowered(dev('CAM1'))).toBe(true);
    expect(sim.topo.wifiStatus(dev('LAPTOP1').id)).toBe('connected');
  });

  it('two branches route with OSPF', () => {
    const { sim, dev } = boot('branches');
    expect(sim.http(dev('PC1').id, 'http://192.168.2.20').status).toBe('ok');
  });

  it('campus relays DHCP per VLAN and reaches the internet through the firewall', () => {
    const { sim, dev } = boot('campus');
    const pc = dev('PC1');
    expect(pc.ports[0].ip.startsWith('10.10.10.')).toBe(true);
    expect(dev('VOIP1').ports[0].ip.startsWith('10.10.20.')).toBe(true);
    expect(sim.canReach(pc.id, 0xc6336450)).toBe(true);
    expect(sim.http(pc.id, 'https://www.przyklad.pl').status).toBe('ok');
  });
});
