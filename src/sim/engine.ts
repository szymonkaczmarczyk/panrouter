import { aclPermitsSource, aclVerdict } from './acl';
import { BROADCAST_IP, BROADCAST_MAC, broadcastOf, inSubnet, ipToStr, networkOf, parseIp, prefixToMask } from './ip';
import { ALL_NODES, formatIpv6, isLinkLocal, isMulticast6, isMulticastMac, multicastMac, solicitedNode } from './ip6';
import { INTERNET_HOSTS, isHost } from './network';
import { Topology, type L3If } from './topology';
import type {
  Device,
  DhcpMsg,
  Explain,
  Frame,
  HttpMsg,
  Icmp6Msg,
  IcmpMsg,
  Ipv4Packet,
  Ipv6Packet,
  LinkEnd,
  Network,
  Port,
  Protocol,
  TraceEvent,
} from './types';

interface QueueItem {
  time: number;
  seq: number;
  from: LinkEnd;
  to: LinkEnd;
  link: string;
  frame: Frame;
  sent: Explain[];
}

export interface NatEntry {
  proto: 'icmp' | 'tcp' | 'udp';
  insideIp: number;
  insidePort: number;
  outsideIp: number;
  outsidePort: number;
  remoteIp: number;
  kind: 'pat' | 'static';
}

type InboxItem =
  | { kind: 'icmp'; msg: IcmpMsg; from: number; ttl: number; time: number }
  | { kind: 'arp-fail'; pkt: Ipv4Packet; time: number }
  | { kind: 'dns'; id: number; answer: number; ok: boolean; time: number }
  | { kind: 'http'; port: number; msg: HttpMsg; time: number }
  | { kind: 'rst'; port: number; time: number }
  | { kind: 'synack'; port: number; time: number }
  | { kind: 'icmp6'; msg: Icmp6Msg; from: bigint; hop: number; time: number }
  | { kind: 'nd-fail'; pkt: Ipv6Packet; time: number };

interface DevState {
  arp: Map<number, { mac: string; ifName: string }>;
  mac: Map<string, { port: string; vlan: number; mac: string }>;
  pending: { ifName: string; nextHop: number; pkt: Ipv4Packet }[];
  nat: NatEntry[];
  sessions: Set<string>;
  dhcp: Map<string, { xid: number; offer: DhcpMsg | null; done: boolean }>;
  tcp: Map<number, { dst: number; dport: number; host: string; path: string; purpose: 'http' | 'connect' }>;
  relays: Map<number, string>;
  dnsForward: Map<number, { client: number; sport: number; id: number; name: string; via: number }>;
  inbox: InboxItem[];
  counters: { icmpId: number; port: number; xid: number; dnsId: number };
  secure: Map<string, string[]>;
  violations: Map<string, { count: number; last: string }>;
  snooping: Map<string, SnoopBinding>;
  nd: Map<bigint, { mac: string; ifName: string }>;
  pending6: { ifName: string; nextHop: bigint; pkt: Ipv6Packet }[];
}

export interface Echo6Result {
  outcome: EchoOutcome;
  from: bigint | null;
  hop: number;
  rtt: number;
}

export interface SnoopBinding {
  mac: string;
  ip: number;
  vlan: number;
  port: string;
}

export type EchoOutcome = 'reply' | 'timeout' | 'host-unreachable' | 'net-unreachable' | 'admin-prohibited' | 'ttl-expired' | 'no-route' | 'no-ip';

export interface EchoResult {
  outcome: EchoOutcome;
  from: number | null;
  ttl: number;
  rtt: number;
}

export interface DhcpResult {
  ok: boolean;
  ip: string;
  prefix: number;
  gateway: string;
  dns: string;
  server: string;
  apipa: boolean;
}

export interface DnsResult {
  status: 'ok' | 'nxdomain' | 'timeout' | 'no-server';
  ip: number | null;
  server: number | null;
}

export interface HttpResult {
  status: 'ok' | 'refused' | 'timeout' | 'dns-failed';
  code: number;
  title: string;
  body: string;
  ip: number | null;
}

const MAX_EVENTS = 4000;
const LAN_LATENCY = 0.08;
const WAN_LATENCY = 6;

export function protocolOf(frame: Frame): Protocol {
  if (frame.type === 'arp') return 'ARP';
  if (frame.type === 'ipv6') return frame.ip6?.icmp6.type === 'ns' || frame.ip6?.icmp6.type === 'na' ? 'NDP' : 'ICMPv6';
  const ip = frame.ip!;
  if (ip.proto === 'icmp') return 'ICMP';
  if (ip.proto === 'udp') {
    if (ip.udp?.dhcp) return 'DHCP';
    if (ip.udp?.dns) return 'DNS';
    return 'UDP';
  }
  if (ip.tcp?.http) return ip.tcp.dport === 443 || ip.tcp.sport === 443 ? 'HTTPS' : 'HTTP';
  return 'TCP';
}

function initialTtl(device: Device): number {
  if (device.kind === 'pc' || device.kind === 'laptop') return 128;
  if (isHost(device.kind)) return 64;
  return 255;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class Simulator {
  net: Network;
  topo: Topology;
  private state = new Map<string, DevState>();
  private queue: QueueItem[] = [];
  private seq = 0;
  private time = 0;
  private trace: TraceEvent[] = [];
  private current: TraceEvent | null = null;
  private outNotes: Explain[] = [];
  storm = false;
  dirty = false;
  onTrace: ((events: TraceEvent[]) => void) | null = null;

  constructor(net: Network) {
    this.net = net;
    this.topo = new Topology(net);
  }

  refresh(): void {
    this.topo = new Topology(this.net);
  }

  invalidate(): void {
    this.topo = new Topology(this.net);
    for (const st of this.state.values()) {
      st.arp.clear();
      st.mac.clear();
      st.pending = [];
      st.nat = [];
      st.sessions.clear();
      st.secure.clear();
      st.nd.clear();
      st.pending6 = [];
    }
  }

  reset(net: Network): void {
    this.net = net;
    this.state.clear();
    this.topo = new Topology(net);
  }

  st(device: Device): DevState {
    let st = this.state.get(device.id);
    if (!st) {
      st = {
        arp: new Map(),
        mac: new Map(),
        pending: [],
        nat: [],
        sessions: new Set(),
        dhcp: new Map(),
        tcp: new Map(),
        relays: new Map(),
        dnsForward: new Map(),
        inbox: [],
        counters: { icmpId: (Number(device.id.replace(/\D/g, '')) * 97) % 30000 + 1, port: 49152, xid: 0x1000, dnsId: 1 },
        secure: new Map(),
        violations: new Map(),
        snooping: new Map(),
        nd: new Map(),
        pending6: [],
      };
      this.state.set(device.id, st);
    }
    return st;
  }

  dev(id: string): Device {
    const device = this.topo.device(id);
    if (!device) throw new Error(`unknown device ${id}`);
    return device;
  }

  arpTable(device: Device): { ip: number; mac: string; ifName: string }[] {
    return [...this.st(device).arp.entries()].map(([ip, entry]) => ({ ip, ...entry })).sort((a, b) => a.ip - b.ip);
  }

  macTable(device: Device): { vlan: number; mac: string; port: string }[] {
    return [...this.st(device).mac.values()].sort((a, b) => a.vlan - b.vlan || a.mac.localeCompare(b.mac));
  }

  natTable(device: Device): NatEntry[] {
    const statics: NatEntry[] = device.nat.flatMap((rule) => {
      if (rule.kind !== 'static') return [];
      const inside = parseIp(rule.inside);
      const outside = parseIp(rule.outside);
      if (inside === null || outside === null) return [];
      return [{ proto: 'icmp' as const, insideIp: inside, insidePort: 0, outsideIp: outside, outsidePort: 0, remoteIp: 0, kind: 'static' as const }];
    });
    return [...statics, ...this.st(device).nat];
  }

  clearArp(device: Device): void {
    this.st(device).arp.clear();
  }

  clearMac(device: Device): void {
    this.st(device).mac.clear();
  }

  clearNat(device: Device): void {
    this.st(device).nat = [];
  }

  private note(key: string, params?: Record<string, string | number>): void {
    const entry: Explain = params ? { key, params } : { key };
    if (this.current) this.current.received.push(entry);
    else this.outNotes.push(entry);
  }

  private drop(key: string, params?: Record<string, string | number>): void {
    this.note(key, params);
    if (this.current) this.current.outcome = 'drop';
    else {
      this.outNotes = [];
    }
  }

  private latency(a: LinkEnd, b: LinkEnd): number {
    const devA = this.topo.device(a.dev);
    const devB = this.topo.device(b.dev);
    return devA?.kind === 'internet' || devB?.kind === 'internet' ? WAN_LATENCY : LAN_LATENCY;
  }

  private transmit(device: Device, portName: string, frame: Frame): void {
    const sent = this.current ? [] : this.outNotes;
    this.outNotes = [];
    const from = { dev: device.id, port: portName };
    const link = this.topo.link(device.id, portName);
    if (!link || !this.topo.portUp(device, portName)) {
      this.trace.push({
        seq: ++this.seq,
        time: this.time,
        from,
        to: null,
        link: link?.id ?? null,
        frame: clone(frame),
        proto: protocolOf(frame),
        sent: [...sent, { key: link ? 'port.down' : 'port.noCable', params: { port: this.shortName(device, portName) } }],
        received: [],
        outcome: 'drop',
      });
      return;
    }
    const to = this.topo.peer(device.id, portName)!;
    this.queue.push({
      time: this.time + this.latency(from, to),
      seq: ++this.seq,
      from,
      to,
      link: link.id,
      frame: clone(frame),
      sent,
    });
  }

  shortName(device: Device, portName: string): string {
    const port = this.topo.port(device, portName);
    return port?.short ?? portName;
  }

  run(): void {
    let processed = 0;
    while (this.queue.length) {
      let index = 0;
      for (let i = 1; i < this.queue.length; i++) {
        const a = this.queue[i];
        const b = this.queue[index];
        if (a.time < b.time || (a.time === b.time && a.seq < b.seq)) index = i;
      }
      const item = this.queue.splice(index, 1)[0];
      this.time = item.time;
      const event: TraceEvent = {
        seq: item.seq,
        time: item.time,
        from: item.from,
        to: item.to,
        link: item.link,
        frame: item.frame,
        proto: protocolOf(item.frame),
        sent: item.sent,
        received: [],
        outcome: 'ok',
      };
      this.trace.push(event);
      this.current = event;
      this.receive(item.to, item.frame);
      this.current = null;
      processed++;
      if (processed > MAX_EVENTS) {
        this.storm = true;
        this.queue = [];
        break;
      }
    }
    for (const device of this.net.devices) {
      const st = this.state.get(device.id);
      if (!st) continue;
      for (const item of st.pending) st.inbox.push({ kind: 'arp-fail', pkt: item.pkt, time: this.time });
      for (const item of st.pending6) st.inbox.push({ kind: 'nd-fail', pkt: item.pkt, time: this.time });
      st.pending = [];
      st.pending6 = [];
    }
  }

  private beginAction(): void {
    this.trace = [];
    this.outNotes = [];
    this.storm = false;
  }

  private endAction(): TraceEvent[] {
    const events = this.trace;
    this.trace = [];
    this.time += 1;
    if (this.onTrace && events.length) this.onTrace(events);
    return events;
  }

  private receive(to: LinkEnd, frame: Frame): void {
    const device = this.topo.device(to.dev);
    if (!device) return;
    if (!this.topo.isPowered(device)) return this.drop('dev.unpowered');
    const port = this.topo.port(device, to.port);
    if (!port) return this.drop('port.unknown');
    if (port.switchport) this.l2Receive(device, port, frame);
    else this.routedReceive(device, port, frame);
  }

  secureMacs(device: Device, port: Port): string[] {
    return [...port.portSecurity.macs, ...port.portSecurity.stickyMacs, ...(this.st(device).secure.get(port.name) ?? [])];
  }

  violation(device: Device, port: Port): { count: number; last: string } {
    return this.st(device).violations.get(port.name) ?? { count: 0, last: '' };
  }

  snoopingBindings(device: Device): SnoopBinding[] {
    return [...this.st(device).snooping.values()];
  }

  private portSecurityAllows(device: Device, port: Port, mac: string): boolean {
    const sec = port.portSecurity;
    if (!sec.enabled || port.mode !== 'access') return true;
    const known = this.secureMacs(device, port);
    if (known.includes(mac)) return true;
    const st = this.st(device);
    if (known.length < sec.maximum) {
      if (sec.sticky) {
        sec.stickyMacs.push(mac);
        this.dirty = true;
      } else st.secure.set(port.name, [...(st.secure.get(port.name) ?? []), mac]);
      this.note(sec.sticky ? 'psec.sticky' : 'psec.learn', { mac, port: port.short });
      return true;
    }
    const record = this.violation(device, port);
    st.violations.set(port.name, { count: record.count + 1, last: mac });
    if (sec.violation === 'shutdown') {
      port.errDisabled = true;
      this.dirty = true;
      this.drop('psec.shutdown', { mac, port: port.short, max: sec.maximum });
      this.refresh();
      return false;
    }
    this.drop(sec.violation === 'restrict' ? 'psec.restrict' : 'psec.protect', { mac, port: port.short });
    return false;
  }

  private snoopingAllows(device: Device, port: Port, vlan: number, frame: Frame): boolean {
    const snooping = device.dhcpSnooping;
    const dhcp = frame.ip?.udp?.dhcp;
    if (!dhcp || !snooping.enabled || !snooping.vlans.includes(vlan)) return true;
    const fromServer = dhcp.op === 'offer' || dhcp.op === 'ack' || dhcp.op === 'nak';
    if (!fromServer) return true;
    if (!port.dhcpTrust) {
      this.drop('snoop.untrusted', { port: port.short, op: dhcp.op.toUpperCase() });
      return false;
    }
    if (dhcp.op === 'ack' && dhcp.yiaddr) {
      const st = this.st(device);
      const client = st.mac.get(`${vlan}|${dhcp.chaddr}`);
      st.snooping.set(dhcp.chaddr, { mac: dhcp.chaddr, ip: dhcp.yiaddr, vlan, port: client?.port ?? '' });
      this.note('snoop.binding', { mac: dhcp.chaddr, ip: ipToStr(dhcp.yiaddr) });
    }
    return true;
  }

  private l2Receive(device: Device, port: Port, frame: Frame): void {
    if (this.topo.stpBlocked(device.id, port.name)) return this.drop('stp.blocked', { port: port.short });
    if (this.topo.memberInactive(device.id, port.name)) return this.drop('lacp.inactive', { port: port.short });
    if (!this.portSecurityAllows(device, port, frame.src)) return;
    const vlan = this.topo.ingressVlan(device, port, frame.vlan);
    if (vlan === null) {
      if (port.mode === 'access' && frame.vlan !== null) return this.drop('l2.taggedOnAccess', { port: port.short, vlan: frame.vlan });
      if (port.mode === 'trunk') {
        const wanted = frame.vlan ?? port.nativeVlan;
        if (!this.topo.vlanExists(device, wanted)) return this.drop('l2.vlanMissing', { vlan: wanted });
        return this.drop('l2.vlanNotAllowed', { port: port.short, vlan: wanted });
      }
      return this.drop('l2.vlanMissing', { vlan: port.accessVlan });
    }
    const st = this.st(device);
    const key = `${vlan}|${frame.src}`;
    const known = st.mac.get(key);
    if (!known || known.port !== port.name) {
      st.mac.set(key, { port: port.name, vlan, mac: frame.src });
      this.note('l2.learn', { mac: frame.src, port: this.topo.portLabel(device, port.name), vlan });
    }
    if (!this.snoopingAllows(device, port, vlan, frame)) return;
    const local = { ...frame, vlan: null };
    const svi = this.sviFor(device, vlan);
    if (frame.dst === device.baseMac || (svi && this.topo.virtualFor(device, svi)?.mac === frame.dst)) {
      if (svi) return this.l3Receive(device, svi, local);
      return this.drop('l2.noSvi', { vlan });
    }
    this.l2Forward(device, vlan, frame, port.name);
    if (frame.dst === BROADCAST_MAC || isMulticastMac(frame.dst)) {
      if (!svi) return;
      const outcome = this.current?.outcome;
      this.l3Receive(device, svi, local);
      if (this.current && outcome) this.current.outcome = outcome;
    }
  }

  private sviFor(device: Device, vlan: number): L3If | undefined {
    return this.topo.l3Ifs(device).find((entry) => entry.attach.kind === 'svi' && entry.attach.vlan === vlan && entry.up);
  }

  private l2Forward(device: Device, vlan: number, frame: Frame, ingress: string | null): void {
    const st = this.st(device);
    const ports = this.topo.forwardingPorts(device, vlan);
    const send = (out: Port) => this.transmit(device, out.name, { ...frame, vlan: this.topo.egressTag(out, vlan) });
    if (frame.dst === BROADCAST_MAC || isMulticastMac(frame.dst)) {
      const targets = ports.filter((p) => p.name !== ingress);
      this.note(targets.length ? (frame.dst === BROADCAST_MAC ? 'l2.floodBroadcast' : 'l2.floodMulticast') : 'l2.noPorts', { vlan, count: targets.length });
      targets.forEach(send);
      return;
    }
    const entry = st.mac.get(`${vlan}|${frame.dst}`);
    if (entry) {
      if (entry.port === ingress) return this.drop('l2.filter', { mac: frame.dst });
      const out = ports.find((p) => p.name === entry.port);
      if (out) {
        this.note('l2.forwardKnown', { mac: frame.dst, port: this.topo.portLabel(device, out.name) });
        send(out);
        return;
      }
    }
    const targets = ports.filter((p) => p.name !== ingress);
    this.note('l2.floodUnknown', { mac: frame.dst, vlan, count: targets.length });
    targets.forEach(send);
  }

  private routedReceive(device: Device, port: Port, frame: Frame): void {
    const ifs = this.topo.l3Ifs(device);
    if (frame.vlan !== null) {
      const sub = ifs.find((e) => e.attach.kind === 'sub' && e.attach.port === port.name && e.attach.vlan === frame.vlan);
      if (!sub) return this.drop('l3.noSubif', { vlan: frame.vlan, port: port.short });
      return this.l3Receive(device, sub, { ...frame, vlan: null });
    }
    const main = ifs.find((e) => e.attach.kind === 'port' && e.attach.port === port.name);
    if (!main) return this.drop('l3.noIf');
    this.l3Receive(device, main, frame);
  }

  private l3Receive(device: Device, entry: L3If, frame: Frame): void {
    if (!entry.up) return this.drop('l3.ifDown', { iface: entry.name });
    const virtual = this.topo.virtualFor(device, entry);
    const multicast = frame.type === 'ipv6' && isMulticastMac(frame.dst);
    if (frame.dst !== entry.mac && frame.dst !== BROADCAST_MAC && frame.dst !== virtual?.mac && !multicast) return this.drop('l3.notMyMac', { mac: frame.dst });
    if (frame.type === 'arp') return this.arpReceive(device, entry, frame);
    if (frame.type === 'ipv6' && frame.ip6) return this.ip6Receive(device, entry, frame);
    if (frame.ip) this.ipReceive(device, entry, frame.ip);
  }

  private arpReceive(device: Device, entry: L3If, frame: Frame): void {
    const arp = frame.arp!;
    const st = this.st(device);
    if (arp.op === 'request') {
      const virtual = this.topo.virtualFor(device, entry);
      if (virtual && arp.targetIp === virtual.ip) {
        st.arp.set(arp.senderIp, { mac: arp.senderMac, ifName: entry.name });
        const state = this.topo.fhrpOf(device, entry)!;
        this.note('fhrp.arpReply', { ip: ipToStr(virtual.ip), mac: virtual.mac, proto: state.proto.toUpperCase(), group: state.group });
        this.l3Transmit(device, entry, {
          src: virtual.mac,
          dst: arp.senderMac,
          vlan: null,
          type: 'arp',
          arp: { op: 'reply', senderMac: virtual.mac, senderIp: virtual.ip, targetMac: arp.senderMac, targetIp: arp.senderIp },
        });
        this.flushPending(device, arp.senderIp);
        return;
      }
      if (entry.ip !== null && arp.targetIp === entry.ip) {
        st.arp.set(arp.senderIp, { mac: arp.senderMac, ifName: entry.name });
        this.note('arp.requestForMe', { ip: ipToStr(arp.targetIp), mac: entry.mac });
        this.l3Transmit(device, entry, {
          src: entry.mac,
          dst: arp.senderMac,
          vlan: null,
          type: 'arp',
          arp: { op: 'reply', senderMac: entry.mac, senderIp: entry.ip, targetMac: arp.senderMac, targetIp: arp.senderIp },
        });
        this.flushPending(device, arp.senderIp);
        return;
      }
      const proxyCapable = device.kind === 'router' || device.kind === 'l3switch';
      if (proxyCapable && this.topo.isRouting(device) && entry.ip !== null && arp.senderIp !== 0) {
        const route = this.topo.lookup(device, arp.targetIp);
        if (route && route.ifName !== entry.name && !route.route.isDefault) {
          this.note('arp.proxy', { ip: ipToStr(arp.targetIp) });
          this.l3Transmit(device, entry, {
            src: entry.mac,
            dst: arp.senderMac,
            vlan: null,
            type: 'arp',
            arp: { op: 'reply', senderMac: entry.mac, senderIp: arp.targetIp, targetMac: arp.senderMac, targetIp: arp.senderIp },
          });
          return;
        }
      }
      if (st.arp.has(arp.senderIp)) st.arp.set(arp.senderIp, { mac: arp.senderMac, ifName: entry.name });
      return this.drop('arp.notForMe', { ip: ipToStr(arp.targetIp) });
    }
    if (entry.ip !== null && arp.targetIp === entry.ip) {
      st.arp.set(arp.senderIp, { mac: arp.senderMac, ifName: entry.name });
      this.note('arp.replyLearned', { ip: ipToStr(arp.senderIp), mac: arp.senderMac });
      this.flushPending(device, arp.senderIp);
      return;
    }
    this.drop('arp.notForMe', { ip: ipToStr(arp.targetIp) });
  }

  private flushPending(device: Device, ip: number): void {
    const st = this.st(device);
    const ready = st.pending.filter((item) => item.nextHop === ip);
    if (!ready.length) return;
    st.pending = st.pending.filter((item) => item.nextHop !== ip);
    const mac = st.arp.get(ip)!.mac;
    for (const item of ready) {
      const entry = this.topo.l3If(device, item.ifName);
      if (!entry) continue;
      this.note('ip.sendQueued', { ip: ipToStr(item.pkt.dst) });
      this.l3Transmit(device, entry, { src: entry.mac, dst: mac, vlan: null, type: 'ipv4', ip: item.pkt });
    }
  }

  private l3Transmit(device: Device, entry: L3If, frame: Frame): void {
    const attach = entry.attach;
    if (attach.kind === 'port') this.transmit(device, attach.port, frame);
    else if (attach.kind === 'sub') this.transmit(device, attach.port, { ...frame, vlan: attach.vlan });
    else if (attach.kind === 'svi') this.l2Forward(device, attach.vlan, frame, null);
  }

  private isLocalDst(device: Device, entry: L3If, dst: number): boolean {
    if (dst === BROADCAST_IP) return true;
    if (entry.ip !== null && entry.prefix < 31 && dst === broadcastOf(entry.ip, entry.prefix)) return true;
    if (this.topo.ownsIp(device, dst)) return true;
    if (device.kind === 'internet' && INTERNET_HOSTS.some((h) => parseIp(h.ip) === dst)) return true;
    return false;
  }

  private ipReceive(device: Device, entry: L3If, original: Ipv4Packet): void {
    let pkt = original;
    if (pkt.proto === 'udp' && pkt.udp?.dhcp) {
      const dhcp = pkt.udp.dhcp;
      if (pkt.udp.dport === 68) return this.dhcpClientReceive(device, entry, dhcp);
      if (pkt.udp.dport === 67) return this.dhcpServerSide(device, entry, pkt);
    }
    if (entry.nat === 'outside') pkt = this.natInbound(device, pkt);
    if (this.isLocalDst(device, entry, pkt.dst)) return this.localDeliver(device, pkt);
    if (!this.topo.isRouting(device)) {
      if (isHost(device.kind)) return this.drop('host.notForMe', { ip: ipToStr(pkt.dst) });
      return this.drop('ip.notRouting');
    }
    this.forward(device, entry, pkt);
  }

  private forward(device: Device, inIf: L3If, original: Ipv4Packet): void {
    const inVerdict = aclVerdict(device, inIf.cfg.aclIn, original);
    if (!inVerdict.permit) {
      this.drop('acl.deny', { acl: inVerdict.acl, dir: 'in', iface: inIf.name });
      return this.sendIcmpError(device, inIf, original, 'unreachable', 13);
    }
    if (original.ttl <= 1) {
      this.drop('ip.ttlExpired');
      return this.sendIcmpError(device, inIf, original, 'time-exceeded', 0);
    }
    let pkt: Ipv4Packet = { ...original, ttl: original.ttl - 1 };
    const found = this.topo.lookup(device, pkt.dst);
    if (!found) {
      this.drop('ip.noRoute', { ip: ipToStr(pkt.dst) });
      return this.sendIcmpError(device, inIf, original, 'unreachable', 0);
    }
    const outIf = this.topo.l3If(device, found.ifName)!;
    if (device.kind === 'firewall' && !this.firewallAllows(device, inIf, outIf, pkt)) {
      return this.drop('fw.deny', { from: inIf.zone || '-', to: outIf.zone || '-' });
    }
    if (inIf.nat === 'inside' && outIf.nat === 'outside') pkt = this.natOutbound(device, outIf, pkt);
    const outVerdict = aclVerdict(device, outIf.cfg.aclOut, pkt);
    if (!outVerdict.permit) {
      this.drop('acl.deny', { acl: outVerdict.acl, dir: 'out', iface: outIf.name });
      return this.sendIcmpError(device, inIf, original, 'unreachable', 13);
    }
    this.note(found.route.code === 'C' ? 'ip.forwardConnected' : 'ip.forwardVia', {
      net: `${ipToStr(found.route.net)}/${found.route.prefix}`,
      via: ipToStr(found.nextHop),
      iface: this.shortIf(device, outIf),
      code: found.route.code,
    });
    this.sendIp(device, outIf, found.nextHop, pkt);
  }

  private shortIf(device: Device, entry: L3If): string {
    if (entry.attach.kind === 'port') return this.shortName(device, entry.attach.port);
    if (entry.attach.kind === 'sub') return `${this.shortName(device, entry.attach.port)}.${entry.attach.vlan}`;
    return entry.name;
  }

  private sendIp(device: Device, outIf: L3If, nextHop: number, pkt: Ipv4Packet): void {
    const st = this.st(device);
    const isBroadcast = nextHop === BROADCAST_IP || (outIf.ip !== null && outIf.prefix < 31 && nextHop === broadcastOf(outIf.ip, outIf.prefix));
    if (isBroadcast) {
      this.l3Transmit(device, outIf, { src: outIf.mac, dst: BROADCAST_MAC, vlan: null, type: 'ipv4', ip: pkt });
      return;
    }
    const cached = st.arp.get(nextHop);
    if (cached) {
      this.l3Transmit(device, outIf, { src: outIf.mac, dst: cached.mac, vlan: null, type: 'ipv4', ip: pkt });
      return;
    }
    const alreadyAsking = st.pending.some((item) => item.nextHop === nextHop);
    const dropsWhileResolving = (device.kind === 'router' || device.kind === 'l3switch') && this.topo.isRouting(device);
    if (!dropsWhileResolving) {
      st.pending.push({ ifName: outIf.name, nextHop, pkt });
      if (alreadyAsking) return;
      this.note('arp.queueAndAsk', { ip: ipToStr(nextHop) });
    } else {
      this.note('arp.routerDrop', { ip: ipToStr(nextHop) });
      if (this.current) this.current.outcome = 'drop';
    }
    if (outIf.ip === null) return;
    this.l3Transmit(device, outIf, {
      src: outIf.mac,
      dst: BROADCAST_MAC,
      vlan: null,
      type: 'arp',
      arp: { op: 'request', senderMac: outIf.mac, senderIp: outIf.ip, targetMac: '000000000000', targetIp: nextHop },
    });
  }

  private originate(device: Device, pkt: Ipv4Packet, preferredIf?: string): 'sent' | 'no-route' | 'no-ip' {
    if (pkt.dst === BROADCAST_IP && preferredIf) {
      const entry = this.topo.l3If(device, preferredIf);
      if (!entry || !entry.up) return 'no-route';
      this.sendIp(device, entry, BROADCAST_IP, pkt);
      return 'sent';
    }
    const own = this.topo.ownsIp(device, pkt.dst);
    if (own) {
      this.localDeliver(device, { ...pkt, src: pkt.src || pkt.dst });
      return 'sent';
    }
    const found = this.topo.lookup(device, pkt.dst);
    if (!found) {
      const hasIp = this.topo.l3Ifs(device).some((e) => e.up && e.ip !== null);
      return hasIp ? 'no-route' : 'no-ip';
    }
    const outIf = this.topo.l3If(device, found.ifName)!;
    if (outIf.ip === null) return 'no-ip';
    const packet = { ...pkt, src: pkt.src || outIf.ip };
    this.note(found.route.isDefault && found.route.code !== 'C' ? 'ip.originateGateway' : 'ip.originate', {
      dst: ipToStr(packet.dst),
      via: ipToStr(found.nextHop),
      iface: this.shortIf(device, outIf),
    });
    this.sendIp(device, outIf, found.nextHop, packet);
    return 'sent';
  }

  private reply(device: Device, pkt: Ipv4Packet): void {
    const result = this.originate(device, pkt);
    if (result !== 'sent') this.note('ip.replyNoRoute', { ip: ipToStr(pkt.dst) });
  }

  private sendIcmpError(device: Device, inIf: L3If, original: Ipv4Packet, type: 'unreachable' | 'time-exceeded', code: number): void {
    if (original.proto === 'icmp' && original.icmp && original.icmp.type !== 'echo-request') return;
    if (inIf.ip === null) return;
    this.reply(device, {
      src: inIf.ip,
      dst: original.src,
      ttl: initialTtl(device),
      proto: 'icmp',
      icmp: {
        type,
        code,
        id: original.icmp?.id ?? 0,
        seq: original.icmp?.seq ?? 0,
        original: { src: original.src, dst: original.dst, id: original.icmp?.id ?? original.tcp?.sport ?? original.udp?.sport ?? 0, seq: original.icmp?.seq ?? 0 },
      },
    });
  }

  private localDeliver(device: Device, pkt: Ipv4Packet): void {
    const st = this.st(device);
    if (pkt.proto === 'icmp' && pkt.icmp) {
      const icmp = pkt.icmp;
      if (icmp.type === 'echo-request') {
        if (pkt.dst === BROADCAST_IP) return this.drop('icmp.ignoreBroadcast');
        this.note('icmp.echoReply', { ip: ipToStr(pkt.src) });
        const ttl = device.kind === 'internet' && !this.topo.ownsIp(device, pkt.dst) ? 56 : initialTtl(device);
        this.reply(device, { src: pkt.dst, dst: pkt.src, ttl, proto: 'icmp', icmp: { type: 'echo-reply', code: 0, id: icmp.id, seq: icmp.seq } });
        return;
      }
      this.note('icmp.delivered', { type: icmp.type });
      st.inbox.push({ kind: 'icmp', msg: icmp, from: pkt.src, ttl: pkt.ttl, time: this.time });
      return;
    }
    if (pkt.proto === 'udp' && pkt.udp?.dns) {
      const dns = pkt.udp.dns;
      if (!dns.response) {
        if (!this.servesDns(device)) return this.drop('dns.noService');
        const answer = this.dnsLookup(device, dns.name);
        const upstream = this.dnsServerOf(device);
        if (answer === null && upstream !== null && !this.topo.ownsIp(device, upstream) && device.kind !== 'internet') {
          const forwardId = st.counters.dnsId++;
          st.dnsForward.set(forwardId, { client: pkt.src, sport: pkt.udp.sport, id: dns.id, name: dns.name, via: pkt.dst });
          this.note('dns.forward', { name: dns.name, server: ipToStr(upstream) });
          this.reply(device, {
            src: 0,
            dst: upstream,
            ttl: initialTtl(device),
            proto: 'udp',
            udp: { sport: 53, dport: 53, dns: { id: forwardId, response: false, name: dns.name, answer: 0, rcode: 'ok' } },
          });
          return;
        }
        this.note(answer === null ? 'dns.nxdomain' : 'dns.answer', { name: dns.name, ip: answer === null ? '-' : ipToStr(answer) });
        this.reply(device, {
          src: pkt.dst,
          dst: pkt.src,
          ttl: initialTtl(device),
          proto: 'udp',
          udp: {
            sport: 53,
            dport: pkt.udp.sport,
            dns: { id: dns.id, response: true, name: dns.name, answer: answer ?? 0, rcode: answer === null ? 'nxdomain' : 'ok' },
          },
        });
        return;
      }
      const pending = pkt.udp.dport === 53 ? st.dnsForward.get(dns.id) : undefined;
      if (pending) {
        st.dnsForward.delete(dns.id);
        this.note('dns.forwardReply', { name: dns.name });
        this.reply(device, {
          src: pending.via,
          dst: pending.client,
          ttl: initialTtl(device),
          proto: 'udp',
          udp: { sport: 53, dport: pending.sport, dns: { ...dns, id: pending.id } },
        });
        return;
      }
      this.note('dns.delivered', { name: dns.name });
      st.inbox.push({ kind: 'dns', id: dns.id, answer: dns.answer, ok: dns.rcode === 'ok', time: this.time });
      return;
    }
    if (pkt.proto === 'tcp' && pkt.tcp) {
      const tcp = pkt.tcp;
      const flags = new Set(tcp.flags);
      const isServerPort = [80, 443, 22, 23].includes(tcp.dport);
      if (isServerPort && flags.has('SYN') && !flags.has('ACK')) {
        if (!this.listens(device, pkt.dst, tcp.dport)) {
          this.note('tcp.refused', { port: tcp.dport });
          this.reply(device, { src: pkt.dst, dst: pkt.src, ttl: initialTtl(device), proto: 'tcp', tcp: { sport: tcp.dport, dport: tcp.sport, flags: ['RST', 'ACK'] } });
          return;
        }
        this.note('tcp.synAck', { port: tcp.dport });
        this.reply(device, { src: pkt.dst, dst: pkt.src, ttl: initialTtl(device), proto: 'tcp', tcp: { sport: tcp.dport, dport: tcp.sport, flags: ['SYN', 'ACK'] } });
        return;
      }
      if (isServerPort && tcp.http?.kind === 'request') {
        const page = this.pageFor(device, pkt.dst);
        this.note('http.respond', { host: tcp.http.host, code: 200 });
        this.reply(device, {
          src: pkt.dst,
          dst: pkt.src,
          ttl: initialTtl(device),
          proto: 'tcp',
          tcp: {
            sport: tcp.dport,
            dport: tcp.sport,
            flags: ['ACK', 'PSH'],
            http: { kind: 'response', method: '', host: tcp.http.host, path: tcp.http.path, status: 200, title: page.title, body: page.body },
          },
        });
        return;
      }
      const client = st.tcp.get(tcp.dport);
      if (!client) return this.drop('tcp.noSocket');
      if (flags.has('RST')) {
        this.note('tcp.rstReceived');
        st.inbox.push({ kind: 'rst', port: tcp.dport, time: this.time });
        return;
      }
      if (flags.has('SYN') && flags.has('ACK') && client.purpose === 'connect') {
        this.note('tcp.connected', { port: tcp.sport });
        st.inbox.push({ kind: 'synack', port: tcp.dport, time: this.time });
        return;
      }
      if (flags.has('SYN') && flags.has('ACK')) {
        this.note('tcp.sendRequest', { host: client.host });
        this.reply(device, {
          src: pkt.dst,
          dst: pkt.src,
          ttl: initialTtl(device),
          proto: 'tcp',
          tcp: {
            sport: tcp.dport,
            dport: tcp.sport,
            flags: ['ACK', 'PSH'],
            http: { kind: 'request', method: 'GET', host: client.host, path: client.path, status: 0, title: '', body: '' },
          },
        });
        return;
      }
      if (tcp.http?.kind === 'response') {
        this.note('http.received', { code: tcp.http.status });
        st.inbox.push({ kind: 'http', port: tcp.dport, msg: tcp.http, time: this.time });
        return;
      }
    }
    this.drop('ip.noApp');
  }

  private servesDns(device: Device): boolean {
    return device.kind === 'internet' || (device.kind === 'server' && device.services.dns);
  }

  private listens(device: Device, dst: number, port: number): boolean {
    if (port === 80 || port === 443) {
      if (device.kind === 'internet') return dst === parseIp('198.51.100.80');
      return device.kind === 'server' && device.services.http;
    }
    if (device.kind !== 'router' && device.kind !== 'switch' && device.kind !== 'l3switch') return false;
    const transport = device.mgmt.vtyTransport;
    if (port === 22) return device.mgmt.sshKeys && (transport === 'ssh' || transport === 'all' || transport === '');
    return transport === 'telnet' || transport === 'all' || transport === '';
  }

  private pageFor(device: Device, dst: number): { title: string; body: string } {
    if (device.kind === 'internet') {
      const host = INTERNET_HOSTS.find((h) => parseIp(h.ip) === dst);
      return { title: host?.name ?? device.web.title, body: device.web.body };
    }
    return { title: device.web.title || device.name, body: device.web.body };
  }

  dnsLookup(device: Device, name: string): number | null {
    let target = name.toLowerCase().replace(/\.$/, '');
    for (let depth = 0; depth < 5; depth++) {
      const record = device.dnsRecords.find((r) => r.name.toLowerCase() === target);
      if (!record) return null;
      if (record.type === 'A') return parseIp(record.value);
      target = record.value.toLowerCase();
    }
    return null;
  }

  private natOutbound(device: Device, outIf: L3If, pkt: Ipv4Packet): Ipv4Packet {
    for (const rule of device.nat) {
      if (rule.kind === 'static' && parseIp(rule.inside) === pkt.src) {
        const outside = parseIp(rule.outside)!;
        this.note('nat.static', { from: ipToStr(pkt.src), to: rule.outside });
        return { ...pkt, src: outside };
      }
    }
    if (outIf.ip === null) return pkt;
    for (const rule of device.nat) {
      if (rule.kind !== 'pat') continue;
      if (rule.iface !== '*' && rule.iface !== outIf.name) continue;
      if (!aclPermitsSource(device, rule.acl, pkt.src)) continue;
      const st = this.st(device);
      const proto = pkt.proto;
      const insidePort = proto === 'icmp' ? pkt.icmp!.id : proto === 'tcp' ? pkt.tcp!.sport : pkt.udp!.sport;
      let entry = st.nat.find((e) => e.proto === proto && e.insideIp === pkt.src && e.insidePort === insidePort);
      if (!entry) {
        let outsidePort = insidePort;
        while (st.nat.some((e) => e.proto === proto && e.outsideIp === outIf.ip && e.outsidePort === outsidePort)) outsidePort++;
        entry = { proto, insideIp: pkt.src, insidePort, outsideIp: outIf.ip, outsidePort, remoteIp: pkt.dst, kind: 'pat' };
        st.nat.push(entry);
      }
      this.note('nat.pat', { from: `${ipToStr(pkt.src)}:${insidePort}`, to: `${ipToStr(entry.outsideIp)}:${entry.outsidePort}` });
      const translated: Ipv4Packet = { ...pkt, src: entry.outsideIp };
      if (proto === 'icmp') translated.icmp = { ...pkt.icmp!, id: entry.outsidePort };
      if (proto === 'tcp') translated.tcp = { ...pkt.tcp!, sport: entry.outsidePort };
      if (proto === 'udp') translated.udp = { ...pkt.udp!, sport: entry.outsidePort };
      return translated;
    }
    return pkt;
  }

  private natInbound(device: Device, pkt: Ipv4Packet): Ipv4Packet {
    for (const rule of device.nat) {
      if (rule.kind === 'static' && parseIp(rule.outside) === pkt.dst) {
        this.note('nat.staticIn', { from: rule.outside, to: rule.inside });
        return { ...pkt, dst: parseIp(rule.inside)! };
      }
    }
    const st = this.st(device);
    const proto = pkt.proto;
    let port: number | undefined;
    if (proto === 'icmp') port = pkt.icmp?.original && pkt.icmp.type !== 'echo-reply' ? pkt.icmp.original.id : pkt.icmp?.id;
    else if (proto === 'tcp') port = pkt.tcp?.dport;
    else port = pkt.udp?.dport;
    const entry = st.nat.find((e) => e.proto === proto && e.outsideIp === pkt.dst && e.outsidePort === port);
    if (!entry) return pkt;
    this.note('nat.patIn', { from: `${ipToStr(pkt.dst)}:${port}`, to: `${ipToStr(entry.insideIp)}:${entry.insidePort}` });
    const translated: Ipv4Packet = { ...pkt, dst: entry.insideIp };
    if (proto === 'icmp') {
      translated.icmp = { ...pkt.icmp! };
      if (translated.icmp.type === 'echo-reply') translated.icmp.id = entry.insidePort;
      if (translated.icmp.original) translated.icmp.original = { ...translated.icmp.original, src: entry.insideIp, id: entry.insidePort };
      if (translated.icmp.type !== 'echo-reply') translated.icmp.id = entry.insidePort;
    }
    if (proto === 'tcp') translated.tcp = { ...pkt.tcp!, dport: entry.insidePort };
    if (proto === 'udp') translated.udp = { ...pkt.udp!, dport: entry.insidePort };
    return translated;
  }

  private sessionKey(pkt: Ipv4Packet, reverse: boolean): string {
    const ports = pkt.proto === 'tcp' ? [pkt.tcp!.sport, pkt.tcp!.dport] : pkt.proto === 'udp' ? [pkt.udp!.sport, pkt.udp!.dport] : [pkt.icmp!.id, pkt.icmp!.id];
    const [src, dst, sport, dport] = reverse ? [pkt.dst, pkt.src, ports[1], ports[0]] : [pkt.src, pkt.dst, ports[0], ports[1]];
    return `${pkt.proto}|${src}|${sport}|${dst}|${dport}`;
  }

  private firewallAllows(device: Device, inIf: L3If, outIf: L3If, pkt: Ipv4Packet): boolean {
    const st = this.st(device);
    const replyCapable = pkt.proto !== 'icmp' || pkt.icmp?.type === 'echo-reply';
    if (replyCapable && st.sessions.has(this.sessionKey(pkt, true))) {
      this.note('fw.session');
      return true;
    }
    if (pkt.proto === 'icmp' && pkt.icmp?.type !== 'echo-request' && pkt.icmp?.original) {
      this.note('fw.related');
      return true;
    }
    const from = inIf.zone;
    const to = outIf.zone;
    for (const rule of device.fwRules) {
      if (rule.from !== 'any' && rule.from !== from) continue;
      if (rule.to !== 'any' && rule.to !== to) continue;
      if (rule.proto !== 'any' && rule.proto !== pkt.proto) continue;
      if (rule.port && (pkt.proto === 'tcp' ? pkt.tcp!.dport : pkt.proto === 'udp' ? pkt.udp!.dport : -1) !== rule.port) continue;
      if (rule.dst) {
        const [net, len] = rule.dst.split('/');
        const netIp = parseIp(net);
        if (netIp === null || !inSubnet(pkt.dst, netIp, Number(len ?? 32))) continue;
      }
      if (rule.action === 'allow') {
        st.sessions.add(this.sessionKey(pkt, false));
        this.note('fw.allow', { rule: rule.name });
        return true;
      }
      this.note('fw.ruleDeny', { rule: rule.name });
      return false;
    }
    if (from && from === to) {
      this.note('fw.intrazone', { zone: from });
      return true;
    }
    this.note('fw.default');
    return false;
  }

  private dhcpServes(device: Device): boolean {
    if (device.kind === 'server') return device.services.dhcp;
    if (device.kind === 'internet' || device.kind === 'homeRouter') return true;
    return device.dhcpPools.length > 0;
  }

  private dhcpServerSide(device: Device, entry: L3If, pkt: Ipv4Packet): void {
    const msg = pkt.udp!.dhcp!;
    const st = this.st(device);
    const isReply = msg.op === 'offer' || msg.op === 'ack' || msg.op === 'nak';
    if (isReply) {
      const target = st.relays.get(msg.xid);
      const relayIf = target ? this.topo.l3If(device, target) : undefined;
      if (!relayIf) return this.drop('dhcp.relayUnknown');
      this.note('dhcp.relayToClient', { iface: this.shortIf(device, relayIf) });
      this.sendIp(device, relayIf, BROADCAST_IP, {
        src: relayIf.ip!,
        dst: BROADCAST_IP,
        ttl: 64,
        proto: 'udp',
        udp: { sport: 67, dport: 68, dhcp: msg },
      });
      return;
    }
    const helper = entry.cfg.helper ? parseIp(entry.cfg.helper) : null;
    if (helper !== null && msg.giaddr === 0 && entry.ip !== null) {
      st.relays.set(msg.xid, entry.name);
      this.note('dhcp.relay', { server: ipToStr(helper), giaddr: ipToStr(entry.ip) });
      this.reply(device, {
        src: entry.ip,
        dst: helper,
        ttl: 64,
        proto: 'udp',
        udp: { sport: 67, dport: 67, dhcp: { ...msg, giaddr: entry.ip } },
      });
      return;
    }
    if (pkt.dst !== BROADCAST_IP && !this.topo.ownsIp(device, pkt.dst)) return this.drop('dhcp.notForMe');
    if (!this.dhcpServes(device)) return this.drop('dhcp.noServer');
    const scopeIp = msg.giaddr || entry.ip;
    if (scopeIp === null || scopeIp === 0) return this.drop('dhcp.noPool');
    const pool = device.dhcpPools.find((p) => {
      const net = parseIp(p.network);
      return net !== null && inSubnet(scopeIp, net, p.prefix);
    });
    if (!pool) return this.drop('dhcp.noPool', { ip: ipToStr(scopeIp) });
    const serverIp = entry.ip ?? 0;
    if (msg.op === 'discover') {
      const ip = this.allocate(device, pool.name, msg.chaddr);
      if (ip === null) return this.drop('dhcp.exhausted', { pool: pool.name });
      this.note('dhcp.offer', { ip: ipToStr(ip), pool: pool.name });
      this.dhcpReply(device, entry, msg, { op: 'offer', ip, pool, serverIp });
      return;
    }
    if (msg.op === 'request') {
      if (msg.server && msg.server !== serverIp && !msg.giaddr) return this.drop('dhcp.otherServer');
      const ip = msg.yiaddr;
      const binding = device.dhcpBindings.find((b) => b.mac === msg.chaddr);
      if (binding) binding.ip = ipToStr(ip);
      else device.dhcpBindings.push({ mac: msg.chaddr, ip: ipToStr(ip), pool: pool.name });
      this.note('dhcp.ack', { ip: ipToStr(ip) });
      this.dhcpReply(device, entry, msg, { op: 'ack', ip, pool, serverIp });
    }
  }

  private dhcpReply(
    device: Device,
    entry: L3If,
    msg: DhcpMsg,
    opts: { op: 'offer' | 'ack'; ip: number; pool: Device['dhcpPools'][number]; serverIp: number },
  ): void {
    const dnsText = opts.pool.dns || (device.kind === 'homeRouter' ? device.ports[0].dns || '198.51.100.53' : '');
    const reply: DhcpMsg = {
      op: opts.op,
      xid: msg.xid,
      chaddr: msg.chaddr,
      yiaddr: opts.ip,
      giaddr: msg.giaddr,
      server: opts.serverIp,
      prefix: opts.pool.prefix,
      router: parseIp(opts.pool.router) ?? 0,
      dns: parseIp(dnsText) ?? 0,
    };
    if (msg.giaddr) {
      this.reply(device, { src: opts.serverIp, dst: msg.giaddr, ttl: 64, proto: 'udp', udp: { sport: 67, dport: 67, dhcp: reply } });
      return;
    }
    this.sendIp(device, entry, BROADCAST_IP, { src: opts.serverIp, dst: BROADCAST_IP, ttl: 64, proto: 'udp', udp: { sport: 67, dport: 68, dhcp: reply } });
  }

  private allocate(device: Device, poolName: string, mac: string): number | null {
    const pool = device.dhcpPools.find((p) => p.name === poolName)!;
    const existing = device.dhcpBindings.find((b) => b.mac === mac && b.pool === poolName);
    if (existing) return parseIp(existing.ip);
    const net = parseIp(pool.network)!;
    const first = networkOf(net, pool.prefix) + 1;
    const last = broadcastOf(net, pool.prefix) - 1;
    const used = new Set(device.dhcpBindings.map((b) => parseIp(b.ip)));
    const own = new Set(this.topo.l3Ifs(device).map((e) => e.ip));
    const router = parseIp(pool.router);
    for (let ip = first; ip <= last; ip++) {
      if (used.has(ip) || own.has(ip) || ip === router) continue;
      const excluded = device.dhcpExcluded.some((range) => {
        const from = parseIp(range.from);
        const to = parseIp(range.to || range.from);
        return from !== null && to !== null && ip >= from && ip <= to;
      });
      if (excluded) continue;
      return ip >>> 0;
    }
    return null;
  }

  private dhcpClientReceive(device: Device, entry: L3If, msg: DhcpMsg): void {
    const cfg = entry.cfg as Port;
    const st = this.st(device);
    const session = st.dhcp.get(entry.name);
    if (!('dhcp' in cfg) || !cfg.dhcp || msg.chaddr !== entry.mac || !session || session.xid !== msg.xid) {
      return this.drop('dhcp.notMine');
    }
    if (msg.op === 'offer') {
      if (session.offer) return this.drop('dhcp.extraOffer');
      session.offer = msg;
      this.note('dhcp.gotOffer', { ip: ipToStr(msg.yiaddr) });
      this.outNotes = [];
      this.sendIp(device, entry, BROADCAST_IP, {
        src: 0,
        dst: BROADCAST_IP,
        ttl: 64,
        proto: 'udp',
        udp: { sport: 68, dport: 67, dhcp: { ...msg, op: 'request', giaddr: 0 } },
      });
      return;
    }
    if (msg.op === 'ack') {
      cfg.ip = ipToStr(msg.yiaddr);
      cfg.prefix = msg.prefix;
      cfg.gateway = msg.router ? ipToStr(msg.router) : '';
      cfg.dns = msg.dns ? ipToStr(msg.dns) : '';
      session.done = true;
      this.note('dhcp.bound', { ip: cfg.ip, prefix: cfg.prefix });
      this.refresh();
    }
  }

  private dhcpPort(device: Device, portName?: string): Port | undefined {
    if (portName) return device.ports.find((p) => p.name === portName);
    return device.ports.find((p) => p.dhcp && this.topo.portUp(device, p.name)) ?? device.ports.find((p) => p.dhcp);
  }

  dhcpRenew(deviceId: string, portName?: string): DhcpResult {
    const device = this.dev(deviceId);
    const port = this.dhcpPort(device, portName);
    const fail: DhcpResult = { ok: false, ip: '', prefix: 0, gateway: '', dns: '', server: '', apipa: false };
    if (!port || !port.dhcp) return fail;
    port.ip = '';
    port.gateway = '';
    port.dns = '';
    this.refresh();
    if (!this.topo.portUp(device, port.name)) return fail;
    this.beginAction();
    const st = this.st(device);
    let session = { xid: 0, offer: null as DhcpMsg | null, done: false };
    for (let attempt = 0; attempt < 3 && !session.done; attempt++) {
      const xid = st.counters.xid++;
      session = { xid, offer: null, done: false };
      st.dhcp.set(port.name, session);
      const entry = this.topo.l3If(device, port.name)!;
      this.note('dhcp.discover');
      this.sendIp(device, entry, BROADCAST_IP, {
        src: 0,
        dst: BROADCAST_IP,
        ttl: 64,
        proto: 'udp',
        udp: { sport: 68, dport: 67, dhcp: { op: 'discover', xid, chaddr: port.mac, yiaddr: 0, giaddr: 0, server: 0, prefix: 0, router: 0, dns: 0 } },
      });
      this.run();
      this.time += 1;
    }
    if (!session.done) {
      if (isHost(device.kind)) {
        const mac = parseInt(port.mac.slice(-4), 16);
        port.ip = `169.254.${(mac >> 8) % 254 + 1}.${(mac & 255) % 254 + 1}`;
        port.prefix = 16;
      }
      this.refresh();
      this.endAction();
      return { ...fail, ip: port.ip, prefix: port.prefix, apipa: port.ip.startsWith('169.254.') };
    }
    this.endAction();
    return {
      ok: true,
      ip: port.ip,
      prefix: port.prefix,
      gateway: port.gateway,
      dns: port.dns,
      server: session.offer ? ipToStr(session.offer.server) : '',
      apipa: false,
    };
  }

  dhcpRelease(deviceId: string, portName?: string): void {
    const device = this.dev(deviceId);
    const port = this.dhcpPort(device, portName);
    if (!port) return;
    port.ip = '';
    port.gateway = '';
    port.dns = '';
    this.refresh();
  }

  autoDhcp(): void {
    for (const device of this.net.devices) {
      for (const port of device.ports) {
        if (port.switchport || !port.dhcp) continue;
        const needs = !port.ip || port.ip.startsWith('169.254.');
        if (!needs || !this.topo.portUp(device, port.name)) continue;
        this.dhcpRenew(device.id, port.name);
      }
    }
  }

  echo(deviceId: string, dst: number, ttl?: number, source?: number): EchoResult {
    const device = this.dev(deviceId);
    const st = this.st(device);
    const id = st.counters.icmpId;
    const seq = st.counters.icmpId++;
    const start = this.time;
    this.beginAction();
    this.note('icmp.create', { dst: ipToStr(dst) });
    const sent = this.originate(device, {
      src: source ?? 0,
      dst,
      ttl: ttl ?? initialTtl(device),
      proto: 'icmp',
      icmp: { type: 'echo-request', code: 0, id, seq },
    });
    if (sent !== 'sent') {
      this.recordLocalFailure(device, dst, sent);
      this.endAction();
      return { outcome: sent, from: null, ttl: 0, rtt: 0 };
    }
    this.run();
    const result = this.collectEcho(st, id, seq, start);
    this.endAction();
    return result;
  }

  private recordLocalFailure(device: Device, dst: number, reason: 'no-route' | 'no-ip'): void {
    const notes = [...this.outNotes, { key: reason === 'no-ip' ? 'ip.noAddress' : 'ip.noRouteLocal', params: { ip: ipToStr(dst) } }];
    this.outNotes = [];
    this.trace.push({
      seq: ++this.seq,
      time: this.time,
      from: { dev: device.id, port: '' },
      to: null,
      link: null,
      frame: { src: '', dst: '', vlan: null, type: 'ipv4', ip: { src: 0, dst, ttl: 0, proto: 'icmp', icmp: { type: 'echo-request', code: 0, id: 0, seq: 0 } } },
      proto: 'ICMP',
      sent: notes,
      received: [],
      outcome: 'drop',
    });
  }

  private collectEcho(st: DevState, id: number, seq: number, start: number): EchoResult {
    const index = st.inbox.findIndex(
      (item) =>
        (item.kind === 'icmp' && (item.msg.type === 'echo-reply' ? item.msg.id === id && item.msg.seq === seq : item.msg.original?.id === id && item.msg.seq === seq)) ||
        (item.kind === 'arp-fail' && item.pkt.icmp?.id === id && item.pkt.icmp?.seq === seq),
    );
    if (index < 0) return { outcome: 'timeout', from: null, ttl: 0, rtt: 0 };
    const item = st.inbox.splice(index, 1)[0];
    if (item.kind === 'arp-fail') return { outcome: 'host-unreachable', from: item.pkt.src, ttl: 0, rtt: 0 };
    if (item.kind !== 'icmp') return { outcome: 'timeout', from: null, ttl: 0, rtt: 0 };
    const rtt = Math.max(0, item.time - start);
    if (item.msg.type === 'echo-reply') return { outcome: 'reply', from: item.from, ttl: item.ttl, rtt };
    if (item.msg.type === 'time-exceeded') return { outcome: 'ttl-expired', from: item.from, ttl: item.ttl, rtt };
    if (item.msg.code === 13) return { outcome: 'admin-prohibited', from: item.from, ttl: item.ttl, rtt };
    if (item.msg.code === 1) return { outcome: 'host-unreachable', from: item.from, ttl: item.ttl, rtt };
    return { outcome: 'net-unreachable', from: item.from, ttl: item.ttl, rtt };
  }

  ping(deviceId: string, dst: number, count = 4): EchoResult[] {
    const results: EchoResult[] = [];
    for (let i = 0; i < count; i++) results.push(this.echo(deviceId, dst));
    return results;
  }

  traceroute(deviceId: string, dst: number, maxHops = 30): EchoResult[] {
    const hops: EchoResult[] = [];
    for (let ttl = 1; ttl <= maxHops; ttl++) {
      let result = this.echo(deviceId, dst, ttl);
      if (result.outcome === 'timeout') result = this.echo(deviceId, dst, ttl);
      hops.push(result);
      if (result.outcome === 'reply' || result.outcome === 'no-route' || result.outcome === 'no-ip') break;
      if (result.outcome === 'net-unreachable' || result.outcome === 'host-unreachable' || result.outcome === 'admin-prohibited') break;
      if (hops.length >= 4 && hops.slice(-4).every((h) => h.outcome === 'timeout')) break;
    }
    return hops;
  }

  dnsServerOf(device: Device): number | null {
    for (const port of device.ports) {
      if (!port.dns) continue;
      const ip = parseIp(port.dns);
      if (ip !== null) return ip;
    }
    return null;
  }

  resolve(deviceId: string, name: string): DnsResult {
    const device = this.dev(deviceId);
    const direct = parseIp(name);
    if (direct !== null) return { status: 'ok', ip: direct, server: null };
    const server = this.dnsServerOf(device);
    if (server === null) return { status: 'no-server', ip: null, server: null };
    const st = this.st(device);
    const id = st.counters.dnsId++;
    const sport = st.counters.port++;
    for (let attempt = 0; attempt < 3; attempt++) {
      this.beginAction();
      this.note('dns.query', { name, server: ipToStr(server) });
      const sent = this.originate(device, {
        src: 0,
        dst: server,
        ttl: initialTtl(device),
        proto: 'udp',
        udp: { sport, dport: 53, dns: { id, response: false, name, answer: 0, rcode: 'ok' } },
      });
      if (sent !== 'sent') {
        this.outNotes = [];
        this.endAction();
        return { status: 'timeout', ip: null, server };
      }
      this.run();
      this.endAction();
      const index = st.inbox.findIndex((item) => item.kind === 'dns' && item.id === id);
      if (index >= 0) {
        const item = st.inbox.splice(index, 1)[0] as Extract<InboxItem, { kind: 'dns' }>;
        return item.ok ? { status: 'ok', ip: item.answer, server } : { status: 'nxdomain', ip: null, server };
      }
    }
    return { status: 'timeout', ip: null, server };
  }

  http(deviceId: string, url: string): HttpResult {
    const device = this.dev(deviceId);
    const match = /^(?:(https?):\/\/)?([^/:\s]+)(?::(\d+))?(\/[^\s]*)?$/i.exec(url.trim());
    if (!match) return { status: 'dns-failed', code: 0, title: '', body: '', ip: null };
    const scheme = (match[1] ?? 'https').toLowerCase();
    const host = match[2];
    const port = Number(match[3] ?? (scheme === 'http' ? 80 : 443));
    const path = match[4] ?? '/';
    const resolved = this.resolve(deviceId, host);
    if (resolved.status !== 'ok' || resolved.ip === null) return { status: 'dns-failed', code: 0, title: '', body: '', ip: null };
    const st = this.st(device);
    for (let attempt = 0; attempt < 3; attempt++) {
      const sport = st.counters.port++;
      st.tcp.set(sport, { dst: resolved.ip, dport: port, host, path, purpose: 'http' });
      this.beginAction();
      this.note('tcp.syn', { host, port });
      const sent = this.originate(device, {
        src: 0,
        dst: resolved.ip,
        ttl: initialTtl(device),
        proto: 'tcp',
        tcp: { sport, dport: port, flags: ['SYN'] },
      });
      if (sent !== 'sent') {
        this.outNotes = [];
        this.endAction();
        st.tcp.delete(sport);
        return { status: 'timeout', code: 0, title: '', body: '', ip: resolved.ip };
      }
      this.run();
      this.endAction();
      st.tcp.delete(sport);
      const index = st.inbox.findIndex((item) => (item.kind === 'http' || item.kind === 'rst') && item.port === sport);
      if (index < 0) continue;
      const item = st.inbox.splice(index, 1)[0];
      if (item.kind === 'rst') return { status: 'refused', code: 0, title: '', body: '', ip: resolved.ip };
      if (item.kind === 'http') return { status: 'ok', code: item.msg.status, title: item.msg.title, body: item.msg.body, ip: resolved.ip };
    }
    return { status: 'timeout', code: 0, title: '', body: '', ip: resolved.ip };
  }

  connect(deviceId: string, dst: number, port: number): 'open' | 'refused' | 'timeout' {
    const device = this.dev(deviceId);
    const st = this.st(device);
    for (let attempt = 0; attempt < 3; attempt++) {
      const sport = st.counters.port++;
      st.tcp.set(sport, { dst, dport: port, host: '', path: '', purpose: 'connect' });
      this.beginAction();
      this.note('tcp.syn', { host: ipToStr(dst), port });
      const sent = this.originate(device, { src: 0, dst, ttl: initialTtl(device), proto: 'tcp', tcp: { sport, dport: port, flags: ['SYN'] } });
      if (sent !== 'sent') {
        this.outNotes = [];
        this.endAction();
        st.tcp.delete(sport);
        return 'timeout';
      }
      this.run();
      this.endAction();
      st.tcp.delete(sport);
      const index = st.inbox.findIndex((item) => (item.kind === 'synack' || item.kind === 'rst') && item.port === sport);
      if (index < 0) continue;
      const item = st.inbox.splice(index, 1)[0];
      return item.kind === 'synack' ? 'open' : 'refused';
    }
    return 'timeout';
  }

  ndTable(device: Device): { ip: bigint; mac: string; ifName: string }[] {
    return [...this.st(device).nd.entries()].map(([ip, entry]) => ({ ip, ...entry })).sort((a, b) => (a.ip < b.ip ? -1 : 1));
  }

  private ip6Receive(device: Device, entry: L3If, frame: Frame): void {
    const pkt = frame.ip6!;
    const me = this.topo.ip6If(device, entry.name);
    if (!me) return this.drop('ip6.disabled', { iface: entry.name });
    const st = this.st(device);
    const icmp = pkt.icmp6;
    if (icmp.type === 'ns') {
      if (!me.addrs.some((a) => a.addr === icmp.target)) return this.drop('nd.notForMe', { ip: formatIpv6(icmp.target) });
      st.nd.set(pkt.src, { mac: icmp.mac || frame.src, ifName: entry.name });
      this.note('nd.solicitForMe', { ip: formatIpv6(icmp.target), mac: entry.mac });
      this.l3Transmit(device, entry, {
        src: entry.mac,
        dst: frame.src,
        vlan: null,
        type: 'ipv6',
        ip6: { src: icmp.target, dst: pkt.src, hop: 255, icmp6: { type: 'na', code: 0, id: 0, seq: 0, target: icmp.target, mac: entry.mac } },
      });
      this.flushPending6(device, pkt.src);
      return;
    }
    if (icmp.type === 'na') {
      st.nd.set(icmp.target, { mac: icmp.mac, ifName: entry.name });
      this.note('nd.learned', { ip: formatIpv6(icmp.target), mac: icmp.mac });
      this.flushPending6(device, icmp.target);
      return;
    }
    if (pkt.dst === ALL_NODES || this.topo.ownsIp6(device, pkt.dst)) return this.localDeliver6(device, pkt);
    if (!this.topo.isRouting6(device)) return this.drop(isHost(device.kind) ? 'ip6.notForMe' : 'ip6.notRouting', { ip: formatIpv6(pkt.dst) });
    this.forward6(device, entry, pkt);
  }

  private forward6(device: Device, inIf: L3If, original: Ipv6Packet): void {
    if (original.hop <= 1) {
      this.drop('ip6.hopExpired');
      return this.sendIcmp6Error(device, inIf, original, 'time-exceeded', 0);
    }
    const found = this.topo.lookup6(device, original.dst);
    if (!found) {
      this.drop('ip6.noRoute', { ip: formatIpv6(original.dst) });
      return this.sendIcmp6Error(device, inIf, original, 'unreachable', 0);
    }
    const outIf = this.topo.l3If(device, found.ifName)!;
    this.note('ip6.forward', { net: `${formatIpv6(found.route.net)}/${found.route.prefix}`, via: formatIpv6(found.nextHop), iface: this.shortIf(device, outIf), code: found.route.code });
    this.sendIp6(device, outIf, found.nextHop, { ...original, hop: original.hop - 1 });
  }

  private sendIp6(device: Device, outIf: L3If, nextHop: bigint, pkt: Ipv6Packet): void {
    const st = this.st(device);
    if (isMulticast6(nextHop)) {
      this.l3Transmit(device, outIf, { src: outIf.mac, dst: multicastMac(nextHop), vlan: null, type: 'ipv6', ip6: pkt });
      return;
    }
    const cached = st.nd.get(nextHop);
    if (cached) {
      this.l3Transmit(device, outIf, { src: outIf.mac, dst: cached.mac, vlan: null, type: 'ipv6', ip6: pkt });
      return;
    }
    const me = this.topo.ip6If(device, outIf.name);
    if (!me) return;
    const asking = st.pending6.some((item) => item.nextHop === nextHop);
    if (this.topo.isRouting6(device)) {
      this.note('nd.routerDrop', { ip: formatIpv6(nextHop) });
      if (this.current) this.current.outcome = 'drop';
    } else {
      st.pending6.push({ ifName: outIf.name, nextHop, pkt });
      if (asking) return;
      this.note('nd.queueAndAsk', { ip: formatIpv6(nextHop) });
    }
    const group = solicitedNode(nextHop);
    this.l3Transmit(device, outIf, {
      src: outIf.mac,
      dst: multicastMac(group),
      vlan: null,
      type: 'ipv6',
      ip6: { src: this.sourceFor(device, outIf.name, nextHop) ?? me.linkLocal, dst: group, hop: 255, icmp6: { type: 'ns', code: 0, id: 0, seq: 0, target: nextHop, mac: outIf.mac } },
    });
  }

  private flushPending6(device: Device, ip: bigint): void {
    const st = this.st(device);
    const ready = st.pending6.filter((item) => item.nextHop === ip);
    if (!ready.length) return;
    st.pending6 = st.pending6.filter((item) => item.nextHop !== ip);
    const mac = st.nd.get(ip)!.mac;
    for (const item of ready) {
      const entry = this.topo.l3If(device, item.ifName);
      if (!entry) continue;
      this.note('ip.sendQueued', { ip: formatIpv6(item.pkt.dst) });
      this.l3Transmit(device, entry, { src: entry.mac, dst: mac, vlan: null, type: 'ipv6', ip6: item.pkt });
    }
  }

  private sourceFor(device: Device, ifName: string, dst: bigint): bigint | null {
    const me = this.topo.ip6If(device, ifName);
    if (!me) return null;
    if (isLinkLocal(dst)) return me.linkLocal;
    return me.addrs.find((a) => a.origin !== 'link-local')?.addr ?? me.linkLocal;
  }

  private originate6(device: Device, pkt: Ipv6Packet): 'sent' | 'no-route' | 'no-ip' {
    if (this.topo.ownsIp6(device, pkt.dst)) {
      this.localDeliver6(device, { ...pkt, src: pkt.src || pkt.dst });
      return 'sent';
    }
    const found = this.topo.lookup6(device, pkt.dst);
    if (!found) return this.topo.ip6Ifs(device).length ? 'no-route' : 'no-ip';
    const outIf = this.topo.l3If(device, found.ifName)!;
    const src = pkt.src || this.sourceFor(device, found.ifName, pkt.dst);
    if (src === null) return 'no-ip';
    this.note(found.route.prefix === 0 ? 'ip6.originateGateway' : 'ip6.originate', { dst: formatIpv6(pkt.dst), via: formatIpv6(found.nextHop), iface: this.shortIf(device, outIf) });
    this.sendIp6(device, outIf, found.nextHop, { ...pkt, src });
    return 'sent';
  }

  private localDeliver6(device: Device, pkt: Ipv6Packet): void {
    const icmp = pkt.icmp6;
    if (icmp.type === 'echo-request') {
      if (isMulticast6(pkt.dst)) return this.drop('icmp.ignoreBroadcast');
      this.note('icmp6.echoReply', { ip: formatIpv6(pkt.src) });
      const result = this.originate6(device, { src: pkt.dst, dst: pkt.src, hop: 64, icmp6: { ...icmp, type: 'echo-reply' } });
      if (result !== 'sent') this.note('ip.replyNoRoute', { ip: formatIpv6(pkt.src) });
      return;
    }
    this.note('icmp.delivered', { type: icmp.type });
    this.st(device).inbox.push({ kind: 'icmp6', msg: icmp, from: pkt.src, hop: pkt.hop, time: this.time });
  }

  private sendIcmp6Error(device: Device, inIf: L3If, original: Ipv6Packet, type: 'unreachable' | 'time-exceeded', code: number): void {
    if (original.icmp6.type !== 'echo-request') return;
    const src = this.sourceFor(device, inIf.name, original.src);
    if (src === null) return;
    const result = this.originate6(device, {
      src,
      dst: original.src,
      hop: 64,
      icmp6: { type, code, id: original.icmp6.id, seq: original.icmp6.seq, target: 0n, mac: '', original: { src: original.src, dst: original.dst, id: original.icmp6.id, seq: original.icmp6.seq } },
    });
    if (result !== 'sent') this.note('ip.replyNoRoute', { ip: formatIpv6(original.src) });
  }

  echo6(deviceId: string, dst: bigint, hop?: number): Echo6Result {
    const device = this.dev(deviceId);
    const st = this.st(device);
    const id = st.counters.icmpId;
    const seq = st.counters.icmpId++;
    const start = this.time;
    this.beginAction();
    this.note('icmp.create', { dst: formatIpv6(dst) });
    const sent = this.originate6(device, { src: 0n, dst, hop: hop ?? 64, icmp6: { type: 'echo-request', code: 0, id, seq, target: 0n, mac: '' } });
    if (sent !== 'sent') {
      this.outNotes = [];
      this.endAction();
      return { outcome: sent, from: null, hop: 0, rtt: 0 };
    }
    this.run();
    const index = st.inbox.findIndex(
      (item) =>
        (item.kind === 'icmp6' && (item.msg.type === 'echo-reply' ? item.msg.id === id && item.msg.seq === seq : item.msg.original?.id === id && item.msg.original.seq === seq)) ||
        (item.kind === 'nd-fail' && item.pkt.icmp6.id === id && item.pkt.icmp6.seq === seq),
    );
    this.endAction();
    if (index < 0) return { outcome: 'timeout', from: null, hop: 0, rtt: 0 };
    const item = st.inbox.splice(index, 1)[0];
    if (item.kind === 'nd-fail') return { outcome: 'host-unreachable', from: item.pkt.src, hop: 0, rtt: 0 };
    if (item.kind !== 'icmp6') return { outcome: 'timeout', from: null, hop: 0, rtt: 0 };
    const rtt = Math.max(0, item.time - start);
    if (item.msg.type === 'echo-reply') return { outcome: 'reply', from: item.from, hop: item.hop, rtt };
    if (item.msg.type === 'time-exceeded') return { outcome: 'ttl-expired', from: item.from, hop: item.hop, rtt };
    return { outcome: 'net-unreachable', from: item.from, hop: item.hop, rtt };
  }

  traceroute6(deviceId: string, dst: bigint, maxHops = 30): Echo6Result[] {
    const hops: Echo6Result[] = [];
    for (let hop = 1; hop <= maxHops; hop++) {
      let result = this.echo6(deviceId, dst, hop);
      if (result.outcome === 'timeout') result = this.echo6(deviceId, dst, hop);
      hops.push(result);
      if (['reply', 'no-route', 'no-ip', 'net-unreachable', 'host-unreachable'].includes(result.outcome)) break;
      if (hops.length >= 4 && hops.slice(-4).every((h) => h.outcome === 'timeout')) break;
    }
    return hops;
  }

  canReach6(deviceId: string, dst: bigint, attempts = 5): boolean {
    for (let i = 0; i < attempts; i++) if (this.echo6(deviceId, dst).outcome === 'reply') return true;
    return false;
  }

  canReach(deviceId: string, dst: number, attempts = 4): boolean {
    for (let i = 0; i < attempts; i++) {
      if (this.echo(deviceId, dst).outcome === 'reply') return true;
    }
    return false;
  }

  maskOf(prefix: number): string {
    return ipToStr(prefixToMask(prefix));
  }
}
