import { describe, expect, it } from 'vitest';
import { normalizeNetwork } from '../../src/sim/normalize';
import { createDevice, emptyNetwork } from '../../src/sim/network';
import { decodeNetwork, encodeNetwork, shareParam } from '../../src/sim/share';
import { TEMPLATES } from '../../src/sim/templates';

describe('normalizacja sieci', () => {
  it('zachowuje każdy szablon bez zmian', () => {
    for (const template of TEMPLATES) {
      const net = template.build();
      expect(normalizeNetwork(JSON.parse(JSON.stringify(net)))).toEqual(net);
    }
  });

  it('odrzuca dane, które nie są siecią', () => {
    for (const value of [null, 42, 'tekst', [], {}, { version: 2, devices: [], links: [] }, { version: 1, devices: {}, links: [] }]) {
      expect(normalizeNetwork(value)).toBeNull();
    }
  });

  it('usuwa nieznane urządzenia, zdublowane id i kable do nieistniejących portów', () => {
    const net = emptyNetwork();
    const pc = createDevice(net, 'pc', 0, 0);
    const sw = createDevice(net, 'switch', 100, 0);
    net.devices.push(pc, sw);
    const raw = JSON.parse(JSON.stringify(net));
    raw.devices.push({ ...raw.devices[0] }, { id: 'x1', kind: 'mainframe', ports: [] });
    raw.links = [
      { id: 'l1', a: { dev: pc.id, port: pc.ports[0].name }, b: { dev: sw.id, port: sw.ports[0].name }, cable: 'copper' },
      { id: 'l2', a: { dev: pc.id, port: 'nie-ma' }, b: { dev: sw.id, port: sw.ports[1].name }, cable: 'copper' },
      { id: 'l3', a: { dev: pc.id, port: pc.ports[0].name }, b: { dev: sw.id, port: sw.ports[2].name }, cable: 'copper' },
    ];
    const clean = normalizeNetwork(raw)!;
    expect(clean.devices.map((d) => d.id)).toEqual([pc.id, sw.id]);
    expect(clean.links.map((l) => l.id)).toEqual(['l1']);
  });

  it('wymusza typy i zakresy pól', () => {
    const net = emptyNetwork();
    const sw = createDevice(net, 'switch', 0, 0);
    net.devices.push(sw);
    const raw = JSON.parse(JSON.stringify(net));
    raw.devices[0].name = { toString: 'atak' };
    raw.devices[0].stpPriority = 999999;
    raw.devices[0].ports[0].accessVlan = 'abc';
    raw.devices[0].ports[0].mode = '<script>';
    raw.devices[0].ports[0].portSecurity = { enabled: true, maximum: 9999, violation: 'boom', macs: ['zly', 'aabbccddeeff'] };
    raw.devices[0].injected = 'nie powinno przejść';
    const clean = normalizeNetwork(raw)!;
    const dev = clean.devices[0];
    expect(typeof dev.name).toBe('string');
    expect(dev.stpPriority).toBe(61440);
    expect(dev.ports[0].accessVlan).toBe(1);
    expect(dev.ports[0].mode).toBe('access');
    expect(dev.ports[0].portSecurity).toEqual({ enabled: true, maximum: 64, violation: 'shutdown', sticky: false, macs: ['aabbccddeeff'], stickyMacs: [] });
    expect('injected' in dev).toBe(false);
  });

  it('uzupełnia brakujące nowe pola w starych zapisach', () => {
    const net = TEMPLATES.find((t) => t.id === 'office')!.build();
    const raw = JSON.parse(JSON.stringify(net));
    for (const device of raw.devices) {
      delete device.dhcpSnooping;
      for (const port of device.ports) {
        delete port.portSecurity;
        delete port.channelGroup;
        delete port.fhrp;
      }
    }
    const clean = normalizeNetwork(raw)!;
    expect(clean.devices[0].dhcpSnooping).toEqual({ enabled: false, vlans: [] });
    expect(clean.devices[0].ports[0].portSecurity.enabled).toBe(false);
    expect(clean.devices[0].ports[0].fhrp).toBeNull();
  });
});

describe('link do sieci', () => {
  it('koduje i dekoduje każdy szablon bez strat', async () => {
    for (const template of TEMPLATES) {
      const net = template.build();
      const data = await encodeNetwork(net);
      expect(data).toMatch(/^1\.[A-Za-z0-9_-]+$/);
      expect(await decodeNetwork(data)).toEqual(net);
    }
  });

  it('kampus mieści się w rozsądnej długości linku', async () => {
    const data = await encodeNetwork(TEMPLATES.find((t) => t.id === 'campus')!.build());
    expect(data.length).toBeLessThan(30_000);
  });

  it('odrzuca uszkodzone i spreparowane dane', async () => {
    const good = await encodeNetwork(TEMPLATES[1].build());
    expect(await decodeNetwork(good.slice(0, good.length / 2))).toBeNull();
    expect(await decodeNetwork('2.' + good.slice(2))).toBeNull();
    expect(await decodeNetwork('1.!!!')).toBeNull();
    expect(await decodeNetwork('1.' + 'A'.repeat(500_000))).toBeNull();
    const bomb = new Uint8Array(await new Response(new Blob([new Uint8Array(20_000_000)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    let binary = '';
    for (const byte of bomb) binary += String.fromCharCode(byte);
    const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await decodeNetwork(`1.${payload}`)).toBeNull();
  });

  it('czyta parametr z adresu', () => {
    expect(shareParam('/symulator?siec=1.abc')).toBe('1.abc');
    expect(shareParam('/symulator')).toBeNull();
  });
});
