import { protocolOf } from './engine';
import { formatMacColon, ipToStr, parseIp } from './ip';
import { formatIpv6, parseIpv6 } from './ip6';
import type { Frame, TraceEvent } from './types';
import { encodeFrame } from './wire';

export interface PacketRow {
  no: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
}

function macLabel(mac: string): string {
  return mac === 'ffffffffffff' ? 'Broadcast' : formatMacColon(mac);
}

function info(frame: Frame): string {
  if (frame.ip6) {
    const i = frame.ip6.icmp6;
    const ident = `id=0x${i.id.toString(16).padStart(4, '0')}, seq=${i.seq}, hop limit=${frame.ip6.hop}`;
    if (i.type === 'echo-request') return `Echo (ping) request ${ident}`;
    if (i.type === 'echo-reply') return `Echo (ping) reply ${ident}`;
    if (i.type === 'ns') return `Neighbor Solicitation for ${formatIpv6(i.target)} from ${formatMacColon(i.mac)}`;
    if (i.type === 'na') return `Neighbor Advertisement ${formatIpv6(i.target)} (sol, ovr) is at ${formatMacColon(i.mac)}`;
    if (i.type === 'time-exceeded') return 'Time Exceeded (hop limit exceeded in transit)';
    return 'Destination Unreachable (no route to destination)';
  }
  if (frame.arp) {
    const a = frame.arp;
    return a.op === 'request' ? `Who has ${ipToStr(a.targetIp)}? Tell ${ipToStr(a.senderIp)}` : `${ipToStr(a.senderIp)} is at ${formatMacColon(a.senderMac)}`;
  }
  const ip = frame.ip;
  if (!ip) return '';
  if (ip.proto === 'esp') return `ESP (SPI=0x${(ip.spi ?? 0).toString(16).padStart(8, '0')})`;
  if (ip.proto === 'gre' && ip.inner) return `GRE: ${ipToStr(ip.inner.src)} → ${ipToStr(ip.inner.dst)} ${info({ ...frame, ip: ip.inner })}`;
  if (ip.icmp) {
    const i = ip.icmp;
    if (i.type === 'echo-request') return `Echo (ping) request id=0x${i.id.toString(16).padStart(4, '0')}, seq=${i.seq}, ttl=${ip.ttl}`;
    if (i.type === 'echo-reply') return `Echo (ping) reply id=0x${i.id.toString(16).padStart(4, '0')}, seq=${i.seq}, ttl=${ip.ttl}`;
    if (i.type === 'time-exceeded') return 'Time-to-live exceeded (Time to live exceeded in transit)';
    const codes: Record<number, string> = { 0: 'Network unreachable', 1: 'Host unreachable', 3: 'Port unreachable', 13: 'Communication administratively filtered' };
    return `Destination unreachable (${codes[i.code] ?? `code ${i.code}`})`;
  }
  if (ip.udp?.dhcp) {
    const d = ip.udp.dhcp;
    return `DHCP ${d.op.charAt(0).toUpperCase()}${d.op.slice(1)} - Transaction ID 0x${d.xid.toString(16)}`;
  }
  if (ip.udp?.dns) {
    const d = ip.udp.dns;
    if (!d.response) return `Standard query 0x${d.id.toString(16).padStart(4, '0')} A ${d.name}`;
    return d.rcode === 'ok' ? `Standard query response 0x${d.id.toString(16).padStart(4, '0')} A ${d.name} A ${ipToStr(d.answer)}` : `Standard query response 0x${d.id.toString(16).padStart(4, '0')} No such name A ${d.name}`;
  }
  if (ip.udp) return `${ip.udp.sport} → ${ip.udp.dport} Len=0`;
  if (ip.tcp) {
    const t = ip.tcp;
    const tls = t.sport === 443 || t.dport === 443;
    if (t.http && tls) return 'Application Data';
    if (t.http?.kind === 'request') return `${t.http.method} ${t.http.path} HTTP/1.1`;
    if (t.http?.kind === 'response') return `HTTP/1.1 ${t.http.status} OK  (text/html)`;
    return `${t.sport} → ${t.dport} [${t.flags.join(', ')}] Win=64240 Len=0`;
  }
  return '';
}

export function protocolLabel(event: TraceEvent): string {
  const proto = protocolOf(event.frame);
  return proto === 'HTTPS' ? 'TLSv1.3' : proto;
}

export function packetRow(event: TraceEvent, no: number): PacketRow {
  const frame = event.frame;
  const ip = frame.ip;
  const ip6 = frame.ip6;
  return {
    no,
    time: (event.time / 1000).toFixed(6),
    source: ip6 ? formatIpv6(ip6.src) : ip ? ipToStr(ip.src) : macLabel(frame.src),
    destination: ip6 ? formatIpv6(ip6.dst) : ip ? ipToStr(ip.dst) : macLabel(frame.dst),
    protocol: protocolLabel(event),
    length: encodeFrame(frame, event.seq).length,
    info: info(frame),
  };
}

export function hexDump(bytes: Uint8Array): { offset: string; hex: string; ascii: string }[] {
  const rows: { offset: string; hex: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = [...bytes.slice(i, i + 16)];
    const hex = chunk.map((b) => b.toString(16).padStart(2, '0'));
    rows.push({
      offset: i.toString(16).padStart(4, '0'),
      hex: [...hex.slice(0, 8), ' ', ...hex.slice(8)].join(' ').replace('   ', '  '),
      ascii: chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join(''),
    });
  }
  return rows;
}

type Value = number | string | bigint | null;
type Getter = (event: TraceEvent) => Value[];

const ports = (event: TraceEvent, which: 'src' | 'dst' | 'any', proto: 'tcp' | 'udp'): Value[] => {
  const seg = event.frame.ip?.[proto];
  if (!seg) return [];
  if (which === 'src') return [seg.sport];
  if (which === 'dst') return [seg.dport];
  return [seg.sport, seg.dport];
};

const FIELDS: Record<string, Getter> = {
  'ip.addr': (e) => (e.frame.ip ? [e.frame.ip.src, e.frame.ip.dst] : e.frame.arp ? [e.frame.arp.senderIp, e.frame.arp.targetIp] : []),
  'ip.src': (e) => (e.frame.ip ? [e.frame.ip.src] : []),
  'ip.dst': (e) => (e.frame.ip ? [e.frame.ip.dst] : []),
  'ip.ttl': (e) => (e.frame.ip ? [e.frame.ip.ttl] : []),
  'ipv6.addr': (e) => (e.frame.ip6 ? [e.frame.ip6.src, e.frame.ip6.dst] : []),
  'ipv6.src': (e) => (e.frame.ip6 ? [e.frame.ip6.src] : []),
  'ipv6.dst': (e) => (e.frame.ip6 ? [e.frame.ip6.dst] : []),
  'ipv6.hlim': (e) => (e.frame.ip6 ? [e.frame.ip6.hop] : []),
  'icmpv6.type': (e) => {
    const type = e.frame.ip6?.icmp6.type;
    return type ? [{ 'echo-request': 128, 'echo-reply': 129, ns: 135, na: 136, unreachable: 1, 'time-exceeded': 3 }[type]] : [];
  },
  'eth.addr': (e) => [e.frame.src, e.frame.dst],
  'eth.src': (e) => [e.frame.src],
  'eth.dst': (e) => [e.frame.dst],
  'vlan.id': (e) => (e.frame.vlan !== null ? [e.frame.vlan] : []),
  'tcp.port': (e) => ports(e, 'any', 'tcp'),
  'tcp.srcport': (e) => ports(e, 'src', 'tcp'),
  'tcp.dstport': (e) => ports(e, 'dst', 'tcp'),
  'udp.port': (e) => ports(e, 'any', 'udp'),
  'udp.srcport': (e) => ports(e, 'src', 'udp'),
  'udp.dstport': (e) => ports(e, 'dst', 'udp'),
  'icmp.type': (e) => {
    const type = e.frame.ip?.icmp?.type;
    return type ? [{ 'echo-request': 8, 'echo-reply': 0, unreachable: 3, 'time-exceeded': 11 }[type]] : [];
  },
  'esp.spi': (e) => (e.frame.ip?.proto === 'esp' ? [e.frame.ip.spi ?? 0] : []),
  'arp.opcode': (e) => (e.frame.arp ? [e.frame.arp.op === 'request' ? 1 : 2] : []),
  'dns.qry.name': (e) => (e.frame.ip?.udp?.dns ? [e.frame.ip.udp.dns.name.toLowerCase()] : []),
  'http.host': (e) => (e.frame.ip?.tcp?.http ? [e.frame.ip.tcp.http.host.toLowerCase()] : []),
};

const PROTOCOLS: Record<string, (e: TraceEvent) => boolean> = {
  eth: () => true,
  arp: (e) => e.frame.type === 'arp',
  ip: (e) => Boolean(e.frame.ip),
  ipv6: (e) => Boolean(e.frame.ip6),
  icmpv6: (e) => Boolean(e.frame.ip6),
  ndp: (e) => e.frame.ip6?.icmp6.type === 'ns' || e.frame.ip6?.icmp6.type === 'na',
  icmp: (e) => Boolean(e.frame.ip?.icmp),
  udp: (e) => Boolean(e.frame.ip?.udp),
  tcp: (e) => Boolean(e.frame.ip?.tcp),
  dhcp: (e) => Boolean(e.frame.ip?.udp?.dhcp),
  bootp: (e) => Boolean(e.frame.ip?.udp?.dhcp),
  dns: (e) => Boolean(e.frame.ip?.udp?.dns),
  http: (e) => Boolean(e.frame.ip?.tcp?.http) && e.frame.ip?.tcp?.dport !== 443 && e.frame.ip?.tcp?.sport !== 443,
  tls: (e) => Boolean(e.frame.ip?.tcp?.http) && (e.frame.ip?.tcp?.dport === 443 || e.frame.ip?.tcp?.sport === 443),
  esp: (e) => e.frame.ip?.proto === 'esp',
  gre: (e) => e.frame.ip?.proto === 'gre',
  vlan: (e) => e.frame.vlan !== null,
  dropped: (e) => e.outcome === 'drop',
};

const OPERATORS = ['==', '!=', '>=', '<=', '>', '<', 'eq', 'ne', 'gt', 'lt', 'ge', 'le', 'contains'];

function tokenize(text: string): string[] | null {
  const tokens: string[] = [];
  const re = /\s*(&&|\|\||==|!=|>=|<=|[()!<>]|"[^"]*"|[A-Za-z0-9_.:\-/]+)/y;
  let index = 0;
  while (index < text.length) {
    if (/^\s+$/.test(text.slice(index))) break;
    re.lastIndex = index;
    const match = re.exec(text);
    if (!match) return null;
    tokens.push(match[1]);
    index = re.lastIndex;
  }
  return tokens;
}

function literal(field: string, raw: string): Value {
  const value = raw.replace(/^"|"$/g, '');
  if (field.startsWith('ipv6.') && field !== 'ipv6.hlim') return parseIpv6(value);
  if (field.startsWith('ip.') && field !== 'ip.ttl') return parseIp(value);
  if (field.startsWith('eth.')) {
    const hex = value.toLowerCase().replace(/[:.\-]/g, '');
    return /^[0-9a-f]{12}$/.test(hex) ? hex : null;
  }
  if (field === 'dns.qry.name' || field === 'http.host') return value.toLowerCase();
  if (/^0x[0-9a-f]+$/i.test(value)) return parseInt(value, 16);
  return /^\d+$/.test(value) ? Number(value) : null;
}

function compare(op: string, left: Value, right: Value): boolean {
  if (left === null || right === null) return false;
  switch (op) {
    case '==':
    case 'eq':
      return left === right;
    case '!=':
    case 'ne':
      return left !== right;
    case 'contains':
      return String(left).includes(String(right));
    case '>':
    case 'gt':
      return left > right;
    case '<':
    case 'lt':
      return left < right;
    case '>=':
    case 'ge':
      return left >= right;
    default:
      return left <= right;
  }
}

export type FilterResult = { ok: true; test: (event: TraceEvent) => boolean } | { ok: false; error: string };

export function compileFilter(text: string): FilterResult {
  if (!text.trim()) return { ok: true, test: () => true };
  const tokens = tokenize(text);
  if (!tokens) return { ok: false, error: text };
  let index = 0;
  const peek = () => tokens[index]?.toLowerCase();
  const fail = (token?: string): never => {
    throw new Error(token ?? '');
  };

  const primary = (): ((e: TraceEvent) => boolean) => {
    const token = peek();
    if (token === undefined) return fail();
    if (token === '(') {
      index++;
      const inner = orExpr();
      if (peek() !== ')') fail(tokens[index]);
      index++;
      return inner;
    }
    if (token === '!' || token === 'not') {
      index++;
      const inner = primary();
      return (e) => !inner(e);
    }
    index++;
    if (FIELDS[token]) {
      const op = peek();
      if (!op || !OPERATORS.includes(op)) return (e) => FIELDS[token](e).length > 0;
      index++;
      const raw = tokens[index];
      if (raw === undefined) fail();
      index++;
      const value = literal(token, raw);
      if (value === null) fail(raw);
      const getter = FIELDS[token];
      if (op === '!=' || op === 'ne') return (e) => getter(e).every((v) => compare(op, v, value));
      return (e) => getter(e).some((v) => compare(op, v, value));
    }
    if (PROTOCOLS[token]) return PROTOCOLS[token];
    return fail(tokens[index - 1]);
  };

  const andExpr = (): ((e: TraceEvent) => boolean) => {
    let left = primary();
    while (peek() === 'and' || peek() === '&&') {
      index++;
      const a = left;
      const b = primary();
      left = (e) => a(e) && b(e);
    }
    return left;
  };

  const orExpr = (): ((e: TraceEvent) => boolean) => {
    let left = andExpr();
    while (peek() === 'or' || peek() === '||') {
      index++;
      const a = left;
      const b = andExpr();
      left = (e) => a(e) || b(e);
    }
    return left;
  };

  try {
    const test = orExpr();
    if (index < tokens.length) fail(tokens[index]);
    return { ok: true, test };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export const FILTER_EXAMPLES = ['icmp', 'arp or dhcp', 'ip.addr == 192.168.10.1', 'tcp.port == 80', 'dns', 'ipv6', 'ndp', 'esp', 'vlan.id == 10', 'dropped'];
