import { describe, expect, it } from 'vitest';
import { compileFilter, hexDump, packetRow } from '../../src/sim/capture';
import { Simulator } from '../../src/sim/engine';
import { parseIp } from '../../src/sim/ip';
import { TEMPLATES } from '../../src/sim/templates';
import type { TraceEvent } from '../../src/sim/types';
import { capturable, encodeFrame, pcapFile } from '../../src/sim/wire';

function traffic(): TraceEvent[] {
  const net = TEMPLATES.find((t) => t.id === 'campus')!.build();
  const sim = new Simulator(net);
  const events: TraceEvent[] = [];
  sim.onTrace = (batch) => events.push(...batch);
  sim.autoDhcp();
  const pc = net.devices.find((d) => d.kind === 'pc')!;
  sim.ping(pc.id, parseIp('198.51.100.80')!, 1);
  sim.traceroute(pc.id, parseIp('198.51.100.80')!, 3);
  sim.http(pc.id, 'http://www.przyklad.pl/');
  sim.http(pc.id, 'https://www.przyklad.pl/');
  return events.filter(capturable);
}

function sum16(bytes: Uint8Array, from: number, to: number, initial = 0): number {
  let sum = initial;
  for (let i = from; i < to; i += 2) sum += (bytes[i] << 8) | (i + 1 < to ? bytes[i + 1] : 0);
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16);
  return sum;
}

describe('bajty ramek', () => {
  const events = traffic();

  it('nagłówki IPv4 oraz segmenty TCP, UDP i ICMP mają poprawne sumy kontrolne', () => {
    let checked = 0;
    for (const event of events) {
      if (!event.frame.ip) continue;
      const bytes = encodeFrame(event.frame, event.seq);
      const start = event.frame.vlan !== null ? 18 : 14;
      expect(sum16(bytes, start, start + 20)).toBe(0xffff);
      const total = (bytes[start + 2] << 8) | bytes[start + 3];
      const proto = bytes[start + 9];
      const l4 = start + 20;
      const end = start + total;
      const pseudo = sum16(bytes, start + 12, start + 20) + proto + (total - 20);
      expect(sum16(bytes, l4, end, proto === 1 ? 0 : pseudo)).toBe(0xffff);
      checked++;
    }
    expect(checked).toBeGreaterThan(40);
  });

  it('ramki mają co najmniej 60 bajtów, a tagowane VLAN niosą 0x8100', () => {
    for (const event of events) {
      const bytes = encodeFrame(event.frame, event.seq);
      expect(bytes.length).toBeGreaterThanOrEqual(60);
      if (event.frame.vlan !== null) expect((bytes[12] << 8) | bytes[13]).toBe(0x8100);
    }
    expect(events.some((e) => e.frame.vlan !== null)).toBe(true);
  });

  it('plik pcap ma nagłówek i po jednym rekordzie na ramkę', () => {
    const file = pcapFile(events, Date.UTC(2026, 0, 1));
    const view = new DataView(file.buffer);
    expect(view.getUint32(0, true)).toBe(0xa1b2c3d4);
    expect(view.getUint32(20, true)).toBe(1);
    let offset = 24;
    let records = 0;
    while (offset < file.length) {
      offset += 16 + view.getUint32(offset + 8, true);
      records++;
    }
    expect(offset).toBe(file.length);
    expect(records).toBe(events.length);
  });

  it('wiersz tabeli opisuje pakiet jak Wireshark', () => {
    const arp = events.find((e) => e.frame.arp?.op === 'request')!;
    expect(packetRow(arp, 1).info).toMatch(/^Who has [\d.]+\? Tell [\d.]+$/);
    const dns = events.find((e) => e.frame.ip?.udp?.dns && !e.frame.ip.udp.dns.response)!;
    expect(packetRow(dns, 2)).toMatchObject({ protocol: 'DNS', info: expect.stringContaining('Standard query') });
    const tls = events.find((e) => e.frame.ip?.tcp?.http && e.frame.ip.tcp.dport === 443)!;
    expect(packetRow(tls, 3).protocol).toBe('TLSv1.3');
    expect(hexDump(encodeFrame(arp.frame))[0].offset).toBe('0000');
  });
});

describe('filtr wyświetlania', () => {
  const events = traffic();
  const count = (filter: string) => {
    const result = compileFilter(filter);
    if (!result.ok) throw new Error(`niepoprawny filtr ${filter}`);
    return events.filter(result.test).length;
  };

  it('rozpoznaje protokoły i operatory logiczne', () => {
    expect(count('')).toBe(events.length);
    expect(count('arp')).toBeGreaterThan(0);
    expect(count('arp or icmp')).toBe(count('arp') + count('icmp'));
    expect(count('ip and not icmp')).toBe(count('ip') - count('icmp'));
    expect(count('!(arp || ip)')).toBe(0);
  });

  it('porównuje pola adresów i portów', () => {
    expect(count('ip.addr == 198.51.100.80')).toBeGreaterThan(0);
    expect(count('ip.dst == 198.51.100.80 && tcp.dstport == 443')).toBeGreaterThan(0);
    expect(count('tcp.port == 80')).toBe(count('http') + count('tcp.port == 80 and not http'));
    expect(count('ip.ttl < 2')).toBeGreaterThan(0);
    expect(count('dns.qry.name contains przyklad')).toBe(count('dns'));
    expect(count('ip.src != 0.0.0.0 and udp.port == 67')).toBeGreaterThan(0);
  });

  it('zgłasza błąd dla niepoprawnego filtru', () => {
    for (const bad of ['ip.addr ==', 'ip.addr == 999.1.1.1', 'tcp.port = 80', 'nieznane', '(arp', 'arp or']) {
      expect(compileFilter(bad).ok).toBe(false);
    }
  });
});
