import { parseIp } from './ip';
import type { Acl, AclEntry, AddrSpec, Device, Ipv4Packet, PortMatch } from './types';

export const ANY: AddrSpec = { any: true, ip: '', wildcard: '' };

export function hostSpec(ip: string): AddrSpec {
  return { any: false, ip, wildcard: '0.0.0.0' };
}

export function matchAddr(spec: AddrSpec, addr: number): boolean {
  if (spec.any) return true;
  const ip = parseIp(spec.ip);
  const wildcard = parseIp(spec.wildcard || '0.0.0.0');
  if (ip === null || wildcard === null) return false;
  const care = ~wildcard >>> 0;
  return ((addr & care) >>> 0) === ((ip & care) >>> 0);
}

export function matchPort(match: PortMatch | null, port: number | undefined): boolean {
  if (!match) return true;
  if (port === undefined) return false;
  switch (match.op) {
    case 'eq':
      return port === match.a;
    case 'neq':
      return port !== match.a;
    case 'gt':
      return port > match.a;
    case 'lt':
      return port < match.a;
    case 'range':
      return port >= match.a && port <= match.b;
  }
}

function ports(pkt: Ipv4Packet): { sport?: number; dport?: number } {
  if (pkt.proto === 'tcp' && pkt.tcp) return { sport: pkt.tcp.sport, dport: pkt.tcp.dport };
  if (pkt.proto === 'udp' && pkt.udp) return { sport: pkt.udp.sport, dport: pkt.udp.dport };
  return {};
}

function matchIcmp(type: AclEntry['icmpType'], pkt: Ipv4Packet): boolean {
  if (pkt.proto !== 'icmp' || !pkt.icmp) return false;
  const actual = pkt.icmp.type === 'echo-request' ? 'echo' : pkt.icmp.type;
  return actual === type;
}

export type AclVerdict = { permit: boolean; acl: string; line: number };

export function evaluateAcl(acl: Acl | undefined, pkt: Ipv4Packet, name: string): AclVerdict {
  if (!acl) return { permit: true, acl: name, line: 0 };
  const { sport, dport } = ports(pkt);
  for (let index = 0; index < acl.entries.length; index++) {
    const entry = acl.entries[index];
    if (entry.remark) continue;
    if (entry.proto !== 'ip' && entry.proto !== pkt.proto) continue;
    if (!matchAddr(entry.src, pkt.src)) continue;
    if (!matchAddr(entry.dst, pkt.dst)) continue;
    if (entry.srcPort && !matchPort(entry.srcPort, sport)) continue;
    if (entry.dstPort && !matchPort(entry.dstPort, dport)) continue;
    if (entry.icmpType && !matchIcmp(entry.icmpType, pkt)) continue;
    return { permit: entry.action === 'permit', acl: name, line: (index + 1) * 10 };
  }
  return { permit: false, acl: name, line: -1 };
}

export function findAcl(device: Device, name: string): Acl | undefined {
  return device.acls.find((acl) => acl.name.toLowerCase() === name.toLowerCase());
}

export function aclVerdict(device: Device, name: string, pkt: Ipv4Packet): AclVerdict {
  if (!name) return { permit: true, acl: '', line: 0 };
  return evaluateAcl(findAcl(device, name), pkt, name);
}

export function aclPermitsSource(device: Device, name: string, src: number): boolean {
  if (name === '*') return true;
  const acl = findAcl(device, name);
  if (!acl) return false;
  for (const entry of acl.entries) {
    if (entry.remark) continue;
    if (matchAddr(entry.src, src)) return entry.action === 'permit';
  }
  return false;
}
