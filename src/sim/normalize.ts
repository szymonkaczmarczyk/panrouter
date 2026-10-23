import { MODELS } from './catalog';
import { blankPort, blankPortSecurity, blankVif, createDevice, emptyNetwork } from './network';
import type {
  Acl,
  AclEntry,
  AddrSpec,
  Device,
  DeviceKind,
  FhrpGroup,
  FwRule,
  Link,
  LinkEnd,
  NatRule,
  Network,
  Note,
  Port,
  PortMatch,
  PortSecurity,
  VirtualIf,
} from './types';

type Raw = Record<string, unknown>;

const LIMITS = { devices: 200, links: 600, notes: 100, ports: 64, list: 256, text: 2000 };
const KINDS = new Set<DeviceKind>(MODELS.map((m) => m.kind));
const MAC = /^[0-9a-f]{12}$/;

function record(value: unknown): Raw | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
}

function str(value: unknown, fallback: string, max = LIMITS.text): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}

function num(value: unknown, fallback: number, min = -1e7, max = 1e7): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(num(value, fallback, min, max));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function list<T>(value: unknown, map: (item: unknown) => T | null, max = LIMITS.list): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value.slice(0, max)) {
    const mapped = map(item);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

function mergePrimitives<T extends object>(fallback: T, raw: Raw): T {
  const out = { ...fallback } as Record<string, unknown>;
  for (const [key, base] of Object.entries(fallback)) {
    const value = raw[key];
    if (typeof base === 'string') out[key] = str(value, base);
    else if (typeof base === 'number') out[key] = num(value, base);
    else if (typeof base === 'boolean') out[key] = bool(value, base);
  }
  return out as T;
}

function fhrp(value: unknown): FhrpGroup | null {
  const raw = record(value);
  if (!raw) return null;
  return {
    proto: oneOf(raw.proto, ['vrrp', 'hsrp'] as const, 'vrrp'),
    group: int(raw.group, 1, 0, 255),
    ip: str(raw.ip, '', 15),
    priority: int(raw.priority, 100, 1, 254),
    preempt: bool(raw.preempt, true),
  };
}

function ipv6List(value: unknown): string[] {
  return list(value, (item) => (typeof item === 'string' && /^[0-9a-fA-F:]{2,39}\/\d{1,3}$/.test(item) ? item.toLowerCase() : null), 16);
}

function portSecurity(value: unknown): PortSecurity {
  const raw = record(value);
  const base = blankPortSecurity();
  if (!raw) return base;
  return {
    enabled: bool(raw.enabled, false),
    maximum: int(raw.maximum, 1, 1, 64),
    violation: oneOf(raw.violation, ['shutdown', 'restrict', 'protect'] as const, 'shutdown'),
    sticky: bool(raw.sticky, false),
    macs: list(raw.macs, (m) => (typeof m === 'string' && MAC.test(m) ? m : null), 64),
    stickyMacs: list(raw.stickyMacs, (m) => (typeof m === 'string' && MAC.test(m) ? m : null), 64),
  };
}

function port(value: unknown): Port | null {
  const raw = record(value);
  if (!raw || typeof raw.name !== 'string' || !raw.name) return null;
  const base = blankPort(str(raw.name, '', 64), str(raw.short, raw.name, 32), str(raw.mac, '000000000000', 12));
  const out = mergePrimitives(base, raw);
  out.media = oneOf(raw.media, ['copper', 'fiber', 'wireless'] as const, 'copper');
  out.mode = oneOf(raw.mode, ['access', 'trunk'] as const, 'access');
  out.nat = oneOf(raw.nat, ['', 'inside', 'outside'] as const, '');
  out.channelMode = oneOf(raw.channelMode, ['', 'active', 'passive', 'on'] as const, '');
  out.prefix = int(raw.prefix, 24, 0, 32);
  out.speed = int(raw.speed, 1000, 10, 400000);
  out.accessVlan = int(raw.accessVlan, 1, 1, 4094);
  out.nativeVlan = int(raw.nativeVlan, 1, 1, 4094);
  out.channelGroup = int(raw.channelGroup, 0, 0, 64);
  out.fhrp = fhrp(raw.fhrp);
  out.ipv6 = ipv6List(raw.ipv6);
  out.portSecurity = portSecurity(raw.portSecurity);
  return out;
}

function vif(value: unknown): VirtualIf | null {
  const raw = record(value);
  if (!raw || typeof raw.name !== 'string' || !raw.name) return null;
  const kind = oneOf(raw.kind, ['sub', 'svi', 'loop'] as const, 'loop');
  const out = mergePrimitives(blankVif(kind, str(raw.name, '', 64)), raw);
  out.kind = kind;
  out.nat = oneOf(raw.nat, ['', 'inside', 'outside'] as const, '');
  out.prefix = int(raw.prefix, 24, 0, 32);
  out.vlan = int(raw.vlan, 0, 0, 4094);
  out.fhrp = fhrp(raw.fhrp);
  out.ipv6 = ipv6List(raw.ipv6);
  return out;
}

function addr(value: unknown): AddrSpec {
  const raw = record(value) ?? {};
  return { any: bool(raw.any, true), ip: str(raw.ip, '', 15), wildcard: str(raw.wildcard, '', 15) };
}

function portMatch(value: unknown): PortMatch | null {
  const raw = record(value);
  if (!raw) return null;
  return { op: oneOf(raw.op, ['eq', 'gt', 'lt', 'neq', 'range'] as const, 'eq'), a: int(raw.a, 0, 0, 65535), b: int(raw.b, 0, 0, 65535) };
}

function aclEntry(value: unknown): AclEntry | null {
  const raw = record(value);
  if (!raw) return null;
  return {
    action: oneOf(raw.action, ['permit', 'deny'] as const, 'deny'),
    proto: oneOf(raw.proto, ['ip', 'icmp', 'tcp', 'udp'] as const, 'ip'),
    src: addr(raw.src),
    dst: addr(raw.dst),
    srcPort: portMatch(raw.srcPort),
    dstPort: portMatch(raw.dstPort),
    icmpType: oneOf(raw.icmpType, ['', 'echo', 'echo-reply', 'unreachable', 'time-exceeded'] as const, ''),
    remark: str(raw.remark, '', 200),
  };
}

function acl(value: unknown): Acl | null {
  const raw = record(value);
  if (!raw || typeof raw.name !== 'string' || !raw.name) return null;
  return { name: str(raw.name, '', 64), type: oneOf(raw.type, ['standard', 'extended'] as const, 'standard'), entries: list(raw.entries, aclEntry) };
}

function natRule(value: unknown): NatRule | null {
  const raw = record(value);
  if (!raw) return null;
  if (raw.kind === 'pat') return { kind: 'pat', acl: str(raw.acl, '', 64), iface: str(raw.iface, '', 64) };
  if (raw.kind === 'static') return { kind: 'static', inside: str(raw.inside, '', 15), outside: str(raw.outside, '', 15) };
  return null;
}

function fwRule(value: unknown): FwRule | null {
  const raw = record(value);
  if (!raw) return null;
  return {
    name: str(raw.name, '', 64),
    from: str(raw.from, 'any', 32),
    to: str(raw.to, 'any', 32),
    proto: oneOf(raw.proto, ['any', 'icmp', 'tcp', 'udp'] as const, 'any'),
    port: int(raw.port, 0, 0, 65535),
    dst: str(raw.dst, '', 18),
    action: oneOf(raw.action, ['allow', 'deny'] as const, 'deny'),
  };
}

function device(value: unknown, scratch: Network): Device | null {
  const raw = record(value);
  if (!raw || typeof raw.id !== 'string' || !raw.id || !KINDS.has(raw.kind as DeviceKind)) return null;
  const base = createDevice(scratch, raw.kind as DeviceKind, 0, 0, 'X');
  const out = mergePrimitives(base, raw);
  out.id = str(raw.id, '', 32);
  out.name = str(raw.name, base.name, 63) || base.name;
  out.stpPriority = int(raw.stpPriority, 32768, 0, 61440);
  const ports = list(raw.ports, port, LIMITS.ports);
  out.ports = ports.length ? ports : base.ports;
  out.vifs = list(raw.vifs, vif);
  out.vlans = list(raw.vlans, (v) => {
    const r = record(v);
    return r ? { id: int(r.id, 1, 1, 4094), name: str(r.name, 'VLAN', 32) } : null;
  }).filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i);
  out.routes6 = list(raw.routes6, (v) => {
    const r = record(v);
    return r ? { net: str(r.net, '', 39), prefix: int(r.prefix, 64, 0, 128), via: str(r.via, '', 45), iface: str(r.iface, '', 64) } : null;
  });
  out.routes = list(raw.routes, (v) => {
    const r = record(v);
    return r ? { net: str(r.net, '', 15), prefix: int(r.prefix, 0, 0, 32), via: str(r.via, '', 15), iface: str(r.iface, '', 64), ad: int(r.ad, 1, 1, 255) } : null;
  });
  out.dhcpPools = list(raw.dhcpPools, (v) => {
    const r = record(v);
    return r ? { name: str(r.name, 'POOL', 64), network: str(r.network, '', 15), prefix: int(r.prefix, 24, 0, 32), router: str(r.router, '', 15), dns: str(r.dns, '', 15), domain: str(r.domain, '', 64) } : null;
  });
  out.dhcpExcluded = list(raw.dhcpExcluded, (v) => {
    const r = record(v);
    return r ? { from: str(r.from, '', 15), to: str(r.to, '', 15) } : null;
  });
  out.dhcpBindings = list(raw.dhcpBindings, (v) => {
    const r = record(v);
    return r ? { mac: str(r.mac, '', 12), ip: str(r.ip, '', 15), pool: str(r.pool, '', 64) } : null;
  });
  out.dnsRecords = list(raw.dnsRecords, (v) => {
    const r = record(v);
    return r ? { name: str(r.name, '', 253), type: oneOf(r.type, ['A', 'CNAME'] as const, 'A'), value: str(r.value, '', 253) } : null;
  });
  out.services = mergePrimitives(base.services, record(raw.services) ?? {});
  out.web = mergePrimitives(base.web, record(raw.web) ?? {});
  const ospf = record(raw.ospf);
  out.ospf = ospf
    ? {
        processId: int(ospf.processId, 1, 1, 65535),
        routerId: str(ospf.routerId, '', 15),
        networks: list(ospf.networks, (v) => {
          const r = record(v);
          return r ? { net: str(r.net, '', 15), wildcard: str(r.wildcard, '', 15), area: int(r.area, 0, 0, 4294967295) } : null;
        }),
        passive: list(ospf.passive, (v) => (typeof v === 'string' ? v.slice(0, 64) : null)),
        refBw: int(ospf.refBw, 100, 1, 4294967),
        defaultOriginate: bool(ospf.defaultOriginate, false),
      }
    : null;
  out.acls = list(raw.acls, acl);
  out.nat = list(raw.nat, natRule);
  const wifi = record(raw.wifi);
  out.wifi = wifi
    ? {
        ssid: str(wifi.ssid, '', 32),
        security: oneOf(wifi.security, ['wpa3', 'wpa2', 'open'] as const, 'wpa3'),
        key: str(wifi.key, '', 63),
        band: oneOf(wifi.band, ['2.4', '5', '6'] as const, '5'),
        vlan: int(wifi.vlan, 1, 1, 4094),
      }
    : null;
  const client = record(raw.wifiClient);
  out.wifiClient = client ? { ssid: str(client.ssid, '', 32), key: str(client.key, '', 63) } : null;
  out.fwRules = list(raw.fwRules, fwRule);
  const snooping = record(raw.dhcpSnooping);
  out.dhcpSnooping = {
    enabled: bool(snooping?.enabled, false),
    vlans: list(snooping?.vlans, (v) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 4094 ? v : null), 4094),
  };
  const mgmt = record(raw.mgmt) ?? {};
  out.mgmt = mergePrimitives(base.mgmt, mgmt);
  out.mgmt.vtyTransport = oneOf(mgmt.vtyTransport, ['ssh', 'telnet', 'all', 'none', ''] as const, '');
  out.mgmt.vtyLogin = oneOf(mgmt.vtyLogin, ['local', 'password', ''] as const, '');
  out.mgmt.users = list(mgmt.users, (v) => {
    const r = record(v);
    return r && typeof r.name === 'string' ? { name: r.name.slice(0, 64), secret: str(r.secret, '', 128) } : null;
  });
  return out;
}

function linkEnd(value: unknown): LinkEnd | null {
  const raw = record(value);
  if (!raw || typeof raw.dev !== 'string' || typeof raw.port !== 'string') return null;
  return { dev: raw.dev.slice(0, 32), port: raw.port.slice(0, 64) };
}

function seqOf(id: string): number {
  const match = /(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}

export function normalizeNetwork(value: unknown): Network | null {
  const raw = record(value);
  if (!raw || raw.version !== 1 || !Array.isArray(raw.devices) || !Array.isArray(raw.links)) return null;
  const scratch = emptyNetwork();
  const net = emptyNetwork();
  const seen = new Set<string>();
  for (const item of raw.devices.slice(0, LIMITS.devices)) {
    const dev = device(item, scratch);
    if (!dev || seen.has(dev.id)) continue;
    seen.add(dev.id);
    net.devices.push(dev);
  }
  const busy = new Set<string>();
  const linkIds = new Set<string>();
  for (const item of raw.links.slice(0, LIMITS.links)) {
    const r = record(item);
    if (!r || typeof r.id !== 'string' || linkIds.has(r.id)) continue;
    const a = linkEnd(r.a);
    const b = linkEnd(r.b);
    if (!a || !b || a.dev === b.dev) continue;
    const ok = [a, b].every((end) => net.devices.find((d) => d.id === end.dev)?.ports.some((p) => p.name === end.port && p.media !== 'wireless'));
    if (!ok || busy.has(`${a.dev}|${a.port}`) || busy.has(`${b.dev}|${b.port}`)) continue;
    busy.add(`${a.dev}|${a.port}`).add(`${b.dev}|${b.port}`);
    linkIds.add(r.id);
    const link: Link = { id: r.id.slice(0, 32), a, b, cable: oneOf(r.cable, ['copper', 'fiber'] as const, 'copper') };
    net.links.push(link);
  }
  net.notes = list(raw.notes, (item): Note | null => {
    const r = record(item);
    return r && typeof r.id === 'string' ? { id: r.id.slice(0, 32), x: num(r.x, 0), y: num(r.y, 0), text: str(r.text, '', 500) } : null;
  }, LIMITS.notes);
  const used = [...net.devices.map((d) => d.id), ...net.links.map((l) => l.id), ...net.notes.map((n) => n.id)].map(seqOf);
  net.seq = Math.max(int(raw.seq, 0, 0, 1e9), ...used, 0);
  return net;
}
