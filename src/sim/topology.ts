import { modelOf } from './catalog';
import { inSubnet, networkOf, parseIp, wildcardToPrefix } from './ip';
import { blankPort, findDevice, isHost } from './network';
import type { Device, FhrpProto, Link, LinkEnd, NatRole, Network, Port, VirtualIf } from './types';

export type L3Attach =
  | { kind: 'port'; port: string }
  | { kind: 'sub'; port: string; vlan: number }
  | { kind: 'svi'; vlan: number }
  | { kind: 'loop' };

export interface L3If {
  name: string;
  cfg: Port | VirtualIf;
  ip: number | null;
  prefix: number;
  mac: string;
  attach: L3Attach;
  up: boolean;
  nat: NatRole;
  zone: string;
}

export type RouteCode = 'C' | 'L' | 'S' | 'O' | 'E2';

export interface Route {
  code: RouteCode;
  net: number;
  prefix: number;
  ad: number;
  metric: number;
  via: number | null;
  ifName: string;
  isDefault: boolean;
}

export type StpRole = 'root' | 'designated' | 'alternate';

export interface StpPortInfo {
  role: StpRole;
  cost: number;
}

export interface StpBridgeInfo {
  rootId: string;
  rootCost: number;
  bridgeId: string;
  isRoot: boolean;
  rootPort: string | null;
  ports: Map<string, StpPortInfo>;
}

export interface OspfNeighbor {
  routerId: string;
  peerDev: string;
  address: number;
  ifName: string;
  state: 'FULL/DR' | 'FULL/BDR' | 'FULL/DROTHER';
}

export interface WifiAssoc {
  client: string;
  ap: string;
  distance: number;
}

export type WifiStatus = 'connected' | 'no-ssid' | 'bad-key' | 'out-of-range' | 'off';

export type MemberState = 'primary' | 'bundled' | 'individual' | 'suspended' | 'down';

export interface ChannelInfo {
  group: number;
  lacp: boolean;
  members: { port: Port; state: MemberState }[];
}

export interface FhrpState {
  proto: FhrpProto;
  group: number;
  vip: number;
  vmac: string;
  priority: number;
  preempt: boolean;
  active: boolean;
  activeIp: number;
  standbyIp: number | null;
}

export const RADIO_PREFIX = 'Radio:';

export function adminDown(port: Port): boolean {
  return port.shutdown || port.errDisabled;
}

export function virtualMac(proto: FhrpProto, group: number): string {
  const suffix = group.toString(16).padStart(2, '0');
  return proto === 'vrrp' ? `00005e0001${suffix}` : `00000c07ac${suffix}`;
}

function sameL2(a: Port, b: Port): boolean {
  return a.mode === b.mode && a.accessVlan === b.accessVlan && a.nativeVlan === b.nativeVlan && (a.mode === 'access' || a.allowedVlans === b.allowedVlans);
}

function bridgeId(device: Device): string {
  return `${device.stpPriority.toString().padStart(5, '0')}.${device.baseMac}`;
}

function stpCost(speed: number): number {
  if (speed >= 25000) return 1;
  if (speed >= 10000) return 2;
  if (speed >= 2000) return 3;
  if (speed >= 1000) return 4;
  return 19;
}

export function ospfCost(refBwMbps: number, speed: number, override: number): number {
  if (override > 0) return override;
  return Math.max(1, Math.floor(refBwMbps / speed));
}

export function parseVlanList(text: string): Set<number> | 'all' {
  if (!text || text.trim().toLowerCase() === 'all') return 'all';
  const set = new Set<number>();
  for (const part of text.split(',')) {
    const [from, to] = part.trim().split('-').map(Number);
    if (!Number.isInteger(from)) continue;
    const end = Number.isInteger(to) ? to : from;
    for (let v = from; v <= end && v - from < 4096; v++) set.add(v);
  }
  return set;
}

export function vlanAllowed(port: Port, vlan: number): boolean {
  const list = parseVlanList(port.allowedVlans);
  return list === 'all' || list.has(vlan);
}

export class Topology {
  readonly net: Network;
  private devices = new Map<string, Device>();
  private links = new Map<string, Link>();
  private radioPorts = new Map<string, Port>();
  private wireless: WifiAssoc[] = [];
  private wifiStatuses = new Map<string, WifiStatus>();
  private poweredCache = new Map<string, boolean>();
  private l3Cache = new Map<string, L3If[]>();
  private routeCache = new Map<string, Route[]>();
  private stpCache: Map<string, StpBridgeInfo> | null = null;
  private ospfCache: { routes: Map<string, Route[]>; neighbors: Map<string, OspfNeighbor[]> } | null = null;
  private channelCache: Map<string, MemberState> | null = null;
  private fhrpCache: Map<string, FhrpState> | null = null;

  constructor(net: Network) {
    this.net = net;
    for (const device of net.devices) this.devices.set(device.id, device);
    for (const link of net.links) {
      this.links.set(`${link.a.dev}|${link.a.port}`, link);
      this.links.set(`${link.b.dev}|${link.b.port}`, link);
    }
    this.computeWireless();
  }

  device(id: string): Device | undefined {
    return this.devices.get(id);
  }

  private computeWireless(): void {
    const aps = this.net.devices.filter((d) => d.wifi && (d.kind === 'ap' || d.kind === 'homeRouter'));
    for (const client of this.net.devices) {
      const wlan = client.ports.find((p) => p.media === 'wireless');
      if (!wlan) continue;
      if (!client.wifiClient || !client.wifiClient.ssid || wlan.shutdown) {
        this.wifiStatuses.set(client.id, 'off');
        continue;
      }
      const wanted = client.wifiClient;
      const sameSsid = aps.filter((ap) => ap.wifi!.ssid === wanted.ssid && this.isPowered(ap));
      if (sameSsid.length === 0) {
        this.wifiStatuses.set(client.id, 'no-ssid');
        continue;
      }
      const withKey = sameSsid.filter((ap) => ap.wifi!.security === 'open' || ap.wifi!.key === wanted.key);
      if (withKey.length === 0) {
        this.wifiStatuses.set(client.id, 'bad-key');
        continue;
      }
      const inRange = withKey
        .map((ap) => ({ ap, distance: Math.hypot(ap.x - client.x, ap.y - client.y) }))
        .filter((entry) => entry.distance <= modelOf(entry.ap.kind).wifiRange)
        .sort((a, b) => a.distance - b.distance);
      if (inRange.length === 0) {
        this.wifiStatuses.set(client.id, 'out-of-range');
        continue;
      }
      const best = inRange[0];
      const radioName = `${RADIO_PREFIX}${client.id}`;
      const radio = blankPort(radioName, `Radio-${client.name}`, best.ap.baseMac);
      radio.media = 'wireless';
      radio.switchport = true;
      radio.accessVlan = best.ap.wifi!.vlan;
      radio.speed = 2400;
      this.radioPorts.set(`${best.ap.id}|${radioName}`, radio);
      const link: Link = {
        id: `w-${client.id}`,
        a: { dev: best.ap.id, port: radioName },
        b: { dev: client.id, port: wlan.name },
        cable: 'copper',
      };
      this.links.set(`${best.ap.id}|${radioName}`, link);
      this.links.set(`${client.id}|${wlan.name}`, link);
      this.wireless.push({ client: client.id, ap: best.ap.id, distance: best.distance });
      this.wifiStatuses.set(client.id, 'connected');
    }
  }

  wifiAssociations(): WifiAssoc[] {
    return this.wireless;
  }

  wifiStatus(deviceId: string): WifiStatus {
    return this.wifiStatuses.get(deviceId) ?? 'off';
  }

  isWirelessLink(link: Link): boolean {
    return link.id.startsWith('w-');
  }

  port(device: Device, name: string): Port | undefined {
    if (name.startsWith(RADIO_PREFIX)) return this.radioPorts.get(`${device.id}|${name}`);
    return device.ports.find((p) => p.name === name);
  }

  allPorts(device: Device): Port[] {
    const radios: Port[] = [];
    for (const [key, port] of this.radioPorts) if (key.startsWith(`${device.id}|`)) radios.push(port);
    return [...device.ports, ...radios];
  }

  link(dev: string, port: string): Link | undefined {
    return this.links.get(`${dev}|${port}`);
  }

  peer(dev: string, port: string): LinkEnd | null {
    const link = this.link(dev, port);
    if (!link) return null;
    return link.a.dev === dev && link.a.port === port ? link.b : link.a;
  }

  isPowered(device: Device): boolean {
    const cached = this.poweredCache.get(device.id);
    if (cached !== undefined) return cached;
    let powered = true;
    if (modelOf(device.kind).needsPoe) {
      const eth = device.ports[0];
      const key = `${device.id}|${eth.name}`;
      const link = this.links.get(key);
      powered = false;
      if (link) {
        const end = link.a.dev === device.id ? link.b : link.a;
        const peerDevice = this.devices.get(end.dev);
        const peerPort = peerDevice?.ports.find((p) => p.name === end.port);
        powered = Boolean(peerPort?.poe && !adminDown(peerPort));
      }
    }
    this.poweredCache.set(device.id, powered);
    return powered;
  }

  portUp(device: Device, name: string): boolean {
    const port = this.port(device, name);
    if (!port || adminDown(port) || !this.isPowered(device)) return false;
    const end = this.peer(device.id, name);
    if (!end) return false;
    const peerDevice = this.devices.get(end.dev);
    if (!peerDevice || !this.isPowered(peerDevice)) return false;
    const peerPort = this.port(peerDevice, end.port);
    return Boolean(peerPort && !adminDown(peerPort));
  }

  private physSpeed(device: Device, name: string): number {
    const port = this.port(device, name);
    const end = this.peer(device.id, name);
    if (!port || !end) return port?.speed ?? 0;
    const peerDevice = this.devices.get(end.dev);
    const peerPort = peerDevice && this.port(peerDevice, end.port);
    return Math.min(port.speed, peerPort?.speed ?? port.speed);
  }

  linkSpeed(device: Device, name: string): number {
    const port = this.port(device, name);
    if (port && this.memberState(device.id, name) === 'primary') {
      return device.ports
        .filter((p) => p.channelGroup === port.channelGroup && ['primary', 'bundled'].includes(this.memberState(device.id, p.name) ?? ''))
        .reduce((sum, p) => sum + this.physSpeed(device, p.name), 0);
    }
    return this.physSpeed(device, name);
  }

  memberState(dev: string, port: string): MemberState | null {
    return this.channelStates().get(`${dev}|${port}`) ?? null;
  }

  memberInactive(dev: string, port: string): boolean {
    const state = this.memberState(dev, port);
    return state === 'bundled' || state === 'suspended';
  }

  portLabel(device: Device, name: string): string {
    const port = this.port(device, name);
    if (!port) return name;
    const state = this.memberState(device.id, name);
    return state === 'primary' || state === 'bundled' ? `Po${port.channelGroup}` : port.short;
  }

  channels(device: Device): ChannelInfo[] {
    const groups = [...new Set(device.ports.filter((p) => p.switchport && p.channelGroup > 0).map((p) => p.channelGroup))].sort((a, b) => a - b);
    return groups.map((group) => {
      const members = device.ports.filter((p) => p.switchport && p.channelGroup === group);
      return {
        group,
        lacp: members.some((p) => p.channelMode !== 'on'),
        members: members.map((port) => ({ port, state: this.memberState(device.id, port.name) ?? 'down' })),
      };
    });
  }

  private channelPeer(device: Device, port: Port): { dev: Device; port: Port } | null {
    const end = this.peer(device.id, port.name);
    const peerDev = end ? this.devices.get(end.dev) : undefined;
    const peerPort = peerDev && end ? this.port(peerDev, end.port) : undefined;
    return peerDev && peerPort ? { dev: peerDev, port: peerPort } : null;
  }

  private groupReference(device: Device, group: number): Port | undefined {
    return device.ports.find((p) => p.switchport && p.channelGroup === group);
  }

  private groupPartner(device: Device, group: number): string | null {
    for (const port of device.ports) {
      if (!port.switchport || port.channelGroup !== group || !this.portUp(device, port.name)) continue;
      const peer = this.channelPeer(device, port);
      if (peer && peer.port.switchport && peer.port.channelGroup > 0) return `${peer.dev.id}|${peer.port.channelGroup}`;
    }
    return null;
  }

  private pairState(device: Device, port: Port): MemberState {
    const peer = this.channelPeer(device, port);
    if (!peer || !peer.port.switchport || peer.port.channelGroup <= 0) return port.channelMode === 'on' ? 'suspended' : 'individual';
    const mine = port.channelMode;
    const theirs = peer.port.channelMode;
    if ((mine === 'on') !== (theirs === 'on')) return 'suspended';
    if (mine === 'passive' && theirs === 'passive') return 'individual';
    if (this.groupPartner(device, port.channelGroup) !== `${peer.dev.id}|${peer.port.channelGroup}`) return 'suspended';
    if (this.groupPartner(peer.dev, peer.port.channelGroup) !== `${device.id}|${port.channelGroup}`) return 'suspended';
    const myRef = this.groupReference(device, port.channelGroup);
    const peerRef = this.groupReference(peer.dev, peer.port.channelGroup);
    if (!myRef || !peerRef || !sameL2(myRef, port) || !sameL2(peerRef, peer.port)) return 'suspended';
    return 'bundled';
  }

  private channelStates(): Map<string, MemberState> {
    if (this.channelCache) return this.channelCache;
    const states = new Map<string, MemberState>();
    this.channelCache = states;
    for (const device of this.net.devices) {
      const groups = new Map<number, Port[]>();
      for (const port of device.ports) {
        if (!port.switchport || port.channelGroup <= 0) continue;
        const state = this.portUp(device, port.name) ? this.pairState(device, port) : 'down';
        states.set(`${device.id}|${port.name}`, state);
        if (state === 'bundled') groups.set(port.channelGroup, [...(groups.get(port.channelGroup) ?? []), port]);
      }
      for (const members of groups.values()) {
        const primary = [...members].sort((a, b) => (this.link(device.id, a.name)?.id ?? '').localeCompare(this.link(device.id, b.name)?.id ?? ''))[0];
        states.set(`${device.id}|${primary.name}`, 'primary');
      }
    }
    return states;
  }

  vlanExists(device: Device, vlan: number): boolean {
    if (device.kind === 'ap') return true;
    return device.vlans.some((v) => v.id === vlan);
  }

  portCarriesVlan(port: Port, vlan: number): boolean {
    if (!port.switchport) return false;
    if (port.mode === 'access') return port.accessVlan === vlan;
    return vlanAllowed(port, vlan);
  }

  forwardingPorts(device: Device, vlan: number): Port[] {
    return this.allPorts(device).filter(
      (port) =>
        port.switchport &&
        this.portCarriesVlan(port, vlan) &&
        this.portUp(device, port.name) &&
        !this.memberInactive(device.id, port.name) &&
        !this.stpBlocked(device.id, port.name),
    );
  }

  sviUp(device: Device, vif: VirtualIf): boolean {
    if (vif.shutdown || !this.isPowered(device)) return false;
    if (!this.vlanExists(device, vif.vlan)) return false;
    return this.forwardingPorts(device, vif.vlan).length > 0;
  }

  l3Ifs(device: Device): L3If[] {
    const cached = this.l3Cache.get(device.id);
    if (cached) return cached;
    const list: L3If[] = [];
    const zoneNat = (zone: string): NatRole => (zone === 'outside' ? 'outside' : zone ? 'inside' : '');
    for (const port of device.ports) {
      if (port.switchport) continue;
      list.push({
        name: port.name,
        cfg: port,
        ip: parseIp(port.ip),
        prefix: port.prefix,
        mac: port.mac,
        attach: { kind: 'port', port: port.name },
        up: this.portUp(device, port.name),
        nat: device.kind === 'firewall' ? zoneNat(port.zone) : port.nat,
        zone: port.zone,
      });
    }
    for (const vif of device.vifs) {
      if (vif.kind === 'sub') {
        const parent = device.ports.find((p) => p.name === vif.parent);
        if (!parent || parent.switchport) continue;
        list.push({
          name: vif.name,
          cfg: vif,
          ip: parseIp(vif.ip),
          prefix: vif.prefix,
          mac: parent.mac,
          attach: { kind: 'sub', port: parent.name, vlan: vif.vlan },
          up: !vif.shutdown && vif.vlan > 0 && this.portUp(device, parent.name),
          nat: vif.nat,
          zone: '',
        });
      } else if (vif.kind === 'svi') {
        list.push({
          name: vif.name,
          cfg: vif,
          ip: parseIp(vif.ip),
          prefix: vif.prefix,
          mac: device.baseMac,
          attach: { kind: 'svi', vlan: vif.vlan },
          up: this.sviUp(device, vif),
          nat: vif.nat,
          zone: '',
        });
      } else {
        list.push({
          name: vif.name,
          cfg: vif,
          ip: parseIp(vif.ip),
          prefix: vif.prefix,
          mac: device.baseMac,
          attach: { kind: 'loop' },
          up: !vif.shutdown,
          nat: vif.nat,
          zone: '',
        });
      }
    }
    this.l3Cache.set(device.id, list);
    return list;
  }

  l3If(device: Device, name: string): L3If | undefined {
    return this.l3Ifs(device).find((entry) => entry.name === name);
  }

  ownsIp(device: Device, ip: number): L3If | undefined {
    const ifs = this.l3Ifs(device);
    return ifs.find((entry) => entry.ip === ip && entry.up) ?? ifs.find((entry) => this.virtualFor(device, entry)?.ip === ip);
  }

  fhrpOf(device: Device, entry: L3If): FhrpState | undefined {
    return this.fhrpStates().get(`${device.id}|${entry.name}`);
  }

  virtualFor(device: Device, entry: L3If): { ip: number; mac: string } | null {
    const state = this.fhrpOf(device, entry);
    return state?.active ? { ip: state.vip, mac: state.vmac } : null;
  }

  private fhrpStates(): Map<string, FhrpState> {
    if (this.fhrpCache) return this.fhrpCache;
    const states = new Map<string, FhrpState>();
    this.fhrpCache = states;
    const candidates: { device: Device; entry: L3If; vip: number; priority: number }[] = [];
    for (const device of this.net.devices) {
      if ((device.kind !== 'router' && device.kind !== 'l3switch') || !this.isPowered(device)) continue;
      for (const entry of this.l3Ifs(device)) {
        const group = entry.cfg.fhrp;
        if (!group || !entry.up || entry.ip === null || entry.attach.kind === 'loop') continue;
        const vip = parseIp(group.ip);
        if (vip === null || !inSubnet(vip, entry.ip, entry.prefix)) continue;
        candidates.push({ device, entry, vip, priority: vip === entry.ip ? 255 : group.priority });
      }
    }
    for (const candidate of candidates) {
      const group = candidate.entry.cfg.fhrp!;
      const reach = this.l2Reach(candidate.device, candidate.entry);
      const members = candidates.filter((other) => {
        const otherGroup = other.entry.cfg.fhrp!;
        if (otherGroup.proto !== group.proto || otherGroup.group !== group.group || other.vip !== candidate.vip) return false;
        return other === candidate || reach.has(`${other.device.id}|${other.entry.name}`);
      });
      members.sort((a, b) => b.priority - a.priority || b.entry.ip! - a.entry.ip!);
      states.set(`${candidate.device.id}|${candidate.entry.name}`, {
        proto: group.proto,
        group: group.group,
        vip: candidate.vip,
        vmac: virtualMac(group.proto, group.group),
        priority: candidate.priority,
        preempt: group.preempt,
        active: members[0] === candidate,
        activeIp: members[0].entry.ip!,
        standbyIp: members.find((m) => m !== members[0])?.entry.ip ?? null,
      });
    }
    return states;
  }

  routes(device: Device): Route[] {
    const cached = this.routeCache.get(device.id);
    if (cached) return cached;
    const all: Route[] = [];
    const ifs = this.l3Ifs(device).filter((entry) => entry.up && entry.ip !== null);
    for (const entry of ifs) {
      all.push({
        code: 'C',
        net: networkOf(entry.ip!, entry.prefix),
        prefix: entry.prefix,
        ad: 0,
        metric: 0,
        via: null,
        ifName: entry.name,
        isDefault: false,
      });
      if (!isHost(device.kind) && entry.prefix < 32) {
        all.push({ code: 'L', net: entry.ip!, prefix: 32, ad: 0, metric: 0, via: null, ifName: entry.name, isDefault: false });
      }
    }
    const routing = this.isRouting(device);
    if (routing) {
      for (const route of device.routes) {
        const net = parseIp(route.net);
        if (net === null) continue;
        const via = route.via ? parseIp(route.via) : null;
        if (route.iface) {
          const exit = ifs.find((entry) => entry.name === route.iface);
          if (!exit) continue;
          all.push({ code: 'S', net: networkOf(net, route.prefix), prefix: route.prefix, ad: route.ad, metric: 0, via, ifName: exit.name, isDefault: route.prefix === 0 });
        } else if (via !== null) {
          all.push({ code: 'S', net: networkOf(net, route.prefix), prefix: route.prefix, ad: route.ad, metric: 0, via, ifName: '', isDefault: route.prefix === 0 });
        }
      }
      for (const entry of this.l3Ifs(device)) {
        const cfg = entry.cfg as Port;
        if (!entry.up || !('dhcp' in cfg) || !cfg.dhcp || !cfg.gateway) continue;
        const gw = parseIp(cfg.gateway);
        if (gw === null) continue;
        all.push({ code: 'S', net: 0, prefix: 0, ad: 254, metric: 0, via: gw, ifName: entry.name, isDefault: true });
      }
      const ospf = this.ospf().routes.get(device.id) ?? [];
      all.push(...ospf);
    } else {
      const gateway = this.hostGateway(device);
      if (gateway) all.push({ code: 'S', net: 0, prefix: 0, ad: 1, metric: 0, via: gateway.via, ifName: gateway.ifName, isDefault: true });
    }
    const best = new Map<string, Route>();
    for (const route of all) {
      const key = `${route.net}/${route.prefix}`;
      const current = best.get(key);
      if (!current || route.ad < current.ad || (route.ad === current.ad && route.metric < current.metric)) best.set(key, route);
    }
    const locals = all.filter((r) => r.code === 'L');
    const result = [...best.values()].filter((r) => r.code !== 'L');
    const merged = [...result, ...locals.filter((l) => !result.some((r) => r.net === l.net && r.prefix === 32))];
    const usable = merged.filter((route) => route.code === 'C' || route.code === 'L' || this.resolveVia(device, route, merged, 0) !== null);
    usable.sort((a, b) => a.net - b.net || a.prefix - b.prefix);
    this.routeCache.set(device.id, usable);
    return usable;
  }

  isRouting(device: Device): boolean {
    if (isHost(device.kind)) return false;
    if (device.kind === 'switch' || device.kind === 'ap') return false;
    return device.ipRouting;
  }

  hostGateway(device: Device): { via: number; ifName: string } | null {
    if (device.kind === 'switch' || device.kind === 'l3switch' || device.kind === 'ap') {
      const via = parseIp(device.defaultGateway);
      if (via === null) return null;
      const entry = this.l3Ifs(device).find((e) => e.up && e.ip !== null && inSubnet(via, e.ip, e.prefix));
      return entry ? { via, ifName: entry.name } : null;
    }
    for (const entry of this.l3Ifs(device)) {
      const cfg = entry.cfg as Port;
      if (!entry.up || entry.ip === null || !cfg.gateway) continue;
      const via = parseIp(cfg.gateway);
      if (via === null) continue;
      if (inSubnet(via, entry.ip, entry.prefix)) return { via, ifName: entry.name };
    }
    return null;
  }

  private resolveVia(device: Device, route: Route, table: Route[], depth: number): { ifName: string; nextHop: number | null } | null {
    if (route.code === 'C' || route.code === 'L') return { ifName: route.ifName, nextHop: null };
    if (route.ifName && route.via === null) return { ifName: route.ifName, nextHop: null };
    if (route.via === null) return null;
    if (route.ifName) return { ifName: route.ifName, nextHop: route.via };
    if (depth > 4) return null;
    const candidate = this.longestMatch(table.filter((r) => r !== route), route.via);
    if (!candidate) return null;
    const resolved = this.resolveVia(device, candidate, table, depth + 1);
    if (!resolved) return null;
    return { ifName: resolved.ifName, nextHop: resolved.nextHop ?? route.via };
  }

  private longestMatch(table: Route[], dst: number): Route | null {
    let best: Route | null = null;
    for (const route of table) {
      if (!inSubnet(dst, route.net, route.prefix)) continue;
      if (!best || route.prefix > best.prefix) best = route;
    }
    return best;
  }

  lookup(device: Device, dst: number): { route: Route; ifName: string; nextHop: number } | null {
    const table = this.routes(device);
    const route = this.longestMatch(table, dst);
    if (!route) return null;
    const resolved = this.resolveVia(device, route, table, 0);
    if (!resolved) return null;
    return { route, ifName: resolved.ifName, nextHop: resolved.nextHop ?? dst };
  }

  stpBlocked(dev: string, port: string): boolean {
    const info = this.stp().get(dev);
    return info?.ports.get(port)?.role === 'alternate';
  }

  stpInfo(dev: string): StpBridgeInfo | undefined {
    return this.stp().get(dev);
  }

  private isBridge(device: Device): boolean {
    return device.kind === 'switch' || device.kind === 'l3switch' || device.kind === 'homeRouter';
  }

  private stp(): Map<string, StpBridgeInfo> {
    if (this.stpCache) return this.stpCache;
    const bridges = this.net.devices.filter((d) => this.isBridge(d) && this.isPowered(d));
    const result = new Map<string, StpBridgeInfo>();
    const physUp = (device: Device, port: Port) => {
      if (adminDown(port) || this.memberInactive(device.id, port.name)) return false;
      const end = this.peer(device.id, port.name);
      if (!end) return false;
      const peerDevice = this.devices.get(end.dev);
      const peerPort = peerDevice && this.port(peerDevice, end.port);
      return Boolean(peerDevice && peerPort && !adminDown(peerPort) && this.isPowered(peerDevice));
    };
    const visited = new Set<string>();
    for (const start of bridges) {
      if (visited.has(start.id)) continue;
      const component: Device[] = [];
      const stack = [start];
      visited.add(start.id);
      while (stack.length) {
        const current = stack.pop()!;
        component.push(current);
        for (const port of current.ports) {
          if (!port.switchport || !physUp(current, port)) continue;
          const end = this.peer(current.id, port.name)!;
          const next = this.devices.get(end.dev)!;
          const nextPort = this.port(next, end.port);
          if (!this.isBridge(next) || !nextPort?.switchport || visited.has(next.id)) continue;
          visited.add(next.id);
          stack.push(next);
        }
      }
      const root = component.reduce((a, b) => (bridgeId(a) <= bridgeId(b) ? a : b));
      const dist = new Map<string, number>([[root.id, 0]]);
      const queue = [root];
      const settled = new Set<string>();
      while (queue.length) {
        queue.sort((a, b) => dist.get(a.id)! - dist.get(b.id)! || bridgeId(a).localeCompare(bridgeId(b)));
        const current = queue.shift()!;
        if (settled.has(current.id)) continue;
        settled.add(current.id);
        for (const port of current.ports) {
          if (!port.switchport || !physUp(current, port)) continue;
          const end = this.peer(current.id, port.name)!;
          const next = this.devices.get(end.dev)!;
          const nextPort = this.port(next, end.port);
          if (!this.isBridge(next) || !nextPort?.switchport) continue;
          const cost = dist.get(current.id)! + stpCost(this.linkSpeed(current, port.name));
          if (!dist.has(next.id) || cost < dist.get(next.id)!) {
            dist.set(next.id, cost);
            queue.push(next);
          }
        }
      }
      for (const bridge of component) {
        const info: StpBridgeInfo = {
          rootId: bridgeId(root),
          rootCost: dist.get(bridge.id) ?? 0,
          bridgeId: bridgeId(bridge),
          isRoot: bridge.id === root.id,
          rootPort: null,
          ports: new Map(),
        };
        if (bridge.id !== root.id) {
          let best: { port: string; key: string } | null = null;
          for (const port of bridge.ports) {
            if (!port.switchport || !physUp(bridge, port)) continue;
            const end = this.peer(bridge.id, port.name)!;
            const next = this.devices.get(end.dev)!;
            const nextPort = this.port(next, end.port);
            if (!this.isBridge(next) || !nextPort?.switchport || !dist.has(next.id)) continue;
            const cost = dist.get(next.id)! + stpCost(this.linkSpeed(bridge, port.name));
            const key = `${cost.toString().padStart(6, '0')}|${bridgeId(next)}|${end.port}`;
            if (!best || key < best.key) best = { port: port.name, key };
          }
          info.rootPort = best?.port ?? null;
        }
        result.set(bridge.id, info);
      }
      for (const bridge of component) {
        const info = result.get(bridge.id)!;
        for (const port of bridge.ports) {
          if (!port.switchport || !physUp(bridge, port)) continue;
          const cost = stpCost(this.linkSpeed(bridge, port.name));
          if (port.name === info.rootPort) {
            info.ports.set(port.name, { role: 'root', cost });
            continue;
          }
          const end = this.peer(bridge.id, port.name)!;
          const next = this.devices.get(end.dev)!;
          const nextPort = this.port(next, end.port);
          if (!this.isBridge(next) || !nextPort?.switchport || !result.has(next.id)) {
            info.ports.set(port.name, { role: 'designated', cost });
            continue;
          }
          const mine = `${info.rootCost.toString().padStart(6, '0')}|${info.bridgeId}|${port.name}`;
          const nextInfo = result.get(next.id)!;
          const theirs = `${nextInfo.rootCost.toString().padStart(6, '0')}|${nextInfo.bridgeId}|${end.port}`;
          const nextIsRootPortHere = nextInfo.rootPort === end.port;
          const designated = nextIsRootPortHere || mine < theirs;
          info.ports.set(port.name, { role: designated ? 'designated' : 'alternate', cost });
        }
      }
    }
    this.stpCache = result;
    return result;
  }

  l2Reach(device: Device, entry: L3If): Set<string> {
    const reached = new Set<string>();
    const seen = new Set<string>();
    const queue: { dev: Device; port: string; vlan: number | null }[] = [];
    const emitFrom = (dev: Device, attach: L3Attach) => {
      if (attach.kind === 'port') queue.push({ dev, port: attach.port, vlan: null });
      else if (attach.kind === 'sub') queue.push({ dev, port: attach.port, vlan: attach.vlan });
      else if (attach.kind === 'svi') {
        for (const port of this.forwardingPorts(dev, attach.vlan)) queue.push({ dev, port: port.name, vlan: this.egressTag(port, attach.vlan) });
      }
    };
    emitFrom(device, entry.attach);
    while (queue.length) {
      const { dev, port, vlan } = queue.shift()!;
      if (!this.portUp(dev, port)) continue;
      const end = this.peer(dev.id, port)!;
      const key = `${end.dev}|${end.port}|${vlan}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const next = this.devices.get(end.dev)!;
      const nextPort = this.port(next, end.port)!;
      if (nextPort.switchport) {
        if (this.stpBlocked(next.id, nextPort.name) || this.memberInactive(next.id, nextPort.name)) continue;
        const ingress = this.ingressVlan(next, nextPort, vlan);
        if (ingress === null) continue;
        for (const out of this.forwardingPorts(next, ingress)) {
          if (out.name === nextPort.name) continue;
          queue.push({ dev: next, port: out.name, vlan: this.egressTag(out, ingress) });
        }
        for (const target of this.l3Ifs(next)) {
          if (target.attach.kind === 'svi' && target.attach.vlan === ingress && target.up) reached.add(`${next.id}|${target.name}`);
        }
      } else {
        for (const target of this.l3Ifs(next)) {
          if (!target.up) continue;
          if (vlan === null && target.attach.kind === 'port' && target.attach.port === nextPort.name) reached.add(`${next.id}|${target.name}`);
          if (vlan !== null && target.attach.kind === 'sub' && target.attach.port === nextPort.name && target.attach.vlan === vlan) {
            reached.add(`${next.id}|${target.name}`);
          }
        }
      }
    }
    return reached;
  }

  ingressVlan(device: Device, port: Port, tag: number | null): number | null {
    let vlan: number;
    if (port.mode === 'access') {
      if (tag !== null) return null;
      vlan = port.accessVlan;
    } else {
      vlan = tag ?? port.nativeVlan;
      if (!vlanAllowed(port, vlan)) return null;
    }
    if (!this.vlanExists(device, vlan)) return null;
    return vlan;
  }

  egressTag(port: Port, vlan: number): number | null {
    if (port.mode === 'access') return null;
    return vlan === port.nativeVlan ? null : vlan;
  }

  routerId(device: Device): number {
    const configured = device.ospf?.routerId ? parseIp(device.ospf.routerId) : null;
    if (configured !== null) return configured;
    const ifs = this.l3Ifs(device).filter((e) => e.ip !== null && e.up);
    const loops = ifs.filter((e) => e.attach.kind === 'loop');
    const pool = loops.length ? loops : ifs;
    return pool.reduce((max, e) => Math.max(max, e.ip!), 0);
  }

  ospfIfs(device: Device): { entry: L3If; area: number; passive: boolean; cost: number }[] {
    const ospf = device.ospf;
    if (!ospf) return [];
    const result: { entry: L3If; area: number; passive: boolean; cost: number }[] = [];
    for (const entry of this.l3Ifs(device)) {
      if (!entry.up || entry.ip === null) continue;
      const statement = ospf.networks.find((n) => {
        const net = parseIp(n.net);
        const prefix = wildcardToPrefix(n.wildcard);
        if (net === null) return false;
        if (prefix !== null) return inSubnet(entry.ip!, net, prefix);
        const wildcard = parseIp(n.wildcard) ?? 0;
        const care = ~wildcard >>> 0;
        return ((entry.ip! & care) >>> 0) === ((net & care) >>> 0);
      });
      if (!statement) continue;
      const speed = entry.attach.kind === 'port' || entry.attach.kind === 'sub' ? this.linkSpeed(device, entry.attach.port) : 1000;
      const cost = entry.attach.kind === 'loop' ? 1 : ospfCost(ospf.refBw, speed || 1000, entry.cfg.ospfCost);
      result.push({
        entry,
        area: statement.area,
        passive: ospf.passive.includes(entry.name) || entry.attach.kind === 'loop',
        cost,
      });
    }
    return result;
  }

  ospf(): { routes: Map<string, Route[]>; neighbors: Map<string, OspfNeighbor[]> } {
    if (this.ospfCache) return this.ospfCache;
    const routes = new Map<string, Route[]>();
    const neighbors = new Map<string, OspfNeighbor[]>();
    this.ospfCache = { routes, neighbors };
    const routers = this.net.devices.filter((d) => d.ospf && this.isRouting(d) && this.isPowered(d));
    const ifsOf = new Map(routers.map((r) => [r.id, this.ospfIfs(r)]));
    const edges = new Map<string, { to: string; cost: number; ifName: string; via: number }[]>();
    for (const r of routers) edges.set(r.id, []);
    for (const a of routers) {
      for (const ia of ifsOf.get(a.id)!) {
        if (ia.passive) continue;
        const reach = this.l2Reach(a, ia.entry);
        const segment: { dev: Device; ip: number; rid: number }[] = [{ dev: a, ip: ia.entry.ip!, rid: this.routerId(a) }];
        for (const b of routers) {
          if (b.id === a.id) continue;
          for (const ib of ifsOf.get(b.id)!) {
            if (ib.passive || ib.area !== ia.area) continue;
            if (networkOf(ib.entry.ip!, ib.entry.prefix) !== networkOf(ia.entry.ip!, ia.entry.prefix) || ib.entry.prefix !== ia.entry.prefix) continue;
            if (!reach.has(`${b.id}|${ib.entry.name}`)) continue;
            edges.get(a.id)!.push({ to: b.id, cost: ia.cost, ifName: ia.entry.name, via: ib.entry.ip! });
            segment.push({ dev: b, ip: ib.entry.ip!, rid: this.routerId(b) });
          }
        }
        const ranked = [...segment].sort((x, y) => y.rid - x.rid);
        const list = neighbors.get(a.id) ?? [];
        for (const member of segment.slice(1)) {
          const rank = ranked.findIndex((m) => m.dev.id === member.dev.id);
          list.push({
            routerId: ipStr(member.rid),
            peerDev: member.dev.id,
            address: member.ip,
            ifName: ia.entry.name,
            state: rank === 0 ? 'FULL/DR' : rank === 1 ? 'FULL/BDR' : 'FULL/DROTHER',
          });
        }
        neighbors.set(a.id, list);
      }
    }
    for (const source of routers) {
      const dist = new Map<string, number>([[source.id, 0]]);
      const first = new Map<string, { ifName: string; via: number }>();
      const done = new Set<string>();
      while (true) {
        let current: string | null = null;
        for (const [id, d] of dist) if (!done.has(id) && (current === null || d < dist.get(current)!)) current = id;
        if (current === null) break;
        done.add(current);
        for (const edge of edges.get(current) ?? []) {
          const cost = dist.get(current)! + edge.cost;
          if (!dist.has(edge.to) || cost < dist.get(edge.to)!) {
            dist.set(edge.to, cost);
            first.set(edge.to, current === source.id ? { ifName: edge.ifName, via: edge.via } : first.get(current)!);
          }
        }
      }
      const learned = new Map<string, Route>();
      for (const target of routers) {
        if (target.id === source.id || !dist.has(target.id)) continue;
        const hop = first.get(target.id)!;
        for (const oi of ifsOf.get(target.id)!) {
          const net = networkOf(oi.entry.ip!, oi.entry.prefix);
          const prefix = oi.entry.attach.kind === 'loop' ? 32 : oi.entry.prefix;
          const routeNet = oi.entry.attach.kind === 'loop' ? oi.entry.ip! : net;
          const key = `${routeNet}/${prefix}`;
          const metric = dist.get(target.id)! + oi.cost;
          const existing = learned.get(key);
          if (existing && existing.metric <= metric) continue;
          learned.set(key, { code: 'O', net: routeNet, prefix, ad: 110, metric, via: hop.via, ifName: hop.ifName, isDefault: false });
        }
        if (target.ospf?.defaultOriginate && this.hasStaticDefault(target)) {
          const key = '0/0';
          if (!learned.has(key)) learned.set(key, { code: 'E2', net: 0, prefix: 0, ad: 110, metric: 1, via: hop.via, ifName: hop.ifName, isDefault: true });
        }
      }
      routes.set(source.id, [...learned.values()]);
    }
    return this.ospfCache;
  }

  private hasStaticDefault(device: Device): boolean {
    if (device.routes.some((r) => r.prefix === 0)) return true;
    return device.ports.some((p) => !p.switchport && p.dhcp && Boolean(p.gateway));
  }
}

function ipStr(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

export function deviceName(net: Network, id: string): string {
  return findDevice(net, id)?.name ?? id;
}
