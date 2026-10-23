import type { DhcpMsg, DnsMsg, Frame, HttpMsg, IcmpMsg, Ipv4Packet, Ipv6Packet, TcpSeg, TraceEvent, UdpSeg } from './types';

class Writer {
  private bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  u8(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  u16(value: number): this {
    return this.u8(value >>> 8).u8(value);
  }

  u32(value: number): this {
    return this.u16(value >>> 16).u16(value);
  }

  raw(data: ArrayLike<number>): this {
    for (let i = 0; i < data.length; i++) this.bytes.push(data[i] & 0xff);
    return this;
  }

  zeros(count: number): this {
    for (let i = 0; i < count; i++) this.bytes.push(0);
    return this;
  }

  setU16(offset: number, value: number): void {
    this.bytes[offset] = (value >>> 8) & 0xff;
    this.bytes[offset + 1] = value & 0xff;
  }

  done(): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(this.bytes);
  }
}

const text = new TextEncoder();
const ECHO_DATA = text.encode('abcdefghijklmnopqrstuvwabcdefghi');
const TCP_PROTO = 6;
const UDP_PROTO = 17;
const ICMP_PROTO = 1;

function mac(value: string): number[] {
  const hex = /^[0-9a-f]{12}$/.test(value) ? value : '000000000000';
  return hex.match(/.{2}/g)!.map((pair) => parseInt(pair, 16));
}

function checksum(data: ArrayLike<number>, initial = 0): number {
  let sum = initial;
  for (let i = 0; i < data.length; i += 2) sum += ((data[i] << 8) | (data[i + 1] ?? 0)) >>> 0;
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16);
  return ~sum & 0xffff;
}

function pseudoSum(src: number, dst: number, proto: number, length: number): number {
  return ((src >>> 16) + (src & 0xffff) + (dst >>> 16) + (dst & 0xffff) + proto + length) >>> 0;
}

function withChecksum(segment: Uint8Array, offset: number, initial: number): Uint8Array {
  const sum = checksum(segment, initial);
  segment[offset] = sum >>> 8;
  segment[offset + 1] = sum & 0xff;
  return segment;
}

function icmpBytes(icmp: IcmpMsg): Uint8Array {
  const w = new Writer();
  const type = { 'echo-request': 8, 'echo-reply': 0, unreachable: 3, 'time-exceeded': 11 }[icmp.type];
  w.u8(type).u8(icmp.code).u16(0);
  if (icmp.type === 'echo-request' || icmp.type === 'echo-reply') w.u16(icmp.id).u16(icmp.seq).raw(ECHO_DATA);
  else {
    w.u32(0);
    const original = icmp.original;
    const inner = new Writer().u8(8).u8(0).u16(0).u16(original?.id ?? 0).u16(original?.seq ?? 0).done();
    withChecksum(inner, 2, 0);
    w.raw(ipv4Header(original?.src ?? 0, original?.dst ?? 0, ICMP_PROTO, 64, 8 + ECHO_DATA.length, 0)).raw(inner);
  }
  return withChecksum(w.done(), 2, 0);
}

function dhcpBytes(msg: DhcpMsg): Uint8Array {
  const types = { discover: 1, offer: 2, request: 3, ack: 5, nak: 6 };
  const fromClient = msg.op === 'discover' || msg.op === 'request';
  const w = new Writer()
    .u8(fromClient ? 1 : 2)
    .u8(1)
    .u8(6)
    .u8(msg.giaddr ? 1 : 0)
    .u32(msg.xid)
    .u16(0)
    .u16(0x8000)
    .u32(0)
    .u32(fromClient ? 0 : msg.yiaddr)
    .u32(fromClient ? 0 : msg.server)
    .u32(msg.giaddr)
    .raw(mac(msg.chaddr))
    .zeros(10)
    .zeros(64)
    .zeros(128)
    .u32(0x63825363)
    .u8(53)
    .u8(1)
    .u8(types[msg.op]);
  if (msg.op === 'request' && msg.yiaddr) w.u8(50).u8(4).u32(msg.yiaddr);
  if (msg.server) w.u8(54).u8(4).u32(msg.server);
  if (!fromClient && msg.op !== 'nak') {
    w.u8(51).u8(4).u32(86400);
    w.u8(1).u8(4).u32(msg.prefix ? (0xffffffff << (32 - msg.prefix)) >>> 0 : 0);
    if (msg.router) w.u8(3).u8(4).u32(msg.router);
    if (msg.dns) w.u8(6).u8(4).u32(msg.dns);
  }
  return w.u8(255).done();
}

function dnsName(name: string): number[] {
  const out: number[] = [];
  for (const label of name.replace(/\.$/, '').split('.').filter(Boolean)) {
    const bytes = text.encode(label.slice(0, 63));
    out.push(bytes.length, ...bytes);
  }
  out.push(0);
  return out;
}

function dnsBytes(msg: DnsMsg): Uint8Array {
  const answered = msg.response && msg.rcode === 'ok';
  const flags = msg.response ? (msg.rcode === 'ok' ? 0x8180 : 0x8183) : 0x0100;
  const w = new Writer().u16(msg.id).u16(flags).u16(1).u16(answered ? 1 : 0).u16(0).u16(0);
  w.raw(dnsName(msg.name)).u16(1).u16(1);
  if (answered) w.u16(0xc00c).u16(1).u16(1).u32(300).u16(4).u32(msg.answer);
  return w.done();
}

function httpBytes(msg: HttpMsg, tls: boolean): Uint8Array {
  if (tls) {
    const body = new Writer();
    const seed = text.encode(`${msg.kind}${msg.host}${msg.path}${msg.title}`);
    for (let i = 0; i < 96; i++) body.u8((seed[i % Math.max(1, seed.length)] * 31 + i * 17) & 0xff);
    const payload = body.done();
    return new Writer().u8(0x17).u16(0x0303).u16(payload.length).raw(payload).done();
  }
  if (msg.kind === 'request') return text.encode(`${msg.method} ${msg.path} HTTP/1.1\r\nHost: ${msg.host}\r\nUser-Agent: PanRouter\r\nAccept: text/html\r\n\r\n`);
  const html = `<!doctype html><html><head><title>${msg.title}</title></head><body>${msg.body}</body></html>`;
  const body = text.encode(html);
  return text.encode(`HTTP/1.1 ${msg.status} OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${body.length}\r\n\r\n${html}`);
}

function udpBytes(src: number, dst: number, udp: UdpSeg): Uint8Array {
  const payload = udp.dhcp ? dhcpBytes(udp.dhcp) : udp.dns ? dnsBytes(udp.dns) : new Uint8Array();
  const length = 8 + payload.length;
  const segment = new Writer().u16(udp.sport).u16(udp.dport).u16(length).u16(0).raw(payload).done();
  return withChecksum(segment, 6, pseudoSum(src, dst, UDP_PROTO, length));
}

const TCP_FLAGS: Record<string, number> = { FIN: 0x01, SYN: 0x02, RST: 0x04, PSH: 0x08, ACK: 0x10 };

function tcpBytes(src: number, dst: number, tcp: TcpSeg): Uint8Array {
  const payload = tcp.http ? httpBytes(tcp.http, tcp.sport === 443 || tcp.dport === 443) : new Uint8Array();
  const flags = tcp.flags.reduce((sum, flag) => sum | TCP_FLAGS[flag], 0);
  const client = tcp.dport < tcp.sport;
  const seq = client ? 0x1000 + (tcp.http ? 1 : 0) : 0x8000 + (tcp.http ? 1 : 0);
  const ack = flags & TCP_FLAGS.ACK ? (client ? 0x8001 : 0x1001) : 0;
  const segment = new Writer().u16(tcp.sport).u16(tcp.dport).u32(seq).u32(ack).u8(0x50).u8(flags).u16(64240).u16(0).u16(0).raw(payload).done();
  return withChecksum(segment, 16, pseudoSum(src, dst, TCP_PROTO, segment.length));
}

function ipv4Header(src: number, dst: number, proto: number, ttl: number, payloadLength: number, id: number): Uint8Array {
  const header = new Writer().u8(0x45).u8(0).u16(20 + payloadLength).u16(id & 0xffff).u16(0x4000).u8(ttl).u8(proto).u16(0).u32(src).u32(dst).done();
  return withChecksum(header, 10, 0);
}

function ipv4Bytes(ip: Ipv4Packet, id: number): Uint8Array {
  const payload = ip.icmp ? icmpBytes(ip.icmp) : ip.udp ? udpBytes(ip.src, ip.dst, ip.udp) : ip.tcp ? tcpBytes(ip.src, ip.dst, ip.tcp) : new Uint8Array();
  const proto = ip.proto === 'icmp' ? ICMP_PROTO : ip.proto === 'udp' ? UDP_PROTO : TCP_PROTO;
  return new Writer().raw(ipv4Header(ip.src, ip.dst, proto, ip.ttl, payload.length, id)).raw(payload).done();
}

function addr6(value: bigint): number[] {
  return Array.from({ length: 16 }, (_, i) => Number((value >> BigInt((15 - i) * 8)) & 0xffn));
}

function ipv6Bytes(ip: Ipv6Packet): Uint8Array {
  const i = ip.icmp6;
  const types = { 'echo-request': 128, 'echo-reply': 129, ns: 135, na: 136, unreachable: 1, 'time-exceeded': 3 };
  const body = new Writer().u8(types[i.type]).u8(i.code).u16(0);
  if (i.type === 'echo-request' || i.type === 'echo-reply') body.u16(i.id).u16(i.seq).raw(ECHO_DATA);
  else if (i.type === 'ns') body.u32(0).raw(addr6(i.target)).u8(1).u8(1).raw(mac(i.mac));
  else if (i.type === 'na') body.u32(0x60000000).raw(addr6(i.target)).u8(2).u8(1).raw(mac(i.mac));
  else {
    const original = i.original;
    const inner = new Writer().u8(128).u8(0).u16(0).u16(original?.id ?? 0).u16(original?.seq ?? 0).raw(ECHO_DATA).done();
    body.u32(0).u32(0x60000000).u16(inner.length).u8(58).u8(64).raw(addr6(original?.src ?? 0n)).raw(addr6(original?.dst ?? 0n)).raw(inner);
  }
  const payload = body.done();
  const pseudo = new Writer().raw(addr6(ip.src)).raw(addr6(ip.dst)).u32(payload.length).u32(58).done();
  let initial = 0;
  for (let k = 0; k < pseudo.length; k += 2) initial += (pseudo[k] << 8) | pseudo[k + 1];
  withChecksum(payload, 2, initial);
  return new Writer().u32(0x60000000).u16(payload.length).u8(58).u8(ip.hop).raw(addr6(ip.src)).raw(addr6(ip.dst)).raw(payload).done();
}

export function encodeFrame(frame: Frame, id = 0): Uint8Array<ArrayBuffer> {
  const w = new Writer().raw(mac(frame.dst)).raw(mac(frame.src));
  if (frame.vlan !== null) w.u16(0x8100).u16(frame.vlan & 0x0fff);
  if (frame.type === 'arp' && frame.arp) {
    const a = frame.arp;
    w.u16(0x0806).u16(1).u16(0x0800).u8(6).u8(4).u16(a.op === 'request' ? 1 : 2).raw(mac(a.senderMac)).u32(a.senderIp).raw(mac(a.targetMac)).u32(a.targetIp);
  } else if (frame.ip6) w.u16(0x86dd).raw(ipv6Bytes(frame.ip6));
  else if (frame.ip) w.u16(0x0800).raw(ipv4Bytes(frame.ip, id));
  if (w.length < 60) w.zeros(60 - w.length);
  return w.done();
}

export function capturable(event: TraceEvent): boolean {
  return Boolean(event.frame.src);
}

export function pcapFile(events: TraceEvent[], startEpochMs: number): Uint8Array<ArrayBuffer> {
  const w = new Writer();
  const le32 = (value: number) => w.u8(value).u8(value >>> 8).u8(value >>> 16).u8(value >>> 24);
  const le16 = (value: number) => w.u8(value).u8(value >>> 8);
  le32(0xa1b2c3d4);
  le16(2);
  le16(4);
  le32(0);
  le32(0);
  le32(65535);
  le32(1);
  for (const event of events.filter(capturable)) {
    const bytes = encodeFrame(event.frame, event.seq);
    const micros = Math.round((startEpochMs + event.time) * 1000);
    le32(Math.floor(micros / 1e6));
    le32(micros % 1e6);
    le32(bytes.length);
    le32(bytes.length);
    w.raw(bytes);
  }
  return w.done();
}
