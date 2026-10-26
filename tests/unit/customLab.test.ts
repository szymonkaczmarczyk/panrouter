import { describe, expect, it } from 'vitest';
import { decodeCustomLab, encodeCustomLab, normalizeCustomLab, runCustomChecks, type CustomLab } from '../../src/content/customLab';
import { TEMPLATES } from '../../src/sim/templates';

const office = () => TEMPLATES.find((t) => t.id === 'office')!.build();

describe('laboratorium z linku', () => {
  it('sprawdza ping po nazwie i adresie, brak pingu oraz stronę WWW', () => {
    const net = office();
    const srv = net.devices.find((d) => d.name === 'SRV1')!;
    const results = runCustomChecks(net, [
      { kind: 'ping', from: 'PC1', target: 'SRV1' },
      { kind: 'ping', from: 'PC1', target: srv.ports[0].ip },
      { kind: 'noping', from: 'PC1', target: 'SRV1' },
      { kind: 'http', from: 'PC1', target: `http://${srv.ports[0].ip}` },
      { kind: 'ping', from: 'PC1', target: '10.99.99.99' },
    ]);
    expect(results).toEqual([true, true, false, true, false]);
  });

  it('wykrywa zepsutą sieć ucznia', () => {
    const net = office();
    const pc = net.devices.find((d) => d.name === 'PC1')!;
    pc.ports[0].dhcp = false;
    pc.ports[0].ip = '';
    expect(runCustomChecks(net, [{ kind: 'ping', from: 'PC1', target: 'SRV1' }])).toEqual([false]);
  });

  it('odrzuca warunki z nieistniejącymi urządzeniami i pusty tytuł', () => {
    const net = office();
    const lab = normalizeCustomLab({ title: '  Brama  ', text: 'a\r\nb', net, checks: [{ kind: 'ping', from: 'PC1', target: 'SRV1' }, { kind: 'ping', from: 'NIE-MA', target: 'SRV1' }, { kind: 'rm', from: 'PC1', target: 'x' }] });
    expect(lab?.title).toBe('Brama');
    expect(lab?.text).toBe('a\nb');
    expect(lab?.checks).toHaveLength(1);
    expect(normalizeCustomLab({ title: '', net, checks: [{ kind: 'ping', from: 'PC1', target: 'SRV1' }] })).toBeNull();
    expect(normalizeCustomLab({ title: 'x', net, checks: [] })).toBeNull();
  });

  it('przechodzi przez link bez zmian', async () => {
    const lab: CustomLab = { title: 'Test', text: 'Zrób to', checks: [{ kind: 'ping', from: 'PC1', target: 'SRV1' }], net: office() };
    const data = await encodeCustomLab(lab);
    expect(await decodeCustomLab(data)).toEqual(lab);
    expect(await decodeCustomLab(`${data.slice(0, 40)}`)).toBeNull();
  });
});
