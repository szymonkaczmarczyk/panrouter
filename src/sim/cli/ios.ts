import { l, type L10n, type Lang } from '../../i18n/l10n';
import { ANY, hostSpec } from '../acl';
import type { Simulator } from '../engine';
import { broadcastOf, ipToStr, maskToPrefix, networkOf, parseIp } from '../ip';
import { blankVif } from '../network';
import type { Acl, AclEntry, AddrSpec, ChannelMode, Device, FhrpGroup, FhrpProto, Port, PortMatch, VirtualIf, ViolationMode } from '../types';
import { resolveIface } from './iface';
import { buildTrie, completeLine, helpFor, parse, tokenize, type Args, type CommandDef, type Mode, type TrieNode } from './parser';
import * as show from './show';

export interface CliSession {
  deviceId: string;
  mode: Mode;
  ifaces: string[];
  vlans: number[];
  pool: string;
  acl: string;
  line: 'vty' | 'console';
  awaiting: '' | 'enable';
  history: string[];
}

export interface CliResult {
  lines: string[];
  changed: boolean;
  secret: boolean;
}

interface Ctx {
  sim: Simulator;
  device: Device;
  session: CliSession;
  out: string[];
  changed: boolean;
}

export function newSession(deviceId: string): CliSession {
  return { deviceId, mode: 'user', ifaces: [], vlans: [], pool: '', acl: '', line: 'vty', awaiting: '', history: [] };
}

const MODE_SUFFIX: Record<Mode, string> = {
  user: '>',
  priv: '#',
  config: '(config)#',
  if: '(config-if)#',
  'if-range': '(config-if-range)#',
  subif: '(config-subif)#',
  vlan: '(config-vlan)#',
  router: '(config-router)#',
  dhcp: '(dhcp-config)#',
  'std-acl': '(config-std-nacl)#',
  'ext-acl': '(config-ext-nacl)#',
  line: '(config-line)#',
};

export function cliPrompt(device: Device, session: CliSession): string {
  return `${device.name}${MODE_SUFFIX[session.mode]}`;
}

const SWITCHES = ['switch', 'l3switch'] as const;
const ROUTERS = ['router', 'l3switch'] as const;
const IF_MODES: Mode[] = ['if', 'if-range', 'subif'];
const CONFIG_SUBMODES: Mode[] = ['if', 'if-range', 'subif', 'vlan', 'router', 'dhcp', 'std-acl', 'ext-acl', 'line'];
const SHOW_MODES: Mode[] = ['user', 'priv'];

function err(ctx: Ctx, text: string): void {
  ctx.out.push(text);
}

function mark(ctx: Ctx): void {
  ctx.changed = true;
}

function targetsL3(ctx: Ctx): (Port | VirtualIf)[] {
  const list: (Port | VirtualIf)[] = [];
  for (const name of ctx.session.ifaces) {
    const vif = ctx.device.vifs.find((v) => v.name === name);
    if (vif) list.push(vif);
    else {
      const port = ctx.device.ports.find((p) => p.name === name);
      if (port) list.push(port);
    }
  }
  return list;
}

function targetPorts(ctx: Ctx): Port[] {
  return ctx.session.ifaces.map((name) => ctx.device.ports.find((p) => p.name === name)).filter((p): p is Port => Boolean(p));
}

function ensureVlan(device: Device, id: number): boolean {
  if (device.vlans.some((v) => v.id === id)) return false;
  device.vlans.push({ id, name: `VLAN${String(id).padStart(4, '0')}` });
  device.vlans.sort((a, b) => a.id - b.id);
  return true;
}

function setIp(ctx: Ctx, ipText: string, maskText: string): void {
  const ip = parseIp(ipText)!;
  const mask = parseIp(maskText)!;
  const prefix = maskToPrefix(mask);
  if (prefix === null || prefix === 0) {
    return err(ctx, `% Bad mask 0x${mask.toString(16).toUpperCase()} for address ${ipText}`);
  }
  if (prefix < 31 && (ip === networkOf(ip, prefix) || ip === broadcastOf(ip, prefix))) {
    return err(ctx, `Bad mask /${prefix} for address ${ipText}`);
  }
  for (const target of targetsL3(ctx)) {
    if ('switchport' in target && target.switchport) {
      err(ctx, '% IP addresses may not be configured on L2 links.');
      continue;
    }
    const others = ctx.sim.topo.l3Ifs(ctx.device).filter((e) => e.name !== target.name && e.ip !== null);
    const overlap = others.find((e) => networkOf(e.ip!, Math.min(e.prefix, prefix)) === networkOf(ip, Math.min(e.prefix, prefix)));
    if (overlap && ctx.device.kind !== 'switch') {
      err(ctx, `% ${ipToStr(networkOf(ip, prefix))} overlaps with ${overlap.name}`);
      continue;
    }
    target.ip = ipText;
    target.prefix = prefix;
    if ('dhcp' in target) target.dhcp = false;
    mark(ctx);
  }
}

function parsePortSpec(tokens: string[], index: number): { match: PortMatch | null; next: number } | null {
  const op = tokens[index]?.toLowerCase();
  if (!op || !['eq', 'gt', 'lt', 'neq', 'range'].includes(op)) return { match: null, next: index };
  const a = portNumber(tokens[index + 1]);
  if (a === null) return null;
  if (op === 'range') {
    const b = portNumber(tokens[index + 2]);
    if (b === null) return null;
    return { match: { op: 'range', a, b }, next: index + 3 };
  }
  return { match: { op: op as PortMatch['op'], a, b: 0 }, next: index + 2 };
}

const PORT_NAMES: Record<string, number> = {
  www: 80,
  http: 80,
  https: 443,
  domain: 53,
  ftp: 21,
  ssh: 22,
  telnet: 23,
  smtp: 25,
  ntp: 123,
  snmp: 161,
  bootps: 67,
  bootpc: 68,
  tftp: 69,
  syslog: 514,
};

function portNumber(text: string | undefined): number | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower in PORT_NAMES) return PORT_NAMES[lower];
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= 0 && n <= 65535 ? n : null;
}

function parseAddr(tokens: string[], index: number): { spec: AddrSpec; next: number } | null {
  const token = tokens[index]?.toLowerCase();
  if (!token) return null;
  if (token === 'any') return { spec: ANY, next: index + 1 };
  if (token === 'host') {
    const ip = tokens[index + 1];
    if (!ip || parseIp(ip) === null) return null;
    return { spec: hostSpec(ip), next: index + 2 };
  }
  if (parseIp(token) === null) return null;
  const wild = tokens[index + 1];
  if (!wild || parseIp(wild) === null) return null;
  return { spec: { any: false, ip: token, wildcard: wild }, next: index + 2 };
}

function parseExtended(action: 'permit' | 'deny', proto: AclEntry['proto'], rest: string): AclEntry | null {
  const tokens = rest.trim().split(/\s+/).filter(Boolean);
  const src = parseAddr(tokens, 0);
  if (!src) return null;
  let index = src.next;
  let srcPort: PortMatch | null = null;
  if (proto === 'tcp' || proto === 'udp') {
    const parsed = parsePortSpec(tokens, index);
    if (!parsed) return null;
    srcPort = parsed.match;
    index = parsed.next;
  }
  const dst = parseAddr(tokens, index);
  if (!dst) return null;
  index = dst.next;
  let dstPort: PortMatch | null = null;
  let icmpType: AclEntry['icmpType'] = '';
  if (proto === 'tcp' || proto === 'udp') {
    const parsed = parsePortSpec(tokens, index);
    if (!parsed) return null;
    dstPort = parsed.match;
    index = parsed.next;
  } else if (proto === 'icmp' && tokens[index]) {
    const type = tokens[index].toLowerCase();
    if (!['echo', 'echo-reply', 'unreachable', 'time-exceeded'].includes(type)) return null;
    icmpType = type as AclEntry['icmpType'];
    index++;
  }
  while (index < tokens.length && ['log', 'established'].includes(tokens[index].toLowerCase())) index++;
  if (index !== tokens.length) return null;
  return { action, proto, src: src.spec, dst: dst.spec, srcPort, dstPort, icmpType, remark: '' };
}

function standardEntry(action: 'permit' | 'deny', spec: AddrSpec): AclEntry {
  return { action, proto: 'ip', src: spec, dst: ANY, srcPort: null, dstPort: null, icmpType: '', remark: '' };
}

function aclFor(device: Device, name: string, type: Acl['type']): Acl {
  let acl = device.acls.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (!acl) {
    acl = { name, type, entries: [] };
    device.acls.push(acl);
  }
  return acl;
}

function addToAcl(ctx: Ctx, name: string, type: Acl['type'], entry: AclEntry): void {
  const acl = aclFor(ctx.device, name, type);
  if (acl.type !== type) return err(ctx, `% Access-list type conflicts with prior definition`);
  acl.entries.push(entry);
  mark(ctx);
}

function wildFromArgs(args: Args): AddrSpec {
  const wild = (args.wc as string | undefined) ?? '0.0.0.0';
  return { any: false, ip: args.src as string, wildcard: wild };
}

function pingOutput(ctx: Ctx, target: string, count = 5): void {
  const dst = parseIp(target)!;
  ctx.out.push('Type escape sequence to abort.', `Sending ${count}, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`);
  let marks = '';
  const rtts: number[] = [];
  for (let i = 0; i < count; i++) {
    const result = ctx.sim.echo(ctx.device.id, dst);
    if (result.outcome === 'reply') {
      marks += '!';
      rtts.push(Math.max(1, Math.round(result.rtt)));
    } else if (result.outcome === 'net-unreachable' || result.outcome === 'host-unreachable' || result.outcome === 'admin-prohibited') marks += 'U';
    else if (result.outcome === 'ttl-expired') marks += '&';
    else marks += '.';
  }
  ctx.out.push(marks);
  const success = rtts.length;
  const percent = Math.round((success / count) * 100);
  if (success) {
    const min = Math.min(...rtts);
    const max = Math.max(...rtts);
    const avg = Math.round(rtts.reduce((a, b) => a + b, 0) / success);
    ctx.out.push(`Success rate is ${percent} percent (${success}/${count}), round-trip min/avg/max = ${min}/${avg}/${max} ms`);
  } else ctx.out.push(`Success rate is 0 percent (0/${count})`);
}

function tracerouteOutput(ctx: Ctx, target: string): void {
  const dst = parseIp(target)!;
  ctx.out.push('Type escape sequence to abort.', `Tracing the route to ${target}`, 'VRF info: (vrf in name/id, vrf out name/id)');
  const hops = ctx.sim.traceroute(ctx.device.id, dst);
  hops.forEach((hop, index) => {
    const n = String(index + 1).padStart(3);
    if (hop.from === null) ctx.out.push(`${n} *  *  *`);
    else {
      const ms = Math.max(1, Math.round(hop.rtt));
      const flag = hop.outcome === 'net-unreachable' || hop.outcome === 'host-unreachable' ? ' !H' : hop.outcome === 'admin-prohibited' ? ' !A' : '';
      ctx.out.push(`${n} ${ipToStr(hop.from)} ${ms} msec ${ms} msec ${ms} msec${flag}`);
    }
  });
}

function saveConfig(ctx: Ctx): void {
  ctx.out.push('Building configuration...', '[OK]');
  ctx.device.startup = show.runningConfig(ctx.sim, ctx.device).join('\n');
  mark(ctx);
}

const defs: CommandDef<Ctx>[] = [];

function def(modes: Mode[], pattern: string, run: (ctx: Ctx, args: Args) => void, kinds?: Device['kind'][]): void {
  defs.push({ modes, pattern, run, kinds });
}

def(['user'], 'enable', (ctx) => {
  if (ctx.device.mgmt.enableSecret) {
    ctx.session.awaiting = 'enable';
    ctx.out.push('Password: ');
    return;
  }
  ctx.session.mode = 'priv';
});
def(['priv'], 'enable', () => {});
def(['priv'], 'disable', (ctx) => {
  ctx.session.mode = 'user';
});
for (const word of ['exit', 'logout']) {
  def(['user', 'priv'], word, (ctx) => {
    ctx.session.mode = 'user';
    ctx.out.push('', `${ctx.device.name} con0 is now available`, '', 'Press RETURN to get started.');
  });
}
def(['priv'], 'configure terminal', (ctx) => {
  ctx.session.mode = 'config';
  ctx.out.push('Enter configuration commands, one per line.  End with CNTL/Z.');
});
def(['priv'], 'copy running-config startup-config', (ctx) => {
  ctx.out.push('Destination filename [startup-config]? ');
  saveConfig(ctx);
});
def(['priv'], 'write memory', saveConfig);
def(['priv'], 'write', saveConfig);
def(['priv'], 'erase startup-config', (ctx) => {
  ctx.device.startup = '';
  ctx.out.push('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]', '[OK]', 'Erase of nvram: complete');
  mark(ctx);
});
def(['priv'], 'clear arp-cache', (ctx) => ctx.sim.clearArp(ctx.device));
def(['priv'], 'clear mac address-table dynamic', (ctx) => ctx.sim.clearMac(ctx.device), [...SWITCHES]);
def(['priv'], 'clear ip nat translation *', (ctx) => ctx.sim.clearNat(ctx.device), ['router']);
def(['user', 'priv'], 'terminal length <num:n:0-512>', () => {});
def(['user', 'priv'], 'ping <ip:target>', (ctx, a) => pingOutput(ctx, a.target as string));
def(['user', 'priv'], 'ping <ip:target> repeat <num:count:1-100>', (ctx, a) => pingOutput(ctx, a.target as string, a.count as number));
def(['user', 'priv'], 'traceroute <ip:target>', (ctx, a) => tracerouteOutput(ctx, a.target as string));

const showDefs: [string, (ctx: Ctx, args: Args) => string[], Device['kind'][]?, Mode[]?][] = [
  ['show running-config', (c) => show.runningConfig(c.sim, c.device), undefined, ['priv']],
  ['show startup-config', (c) => (c.device.startup ? c.device.startup.split('\n') : ['startup-config is not present']), undefined, ['priv']],
  ['show ip interface brief', (c) => show.showIpIntBrief(c.sim, c.device)],
  ['show interfaces', (c) => [...c.device.ports.map((p) => p.name), ...c.device.vifs.map((v) => v.name)].flatMap((name) => show.showInterface(c.sim, c.device, name))],
  ['show interfaces <iface:if>', (c, a) => show.showInterface(c.sim, c.device, a.if as string)],
  ['show interfaces status', (c) => show.showInterfacesStatus(c.sim, c.device), [...SWITCHES]],
  ['show interfaces trunk', (c) => show.showInterfacesTrunk(c.sim, c.device), [...SWITCHES]],
  ['show vlan brief', (c) => show.showVlanBrief(c.sim, c.device), [...SWITCHES]],
  ['show vlan', (c) => show.showVlanBrief(c.sim, c.device), [...SWITCHES]],
  ['show mac address-table', (c) => show.showMacTable(c.sim, c.device), [...SWITCHES]],
  ['show ip route', (c) => show.showIpRoute(c.sim, c.device)],
  ['show ip arp', (c) => show.showArp(c.sim, c.device)],
  ['show arp', (c) => show.showArp(c.sim, c.device)],
  ['show ip ospf neighbor', (c) => show.showOspfNeighbors(c.sim, c.device), [...ROUTERS]],
  ['show ip protocols', (c) => show.showIpProtocols(c.sim, c.device), [...ROUTERS]],
  ['show ip dhcp binding', (c) => show.showDhcpBinding(c.sim, c.device), [...ROUTERS]],
  ['show ip dhcp pool', (c) => show.showDhcpPool(c.sim, c.device), [...ROUTERS]],
  ['show ip nat translations', (c) => show.showNat(c.sim, c.device), ['router']],
  ['show access-lists', (c) => show.showAccessLists(c.sim, c.device)],
  ['show ip access-lists', (c) => show.showAccessLists(c.sim, c.device)],
  ['show spanning-tree', (c) => show.showSpanningTree(c.sim, c.device), [...SWITCHES]],
  ['show port-security', (c) => show.showPortSecurity(c.sim, c.device), [...SWITCHES]],
  ['show port-security interface <iface:if>', (c, a) => show.showPortSecurityInterface(c.sim, c.device, a.if as string), [...SWITCHES]],
  ['show ip dhcp snooping', (c) => show.showDhcpSnooping(c.sim, c.device), [...SWITCHES]],
  ['show ip dhcp snooping binding', (c) => show.showDhcpSnoopingBinding(c.sim, c.device), [...SWITCHES]],
  ['show etherchannel summary', (c) => show.showEtherchannelSummary(c.sim, c.device), [...SWITCHES]],
  ['show vrrp', (c) => show.showVrrpBrief(c.sim, c.device), [...ROUTERS]],
  ['show vrrp brief', (c) => show.showVrrpBrief(c.sim, c.device), [...ROUTERS]],
  ['show standby', (c) => show.showStandbyBrief(c.sim, c.device), [...ROUTERS]],
  ['show standby brief', (c) => show.showStandbyBrief(c.sim, c.device), [...ROUTERS]],
  ['show version', (c) => show.showVersion(c.sim, c.device)],
  ['show clock', () => show.showClock()],
  ['show lldp neighbors', (c) => show.showLldp(c.sim, c.device)],
  ['show history', (c) => c.session.history.slice(-20).map((h) => `  ${h}`)],
];
for (const [pattern, run, kinds, modes] of showDefs) {
  def(modes ?? SHOW_MODES, pattern, (ctx, args) => ctx.out.push(...run(ctx, args)), kinds);
}

def(['config'], 'hostname <word:name>', (ctx, a) => {
  ctx.device.name = (a.name as string).slice(0, 63);
  mark(ctx);
});
def(['config'], 'interface <ifnew:if>', (ctx, a) => {
  const ref = resolveIface(ctx.device, a.if as string, true);
  if (!ref || ref === 'ambiguous') return err(ctx, '% Invalid interface');
  if (ref.kind === 'po') {
    const members = ctx.device.ports.filter((p) => p.channelGroup === ref.number).map((p) => p.name);
    if (!members.length) return err(ctx, `% Port-channel${ref.number} nie ma jeszcze portów. Dodaj je na interfejsach poleceniem channel-group ${ref.number} mode active.`);
    ctx.session.ifaces = members;
    ctx.session.mode = 'if';
    return;
  }
  if (!ref.exists) {
    if (ref.kind === 'sub') ctx.device.vifs.push(blankVif('sub', ref.name, ref.parent, 0));
    if (ref.kind === 'svi') {
      ctx.device.vifs.push(blankVif('svi', ref.name, '', ref.vlan));
    }
    if (ref.kind === 'loop') ctx.device.vifs.push(blankVif('loop', ref.name));
    mark(ctx);
  }
  ctx.session.ifaces = [ref.name];
  ctx.session.mode = ref.kind === 'sub' ? 'subif' : 'if';
});
def(['config'], 'interface range <ifrange:ifs>', (ctx, a) => {
  ctx.session.ifaces = a.ifs as string[];
  ctx.session.mode = 'if-range';
});
def(['config'], 'no interface <iface:if>', (ctx, a) => {
  const name = a.if as string;
  if (ctx.device.ports.some((p) => p.name === name)) return err(ctx, '% Physical interfaces cannot be removed');
  ctx.device.vifs = ctx.device.vifs.filter((v) => v.name !== name);
  mark(ctx);
});
def(
  ['config'],
  'vlan <vlans:ids>',
  (ctx, a) => {
    const ids = parseVlanIds(a.ids as string);
    if (!ids) return err(ctx, '% Invalid VLAN list');
    for (const id of ids) ensureVlan(ctx.device, id);
    ctx.session.vlans = ids;
    ctx.session.mode = 'vlan';
    mark(ctx);
  },
  [...SWITCHES],
);
def(
  ['config'],
  'no vlan <vlans:ids>',
  (ctx, a) => {
    const ids = parseVlanIds(a.ids as string) ?? [];
    if (ids.includes(1)) err(ctx, '%Default VLAN 1 may not be deleted.');
    ctx.device.vlans = ctx.device.vlans.filter((v) => v.id === 1 || !ids.includes(v.id));
    mark(ctx);
  },
  [...SWITCHES],
);
def(['config'], 'ip routing', (ctx) => {
  ctx.device.ipRouting = true;
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'no ip routing', (ctx) => {
  if (ctx.device.kind === 'router') return;
  ctx.device.ipRouting = false;
  mark(ctx);
}, [...ROUTERS]);

function addRoute(ctx: Ctx, args: Args): void {
  const net = parseIp(args.net as string)!;
  const prefix = maskToPrefix(parseIp(args.mask as string)!);
  if (prefix === null) return err(ctx, '%Inconsistent address and mask');
  if (networkOf(net, prefix) !== net) return err(ctx, '%Inconsistent address and mask');
  const via = (args.via as string | undefined) ?? '';
  const iface = (args.if as string | undefined) ?? '';
  const ad = (args.ad as number | undefined) ?? 1;
  const exists = ctx.device.routes.find((r) => r.net === args.net && r.prefix === prefix && r.via === via && r.iface === iface);
  if (exists) exists.ad = ad;
  else ctx.device.routes.push({ net: args.net as string, prefix, via, iface, ad });
  mark(ctx);
}
for (const tail of ['<ip:via>', '<ip:via> <num:ad:1-255>', '<iface:if>', '<iface:if> <ip:via>', '<iface:if> <num:ad:1-255>']) {
  def(['config'], `ip route <ip:net> <mask:mask> ${tail}`, addRoute, [...ROUTERS]);
}
function removeRoute(ctx: Ctx, args: Args): void {
  const prefix = maskToPrefix(parseIp(args.mask as string)!);
  const before = ctx.device.routes.length;
  ctx.device.routes = ctx.device.routes.filter((r) => {
    if (r.net !== args.net || r.prefix !== prefix) return true;
    if (args.via && r.via !== args.via) return true;
    if (args.if && r.iface !== args.if) return true;
    return false;
  });
  if (ctx.device.routes.length === before) err(ctx, '%No matching route to delete');
  mark(ctx);
}
for (const tail of ['', ' <ip:via>', ' <iface:if>']) def(['config'], `no ip route <ip:net> <mask:mask>${tail}`, removeRoute, [...ROUTERS]);
def(['config'], 'ip default-gateway <ip:gw>', (ctx, a) => {
  ctx.device.defaultGateway = a.gw as string;
  mark(ctx);
}, [...SWITCHES]);
def(['config'], 'no ip default-gateway', (ctx) => {
  ctx.device.defaultGateway = '';
  mark(ctx);
}, [...SWITCHES]);
def(['config'], 'router ospf <num:pid:1-65535>', (ctx, a) => {
  const pid = a.pid as number;
  if (!ctx.device.ospf) {
    ctx.device.ospf = { processId: pid, routerId: '', networks: [], passive: [], refBw: 100, defaultOriginate: false };
    mark(ctx);
  } else if (ctx.device.ospf.processId !== pid) {
    return err(ctx, '% Only one OSPF process is supported in this simulator');
  }
  ctx.session.mode = 'router';
}, [...ROUTERS]);
def(['config'], 'no router ospf <num:pid:1-65535>', (ctx) => {
  ctx.device.ospf = null;
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'ip dhcp pool <word:name>', (ctx, a) => {
  const name = a.name as string;
  if (!ctx.device.dhcpPools.some((p) => p.name === name)) {
    ctx.device.dhcpPools.push({ name, network: '', prefix: 24, router: '', dns: '', domain: '' });
    mark(ctx);
  }
  ctx.session.pool = name;
  ctx.session.mode = 'dhcp';
}, [...ROUTERS]);
def(['config'], 'no ip dhcp pool <word:name>', (ctx, a) => {
  ctx.device.dhcpPools = ctx.device.dhcpPools.filter((p) => p.name !== a.name);
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'ip dhcp excluded-address <ip:from>', (ctx, a) => {
  ctx.device.dhcpExcluded.push({ from: a.from as string, to: a.from as string });
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'ip dhcp excluded-address <ip:from> <ip:to>', (ctx, a) => {
  if (parseIp(a.to as string)! < parseIp(a.from as string)!) return err(ctx, '% Invalid range');
  ctx.device.dhcpExcluded.push({ from: a.from as string, to: a.to as string });
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'no ip dhcp excluded-address <ip:from>', (ctx, a) => {
  ctx.device.dhcpExcluded = ctx.device.dhcpExcluded.filter((r) => r.from !== a.from);
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'no ip dhcp excluded-address <ip:from> <ip:to>', (ctx, a) => {
  ctx.device.dhcpExcluded = ctx.device.dhcpExcluded.filter((r) => r.from !== a.from || r.to !== a.to);
  mark(ctx);
}, [...ROUTERS]);
def(['config'], 'ip nat inside source list <word:acl> interface <iface:if> overload', (ctx, a) => {
  ctx.device.nat = ctx.device.nat.filter((r) => r.kind !== 'pat');
  ctx.device.nat.push({ kind: 'pat', acl: a.acl as string, iface: a.if as string });
  mark(ctx);
}, ['router']);
def(['config'], 'no ip nat inside source list <word:acl> interface <iface:if> overload', (ctx) => {
  ctx.device.nat = ctx.device.nat.filter((r) => r.kind !== 'pat');
  mark(ctx);
}, ['router']);
def(['config'], 'ip nat inside source static <ip:inside> <ip:outside>', (ctx, a) => {
  ctx.device.nat.push({ kind: 'static', inside: a.inside as string, outside: a.outside as string });
  mark(ctx);
}, ['router']);
def(['config'], 'no ip nat inside source static <ip:inside> <ip:outside>', (ctx, a) => {
  ctx.device.nat = ctx.device.nat.filter((r) => !(r.kind === 'static' && r.inside === a.inside && r.outside === a.outside));
  mark(ctx);
}, ['router']);

for (const action of ['permit', 'deny'] as const) {
  def(['config'], `access-list <num:n:1-99> ${action} any`, (ctx, a) => addToAcl(ctx, String(a.n), 'standard', standardEntry(action, ANY)));
  def(['config'], `access-list <num:n:1-99> ${action} host <ip:src>`, (ctx, a) => addToAcl(ctx, String(a.n), 'standard', standardEntry(action, hostSpec(a.src as string))));
  def(['config'], `access-list <num:n:1-99> ${action} <ip:src>`, (ctx, a) => addToAcl(ctx, String(a.n), 'standard', standardEntry(action, hostSpec(a.src as string))));
  def(['config'], `access-list <num:n:1-99> ${action} <ip:src> <wild:wc>`, (ctx, a) => addToAcl(ctx, String(a.n), 'standard', standardEntry(action, wildFromArgs(a))));
  for (const proto of ['ip', 'icmp', 'tcp', 'udp'] as const) {
    def(['config'], `access-list <num:n:100-199> ${action} ${proto} <line:rest>`, (ctx, a) => {
      const entry = parseExtended(action, proto, a.rest as string);
      if (!entry) return err(ctx, `% Invalid input detected: ${a.rest as string}`);
      addToAcl(ctx, String(a.n), 'extended', entry);
    });
    def(['ext-acl'], `${action} ${proto} <line:rest>`, (ctx, a) => {
      const entry = parseExtended(action, proto, a.rest as string);
      if (!entry) return err(ctx, `% Invalid input detected: ${a.rest as string}`);
      addToAcl(ctx, ctx.session.acl, 'extended', entry);
    });
  }
  def(['std-acl'], `${action} any`, (ctx) => addToAcl(ctx, ctx.session.acl, 'standard', standardEntry(action, ANY)));
  def(['std-acl'], `${action} host <ip:src>`, (ctx, a) => addToAcl(ctx, ctx.session.acl, 'standard', standardEntry(action, hostSpec(a.src as string))));
  def(['std-acl'], `${action} <ip:src>`, (ctx, a) => addToAcl(ctx, ctx.session.acl, 'standard', standardEntry(action, hostSpec(a.src as string))));
  def(['std-acl'], `${action} <ip:src> <wild:wc>`, (ctx, a) => addToAcl(ctx, ctx.session.acl, 'standard', standardEntry(action, wildFromArgs(a))));
}
for (const range of ['1-99', '100-199']) {
  def(['config'], `access-list <num:n:${range}> remark <line:text>`, (ctx, a) => {
    const n = a.n as number;
    const acl = aclFor(ctx.device, String(n), n < 100 ? 'standard' : 'extended');
    acl.entries.push({ ...standardEntry('permit', ANY), remark: a.text as string });
    mark(ctx);
  });
}
for (const mode of ['std-acl', 'ext-acl'] as Mode[]) {
  def([mode], 'remark <line:text>', (ctx, a) => {
    const acl = ctx.device.acls.find((x) => x.name === ctx.session.acl);
    acl?.entries.push({ ...standardEntry('permit', ANY), remark: a.text as string });
    mark(ctx);
  });
}
def(['config'], 'no access-list <num:n:1-199>', (ctx, a) => {
  ctx.device.acls = ctx.device.acls.filter((x) => x.name !== String(a.n));
  mark(ctx);
});
for (const type of ['standard', 'extended'] as const) {
  def(['config'], `ip access-list ${type} <word:name>`, (ctx, a) => {
    const name = a.name as string;
    const existing = ctx.device.acls.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (existing && existing.type !== type) return err(ctx, '% A named ACL with this name but a different type already exists');
    aclFor(ctx.device, name, type);
    ctx.session.acl = existing?.name ?? name;
    ctx.session.mode = type === 'standard' ? 'std-acl' : 'ext-acl';
    mark(ctx);
  });
  def(['config'], `no ip access-list ${type} <word:name>`, (ctx, a) => {
    ctx.device.acls = ctx.device.acls.filter((x) => x.name.toLowerCase() !== (a.name as string).toLowerCase());
    mark(ctx);
  });
}
def(['config'], 'spanning-tree mode mst', () => {}, [...SWITCHES]);
def(['config'], 'spanning-tree mode rapid-pvst', (ctx) => ctx.out.push('% Ten symulator używa jednej instancji drzewa (MST0).'), [...SWITCHES]);
def(['config'], 'spanning-tree mst 0 priority <num:p:0-61440>', (ctx, a) => setPriority(ctx, a.p as number), [...SWITCHES]);
def(['config'], 'spanning-tree vlan <vlans:v> priority <num:p:0-61440>', (ctx, a) => setPriority(ctx, a.p as number), [...SWITCHES]);
def(['config'], 'spanning-tree vlan <vlans:v> root primary', (ctx) => setPriority(ctx, 24576), [...SWITCHES]);
def(['config'], 'spanning-tree vlan <vlans:v> root secondary', (ctx) => setPriority(ctx, 28672), [...SWITCHES]);
function setPriority(ctx: Ctx, priority: number): void {
  if (priority % 4096 !== 0) return err(ctx, '% Bridge Priority must be in increments of 4096.');
  ctx.device.stpPriority = priority;
  mark(ctx);
}
def(['config'], 'banner motd <line:text>', (ctx, a) => {
  const text = (a.text as string).trim();
  const delimiter = text[0];
  const end = text.indexOf(delimiter, 1);
  ctx.device.banner = end > 0 ? text.slice(1, end) : text.slice(1);
  mark(ctx);
});
def(['config'], 'no banner motd', (ctx) => {
  ctx.device.banner = '';
  mark(ctx);
});
def(['config'], 'enable secret <word:pw>', (ctx, a) => {
  ctx.device.mgmt.enableSecret = show.fakeHash(a.pw as string);
  mark(ctx);
});
def(['config'], 'no enable secret', (ctx) => {
  ctx.device.mgmt.enableSecret = '';
  mark(ctx);
});
for (const pattern of ['username <word:user> secret <word:pw>', 'username <word:user> privilege <num:lvl:0-15> secret <word:pw>']) {
  def(['config'], pattern, (ctx, a) => {
    const users = ctx.device.mgmt.users.filter((u) => u.name !== a.user);
    users.push({ name: a.user as string, secret: show.fakeHash(a.pw as string) });
    ctx.device.mgmt.users = users;
    mark(ctx);
  });
}
def(['config'], 'username <word:user> password <word:pw>', (ctx) => {
  ctx.out.push('% Użyj „secret” zamiast „password”: hasło będzie zapisane jako skrót, a nie jawnym tekstem.');
});
def(['config'], 'no username <word:user>', (ctx, a) => {
  ctx.device.mgmt.users = ctx.device.mgmt.users.filter((u) => u.name !== a.user);
  mark(ctx);
});
for (const pattern of ['ip domain-name <word:d>', 'ip domain name <word:d>']) {
  def(['config'], pattern, (ctx, a) => {
    ctx.device.mgmt.domain = a.d as string;
    mark(ctx);
  });
}
def(['config'], 'no ip domain-lookup', (ctx) => {
  ctx.device.mgmt.domainLookup = false;
  mark(ctx);
});
def(['config'], 'ip domain-lookup', (ctx) => {
  ctx.device.mgmt.domainLookup = true;
  mark(ctx);
});
function generateKeys(ctx: Ctx, bits: number): void {
  if (!ctx.device.mgmt.domain) return err(ctx, '% Please define a domain-name first.');
  ctx.out.push(
    `The name for the keys will be: ${ctx.device.name}.${ctx.device.mgmt.domain}`,
    '',
    `% The key modulus size is ${bits} bits`,
    `% Generating ${bits} bit RSA keys, keys will be non-exportable...`,
    '[OK] (elapsed time was 1 seconds)',
  );
  if (bits < 2048) ctx.out.push('% Klucze krótsze niż 2048 bitów są dziś uznawane za zbyt słabe.');
  ctx.device.mgmt.sshKeys = true;
  mark(ctx);
}
def(['config'], 'crypto key generate rsa', (ctx) => generateKeys(ctx, 2048));
def(['config'], 'crypto key generate rsa modulus <num:bits:512-4096>', (ctx, a) => generateKeys(ctx, a.bits as number));
def(['config'], 'ip ssh version 2', (ctx) => {
  if (!ctx.device.mgmt.sshKeys) return err(ctx, 'Please create RSA keys to enable SSH (and of at least 768 bits for SSH v2).');
  ctx.device.mgmt.sshV2 = true;
  mark(ctx);
});
def(['config'], 'line vty <num:a:0-15> <num:b:0-15>', (ctx) => {
  ctx.session.line = 'vty';
  ctx.session.mode = 'line';
});
def(['config'], 'line console 0', (ctx) => {
  ctx.session.line = 'console';
  ctx.session.mode = 'line';
});
def(['config'], 'service password-encryption', (ctx) => {
  ctx.device.mgmt.passwordEncryption = true;
  mark(ctx);
});
def(['config'], 'no service password-encryption', (ctx) => {
  ctx.device.mgmt.passwordEncryption = false;
  mark(ctx);
});
def(['config'], 'lldp run', (ctx) => {
  ctx.device.mgmt.lldp = true;
  mark(ctx);
});
def(['config'], 'no lldp run', (ctx) => {
  ctx.device.mgmt.lldp = false;
  mark(ctx);
});

def(['line'], 'password <word:pw>', (ctx, a) => {
  if (ctx.session.line === 'vty') ctx.device.mgmt.vtyPassword = a.pw as string;
  else ctx.device.mgmt.consolePassword = a.pw as string;
  mark(ctx);
});
def(['line'], 'login', (ctx) => {
  if (ctx.session.line === 'vty') ctx.device.mgmt.vtyLogin = 'password';
  else ctx.device.mgmt.consoleLogin = true;
  mark(ctx);
});
def(['line'], 'login local', (ctx) => {
  if (ctx.session.line === 'vty') ctx.device.mgmt.vtyLogin = 'local';
  else ctx.device.mgmt.consoleLogin = true;
  mark(ctx);
});
def(['line'], 'no login', (ctx) => {
  if (ctx.session.line === 'vty') ctx.device.mgmt.vtyLogin = '';
  else ctx.device.mgmt.consoleLogin = false;
  mark(ctx);
});
for (const transport of ['ssh', 'telnet', 'all', 'none'] as const) {
  def(['line'], `transport input ${transport}`, (ctx) => {
    if (ctx.session.line !== 'vty') return err(ctx, '% Transport input applies to vty lines');
    ctx.device.mgmt.vtyTransport = transport;
    if (transport === 'telnet' || transport === 'all') ctx.out.push('% Uwaga: Telnet przesyła hasła jawnym tekstem. Używaj SSH.');
    mark(ctx);
  });
}
def(['line'], 'exec-timeout <num:m:0-35791> <num:s:0-2147483>', (ctx, a) => {
  ctx.device.mgmt.execTimeout = a.m as number;
  mark(ctx);
});
def(['line'], 'logging synchronous', () => {});

def(IF_MODES, 'ip address <ip:ip> <mask:mask>', (ctx, a) => setIp(ctx, a.ip as string, a.mask as string), ['router', 'l3switch', 'switch']);
def(['if', 'if-range'], 'ip address dhcp', (ctx) => {
  for (const port of targetPorts(ctx)) {
    if (port.switchport) {
      err(ctx, '% IP addresses may not be configured on L2 links.');
      continue;
    }
    port.dhcp = true;
    port.ip = '';
    mark(ctx);
  }
}, ['router']);
def(IF_MODES, 'no ip address', (ctx) => {
  for (const target of targetsL3(ctx)) {
    target.ip = '';
    if ('dhcp' in target) target.dhcp = false;
  }
  mark(ctx);
});
def(IF_MODES, 'shutdown', (ctx) => {
  for (const target of targetsL3(ctx)) {
    if (!target.shutdown) ctx.out.push(`%LINK-5-CHANGED: Interface ${target.name}, changed state to administratively down`);
    target.shutdown = true;
    if ('errDisabled' in target) target.errDisabled = false;
  }
  mark(ctx);
});
def(IF_MODES, 'no shutdown', (ctx) => {
  for (const target of targetsL3(ctx)) {
    const wasDown = target.shutdown;
    target.shutdown = false;
    if (!wasDown || !('switchport' in target)) continue;
    const end = ctx.sim.topo.peer(ctx.device.id, target.name);
    const peer = end ? ctx.sim.topo.device(end.dev) : undefined;
    const peerPort = peer ? peer.ports.find((p) => p.name === end!.port) : undefined;
    if (peerPort && !peerPort.shutdown) {
      ctx.out.push(
        `%LINK-5-CHANGED: Interface ${target.name}, changed state to up`,
        `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${target.name}, changed state to up`,
      );
    } else ctx.out.push(`%LINK-3-UPDOWN: Interface ${target.name}, changed state to down`);
  }
  mark(ctx);
});
def(IF_MODES, 'description <line:text>', (ctx, a) => {
  for (const target of targetsL3(ctx)) target.description = (a.text as string).slice(0, 200);
  mark(ctx);
});
def(IF_MODES, 'no description', (ctx) => {
  for (const target of targetsL3(ctx)) target.description = '';
  mark(ctx);
});

function forSwitchports(ctx: Ctx, apply: (port: Port) => void): void {
  for (const port of targetPorts(ctx)) {
    if (!port.switchport) {
      err(ctx, `% ${port.name} is not a switchport. Use "switchport" first.`);
      continue;
    }
    apply(port);
  }
  mark(ctx);
}
def(['if', 'if-range'], 'switchport mode access', (ctx) => forSwitchports(ctx, (p) => (p.mode = 'access')), [...SWITCHES]);
def(['if', 'if-range'], 'switchport mode trunk', (ctx) => forSwitchports(ctx, (p) => (p.mode = 'trunk')), [...SWITCHES]);
def(['if', 'if-range'], 'switchport access vlan <num:v:1-4094>', (ctx, a) => {
  const vlan = a.v as number;
  if (ensureVlan(ctx.device, vlan)) ctx.out.push(`% Access VLAN does not exist. Creating vlan ${vlan}`);
  forSwitchports(ctx, (p) => (p.accessVlan = vlan));
}, [...SWITCHES]);
def(['if', 'if-range'], 'no switchport access vlan', (ctx) => forSwitchports(ctx, (p) => (p.accessVlan = 1)), [...SWITCHES]);
def(['if', 'if-range'], 'switchport trunk native vlan <num:v:1-4094>', (ctx, a) => forSwitchports(ctx, (p) => (p.nativeVlan = a.v as number)), [...SWITCHES]);
def(['if', 'if-range'], 'no switchport trunk native vlan', (ctx) => forSwitchports(ctx, (p) => (p.nativeVlan = 1)), [...SWITCHES]);
def(['if', 'if-range'], 'switchport trunk allowed vlan <vlans:v>', (ctx, a) => {
  const ids = parseVlanIds(a.v as string);
  if (!ids) return err(ctx, '% Invalid VLAN list');
  forSwitchports(ctx, (p) => (p.allowedVlans = compactVlans(ids)));
}, [...SWITCHES]);
def(['if', 'if-range'], 'switchport trunk allowed vlan all', (ctx) => forSwitchports(ctx, (p) => (p.allowedVlans = 'all')), [...SWITCHES]);
def(['if', 'if-range'], 'switchport trunk allowed vlan none', (ctx) => forSwitchports(ctx, (p) => (p.allowedVlans = '')), [...SWITCHES]);
def(['if', 'if-range'], 'switchport trunk allowed vlan add <vlans:v>', (ctx, a) => {
  const ids = parseVlanIds(a.v as string) ?? [];
  forSwitchports(ctx, (p) => {
    if (p.allowedVlans === 'all') return;
    const current = parseVlanIds(p.allowedVlans) ?? [];
    p.allowedVlans = compactVlans([...new Set([...current, ...ids])]);
  });
}, [...SWITCHES]);
def(['if', 'if-range'], 'switchport trunk allowed vlan remove <vlans:v>', (ctx, a) => {
  const ids = parseVlanIds(a.v as string) ?? [];
  forSwitchports(ctx, (p) => {
    const current = p.allowedVlans === 'all' ? Array.from({ length: 4094 }, (_, i) => i + 1) : (parseVlanIds(p.allowedVlans) ?? []);
    p.allowedVlans = compactVlans(current.filter((v) => !ids.includes(v)));
  });
}, [...SWITCHES]);
def(['if', 'if-range'], 'no switchport trunk allowed vlan', (ctx) => forSwitchports(ctx, (p) => (p.allowedVlans = 'all')), [...SWITCHES]);
def(['if', 'if-range'], 'switchport nonegotiate', () => {}, [...SWITCHES]);
def(['if', 'if-range'], 'spanning-tree portfast', (ctx) => {
  ctx.out.push('%Warning: portfast should only be enabled on ports connected to a single host.');
}, [...SWITCHES]);
def(['if', 'if-range'], 'spanning-tree bpduguard enable', () => {}, [...SWITCHES]);
def(['if', 'if-range'], 'no switchport', (ctx) => {
  for (const port of targetPorts(ctx)) {
    port.switchport = false;
    port.mode = 'access';
  }
  mark(ctx);
}, ['l3switch']);
def(['if', 'if-range'], 'switchport', (ctx) => {
  for (const port of targetPorts(ctx)) {
    port.switchport = true;
    port.ip = '';
  }
  mark(ctx);
}, ['l3switch']);
function parseMac(text: string): string | null {
  const hex = text.toLowerCase().replace(/[.:-]/g, '');
  return /^[0-9a-f]{12}$/.test(hex) ? hex : null;
}

function forSecurePorts(ctx: Ctx, apply: (port: Port) => void): void {
  for (const port of targetPorts(ctx)) {
    if (!port.switchport) {
      err(ctx, `% ${port.name} is not a switchport. Use "switchport" first.`);
      continue;
    }
    if (port.mode !== 'access') {
      err(ctx, `Command rejected: ${port.name} is a trunk port.`);
      continue;
    }
    apply(port);
  }
  mark(ctx);
}

def(['if', 'if-range'], 'switchport port-security', (ctx) => forSecurePorts(ctx, (p) => (p.portSecurity.enabled = true)), [...SWITCHES]);
def(['if', 'if-range'], 'no switchport port-security', (ctx) => forSwitchports(ctx, (p) => (p.portSecurity.enabled = false)), [...SWITCHES]);
def(['if', 'if-range'], 'switchport port-security maximum <num:n:1-64>', (ctx, a) => forSecurePorts(ctx, (p) => (p.portSecurity.maximum = a.n as number)), [...SWITCHES]);
def(['if', 'if-range'], 'no switchport port-security maximum', (ctx) => forSwitchports(ctx, (p) => (p.portSecurity.maximum = 1)), [...SWITCHES]);
for (const mode of ['shutdown', 'restrict', 'protect'] as ViolationMode[]) {
  def(['if', 'if-range'], `switchport port-security violation ${mode}`, (ctx) => forSecurePorts(ctx, (p) => (p.portSecurity.violation = mode)), [...SWITCHES]);
}
def(['if', 'if-range'], 'no switchport port-security violation', (ctx) => forSwitchports(ctx, (p) => (p.portSecurity.violation = 'shutdown')), [...SWITCHES]);
def(['if', 'if-range'], 'switchport port-security mac-address sticky', (ctx) => forSecurePorts(ctx, (p) => (p.portSecurity.sticky = true)), [...SWITCHES]);
def(['if', 'if-range'], 'no switchport port-security mac-address sticky', (ctx) => {
  forSwitchports(ctx, (p) => {
    p.portSecurity.sticky = false;
    p.portSecurity.stickyMacs = [];
  });
}, [...SWITCHES]);
def(['if', 'if-range'], 'switchport port-security mac-address sticky <word:mac>', (ctx, a) => {
  const mac = parseMac(a.mac as string);
  if (!mac) return err(ctx, '% Invalid MAC address. Use the format xxxx.xxxx.xxxx');
  forSecurePorts(ctx, (p) => {
    if (!p.portSecurity.stickyMacs.includes(mac)) p.portSecurity.stickyMacs.push(mac);
  });
}, [...SWITCHES]);
def(['if', 'if-range'], 'switchport port-security mac-address <word:mac>', (ctx, a) => {
  const mac = parseMac(a.mac as string);
  if (!mac) return err(ctx, '% Invalid MAC address. Use the format xxxx.xxxx.xxxx');
  forSecurePorts(ctx, (p) => {
    if (!p.portSecurity.macs.includes(mac)) p.portSecurity.macs.push(mac);
  });
}, [...SWITCHES]);
def(['if', 'if-range'], 'no switchport port-security mac-address <word:mac>', (ctx, a) => {
  const mac = parseMac(a.mac as string);
  forSwitchports(ctx, (p) => {
    p.portSecurity.macs = p.portSecurity.macs.filter((m) => m !== mac);
    p.portSecurity.stickyMacs = p.portSecurity.stickyMacs.filter((m) => m !== mac);
  });
}, [...SWITCHES]);
def(['priv'], 'clear port-security sticky', (ctx) => {
  for (const port of ctx.device.ports) port.portSecurity.stickyMacs = [];
  mark(ctx);
}, [...SWITCHES]);

def(['config'], 'ip dhcp snooping', (ctx) => {
  ctx.device.dhcpSnooping.enabled = true;
  mark(ctx);
}, [...SWITCHES]);
def(['config'], 'no ip dhcp snooping', (ctx) => {
  ctx.device.dhcpSnooping.enabled = false;
  mark(ctx);
}, [...SWITCHES]);
def(['config'], 'ip dhcp snooping vlan <vlans:v>', (ctx, a) => {
  const ids = parseVlanIds(a.v as string);
  if (!ids) return err(ctx, '% Invalid VLAN list');
  ctx.device.dhcpSnooping.vlans = [...new Set([...ctx.device.dhcpSnooping.vlans, ...ids])].sort((x, y) => x - y);
  mark(ctx);
}, [...SWITCHES]);
def(['config'], 'no ip dhcp snooping vlan <vlans:v>', (ctx, a) => {
  const ids = parseVlanIds(a.v as string) ?? [];
  ctx.device.dhcpSnooping.vlans = ctx.device.dhcpSnooping.vlans.filter((v) => !ids.includes(v));
  mark(ctx);
}, [...SWITCHES]);
def(['config'], 'ip dhcp snooping information option', () => {}, [...SWITCHES]);
def(['config'], 'no ip dhcp snooping information option', () => {}, [...SWITCHES]);
def(['if', 'if-range'], 'ip dhcp snooping trust', (ctx) => forSwitchports(ctx, (p) => (p.dhcpTrust = true)), [...SWITCHES]);
def(['if', 'if-range'], 'no ip dhcp snooping trust', (ctx) => forSwitchports(ctx, (p) => (p.dhcpTrust = false)), [...SWITCHES]);
def(['if', 'if-range'], 'ip dhcp snooping limit rate <num:r:1-2048>', () => {}, [...SWITCHES]);

for (const mode of ['active', 'passive', 'on'] as ChannelMode[]) {
  def(['if', 'if-range'], `channel-group <num:g:1-64> mode ${mode}`, (ctx, a) => {
    const group = a.g as number;
    const others = ctx.device.ports.filter((p) => p.channelGroup === group && !ctx.session.ifaces.includes(p.name));
    if (others.some((p) => (p.channelMode === 'on') !== (mode === 'on'))) {
      return err(ctx, `% Command rejected (Channel protocol mismatch for interface ${ctx.session.ifaces[0]} in group ${group})`);
    }
    if (!ctx.device.ports.some((p) => p.channelGroup === group)) ctx.out.push(`Creating a port-channel interface Port-channel ${group}`);
    forSwitchports(ctx, (p) => {
      p.channelGroup = group;
      p.channelMode = mode;
    });
  }, [...SWITCHES]);
}
def(['if', 'if-range'], 'no channel-group', (ctx) => forSwitchports(ctx, (p) => {
  p.channelGroup = 0;
  p.channelMode = '';
}), [...SWITCHES]);

function fhrpGroup(ctx: Ctx, target: Port | VirtualIf, proto: FhrpProto, group: number): FhrpGroup {
  if (target.fhrp && target.fhrp.proto === proto && target.fhrp.group === group) return target.fhrp;
  if (target.fhrp) ctx.out.push(`% Ten symulator obsługuje jedną grupę ${target.fhrp.proto.toUpperCase()}/HSRP na interfejsie. Poprzednia grupa ${target.fhrp.group} została zastąpiona.`);
  target.fhrp = { proto, group, ip: '', priority: 100, preempt: proto === 'vrrp' };
  return target.fhrp;
}

function forFhrp(ctx: Ctx, proto: FhrpProto, group: number, apply: (fhrp: FhrpGroup, target: Port | VirtualIf) => void): void {
  for (const target of targetsL3(ctx)) {
    if ('switchport' in target && target.switchport) {
      err(ctx, `% ${proto === 'vrrp' ? 'VRRP' : 'HSRP'} wymaga interfejsu warstwy 3 z adresem IP.`);
      continue;
    }
    apply(fhrpGroup(ctx, target, proto, group), target);
  }
  mark(ctx);
}

for (const [proto, word, range] of [['vrrp', 'vrrp', '1-255'], ['hsrp', 'standby', '0-255']] as const) {
  def(IF_MODES, `${word} <num:g:${range}> ip <ip:vip>`, (ctx, a) => {
    const vip = parseIp(a.vip as string)!;
    forFhrp(ctx, proto, a.g as number, (fhrp, target) => {
      const own = parseIp(target.ip);
      if (own !== null && networkOf(own, target.prefix) !== networkOf(vip, target.prefix)) {
        err(ctx, `% Address ${a.vip as string} in group ${a.g as number} is not in the subnet of ${target.name}`);
        return;
      }
      fhrp.ip = a.vip as string;
    });
  }, [...ROUTERS]);
  def(IF_MODES, `${word} <num:g:${range}> priority <num:p:${proto === 'vrrp' ? '1-254' : '0-255'}>`, (ctx, a) => {
    forFhrp(ctx, proto, a.g as number, (fhrp) => (fhrp.priority = a.p as number));
  }, [...ROUTERS]);
  def(IF_MODES, `${word} <num:g:${range}> preempt`, (ctx, a) => forFhrp(ctx, proto, a.g as number, (fhrp) => (fhrp.preempt = true)), [...ROUTERS]);
  def(IF_MODES, `no ${word} <num:g:${range}> preempt`, (ctx, a) => forFhrp(ctx, proto, a.g as number, (fhrp) => (fhrp.preempt = false)), [...ROUTERS]);
  def(IF_MODES, `no ${word} <num:g:${range}>`, (ctx, a) => {
    for (const target of targetsL3(ctx)) if (target.fhrp?.proto === proto && target.fhrp.group === a.g) target.fhrp = null;
    mark(ctx);
  }, [...ROUTERS]);
}
def(IF_MODES, 'standby version <num:v:1-2>', () => {}, [...ROUTERS]);

def(['subif'], 'encapsulation dot1q <num:v:1-4094>', (ctx, a) => {
  const vif = ctx.device.vifs.find((v) => v.name === ctx.session.ifaces[0]);
  if (!vif) return;
  const taken = ctx.device.vifs.find((v) => v !== vif && v.kind === 'sub' && v.parent === vif.parent && v.vlan === a.v);
  if (taken) return err(ctx, `% Configuration of multiple subinterfaces of the same main interface with the same VID (${a.v as number}) is not permitted.`);
  vif.vlan = a.v as number;
  mark(ctx);
}, ['router']);
def(IF_MODES, 'ip helper-address <ip:ip>', (ctx, a) => {
  for (const target of targetsL3(ctx)) target.helper = a.ip as string;
  mark(ctx);
}, [...ROUTERS]);
def(IF_MODES, 'no ip helper-address', (ctx) => {
  for (const target of targetsL3(ctx)) target.helper = '';
  mark(ctx);
}, [...ROUTERS]);
for (const role of ['inside', 'outside'] as const) {
  def(IF_MODES, `ip nat ${role}`, (ctx) => {
    for (const target of targetsL3(ctx)) target.nat = role;
    mark(ctx);
  }, ['router']);
  def(IF_MODES, `no ip nat ${role}`, (ctx) => {
    for (const target of targetsL3(ctx)) if (target.nat === role) target.nat = '';
    mark(ctx);
  }, ['router']);
}
for (const dir of ['in', 'out'] as const) {
  def(IF_MODES, `ip access-group <word:acl> ${dir}`, (ctx, a) => {
    for (const target of targetsL3(ctx)) {
      if (dir === 'in') target.aclIn = a.acl as string;
      else target.aclOut = a.acl as string;
    }
    mark(ctx);
  }, [...ROUTERS]);
  def(IF_MODES, `no ip access-group <word:acl> ${dir}`, (ctx) => {
    for (const target of targetsL3(ctx)) {
      if (dir === 'in') target.aclIn = '';
      else target.aclOut = '';
    }
    mark(ctx);
  }, [...ROUTERS]);
}
def(IF_MODES, 'ip ospf cost <num:c:1-65535>', (ctx, a) => {
  for (const target of targetsL3(ctx)) target.ospfCost = a.c as number;
  mark(ctx);
}, [...ROUTERS]);
def(IF_MODES, 'no ip ospf cost', (ctx) => {
  for (const target of targetsL3(ctx)) target.ospfCost = 0;
  mark(ctx);
}, [...ROUTERS]);

def(['vlan'], 'name <word:name>', (ctx, a) => {
  for (const id of ctx.session.vlans) {
    const vlan = ctx.device.vlans.find((v) => v.id === id);
    if (vlan) vlan.name = (a.name as string).slice(0, 32);
  }
  mark(ctx);
});

def(['router'], 'network <ip:net> <wild:wc> area <num:area:0-4294967295>', (ctx, a) => {
  const ospf = ctx.device.ospf!;
  if (!ospf.networks.some((n) => n.net === a.net && n.wildcard === a.wc)) ospf.networks.push({ net: a.net as string, wildcard: a.wc as string, area: a.area as number });
  else ospf.networks = ospf.networks.map((n) => (n.net === a.net && n.wildcard === a.wc ? { ...n, area: a.area as number } : n));
  mark(ctx);
});
def(['router'], 'no network <ip:net> <wild:wc> area <num:area:0-4294967295>', (ctx, a) => {
  const ospf = ctx.device.ospf!;
  ospf.networks = ospf.networks.filter((n) => !(n.net === a.net && n.wildcard === a.wc));
  mark(ctx);
});
def(['router'], 'router-id <ip:id>', (ctx, a) => {
  ctx.device.ospf!.routerId = a.id as string;
  ctx.out.push('% OSPF: Reload or use "clear ip ospf process" command, for this to take effect');
  mark(ctx);
});
def(['router'], 'no router-id', (ctx) => {
  ctx.device.ospf!.routerId = '';
  mark(ctx);
});
def(['router'], 'passive-interface <iface:if>', (ctx, a) => {
  const ospf = ctx.device.ospf!;
  if (!ospf.passive.includes(a.if as string)) ospf.passive.push(a.if as string);
  mark(ctx);
});
def(['router'], 'no passive-interface <iface:if>', (ctx, a) => {
  ctx.device.ospf!.passive = ctx.device.ospf!.passive.filter((p) => p !== a.if);
  mark(ctx);
});
def(['router'], 'auto-cost reference-bandwidth <num:bw:1-4294967>', (ctx, a) => {
  ctx.device.ospf!.refBw = a.bw as number;
  ctx.out.push('% OSPF: Reference bandwidth is changed.', '        Please ensure reference bandwidth is consistent across all routers.');
  mark(ctx);
});
def(['router'], 'default-information originate', (ctx) => {
  ctx.device.ospf!.defaultOriginate = true;
  mark(ctx);
});
def(['router'], 'no default-information originate', (ctx) => {
  ctx.device.ospf!.defaultOriginate = false;
  mark(ctx);
});

function currentPool(ctx: Ctx) {
  return ctx.device.dhcpPools.find((p) => p.name === ctx.session.pool)!;
}
def(['dhcp'], 'network <ip:net> <mask:mask>', (ctx, a) => {
  const prefix = maskToPrefix(parseIp(a.mask as string)!);
  if (prefix === null) return err(ctx, '% Bad mask');
  const pool = currentPool(ctx);
  pool.network = ipToStr(networkOf(parseIp(a.net as string)!, prefix));
  pool.prefix = prefix;
  mark(ctx);
});
def(['dhcp'], 'default-router <ip:ip>', (ctx, a) => {
  currentPool(ctx).router = a.ip as string;
  mark(ctx);
});
def(['dhcp'], 'dns-server <ip:ip>', (ctx, a) => {
  currentPool(ctx).dns = a.ip as string;
  mark(ctx);
});
def(['dhcp'], 'domain-name <word:d>', (ctx, a) => {
  currentPool(ctx).domain = a.d as string;
  mark(ctx);
});
def(['dhcp'], 'lease <num:days:0-365>', () => {});

def(CONFIG_SUBMODES, 'exit', (ctx) => {
  ctx.session.mode = 'config';
});
def(['config'], 'exit', (ctx) => {
  ctx.session.mode = 'priv';
});
def(['config', ...CONFIG_SUBMODES], 'end', (ctx) => {
  ctx.session.mode = 'priv';
});

export function parseVlanIds(text: string): number[] | null {
  const ids = new Set<number>();
  for (const part of text.split(',')) {
    if (!part) continue;
    const [a, b] = part.split('-').map(Number);
    if (!Number.isInteger(a) || a < 1 || a > 4094) return null;
    const end = b === undefined || Number.isNaN(b) ? a : b;
    if (end < a || end > 4094) return null;
    for (let v = a; v <= end; v++) ids.add(v);
  }
  return ids.size ? [...ids].sort((x, y) => x - y) : null;
}

function compactVlans(ids: number[]): string {
  const sorted = [...ids].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start}` : `${start}-${sorted[i]}`);
  }
  return parts.join(',');
}

const trieCache = new Map<string, TrieNode<Ctx>>();

function trieFor(mode: Mode, kind: Device['kind']): TrieNode<Ctx> {
  const key = `${mode}|${kind}`;
  let trie = trieCache.get(key);
  if (!trie) {
    trie = buildTrie(defs, mode, kind);
    trieCache.set(key, trie);
  }
  return trie;
}

function runParsed(ctx: Ctx, line: string, mode: Mode): 'ok' | { error: 'invalid' | 'ambiguous' | 'incomplete'; index: number; token: string; start: number } {
  const result = parse(trieFor(mode, ctx.device.kind), line, ctx.device);
  if (result.ok) {
    result.run(ctx, result.args);
    return 'ok';
  }
  const tokens = tokenize(line);
  return { error: result.error, index: result.index, token: result.token, start: tokens[result.index]?.start ?? line.length };
}

export function cliExecute(sim: Simulator, session: CliSession, input: string): CliResult {
  const device = sim.topo.device(session.deviceId)!;
  const ctx: Ctx = { sim, device, session, out: [], changed: false };
  if (session.awaiting === 'enable') {
    session.awaiting = '';
    if (show.fakeHash(input) === device.mgmt.enableSecret) session.mode = 'priv';
    else ctx.out.push('% Access denied');
    return { lines: ctx.out, changed: false, secret: false };
  }
  const line = input.replace(/\s+$/, '');
  if (!line.trim()) return { lines: [], changed: false, secret: false };
  if (line.trim().startsWith('!')) return { lines: [], changed: false, secret: false };
  session.history.push(line.trim());
  if (session.history.length > 100) session.history.shift();
  const prompt = cliPrompt(device, session);
  const isConfig = session.mode === 'config' || CONFIG_SUBMODES.includes(session.mode);
  const doMatch = /^\s*do\s+(.*)$/i.exec(line);
  if (isConfig && doMatch) {
    const offset = line.indexOf(doMatch[1]);
    const outcome = runParsed(ctx, doMatch[1], 'priv');
    if (outcome !== 'ok') reportError(ctx, outcome, prompt.length + offset, doMatch[1]);
    return { lines: ctx.out, changed: ctx.changed, secret: awaitingPassword(session) };
  }
  let outcome = runParsed(ctx, line, session.mode);
  if (outcome !== 'ok' && CONFIG_SUBMODES.includes(session.mode) && outcome.error === 'invalid') {
    const fallback = parse(trieFor('config', device.kind), line, device);
    if (fallback.ok) {
      session.mode = 'config';
      fallback.run(ctx, fallback.args);
      outcome = 'ok';
    }
  }
  if (outcome !== 'ok') {
    const single = tokenize(line).length === 1;
    if ((session.mode === 'user' || session.mode === 'priv') && outcome.error === 'invalid' && outcome.index === 0 && single && device.mgmt.domainLookup) {
      ctx.out.push(`Translating "${line.trim()}"...domain server (255.255.255.255)`, '% Unknown command or computer name, or unable to find computer address');
    } else reportError(ctx, outcome, prompt.length, line);
  }
  return { lines: ctx.out, changed: ctx.changed, secret: awaitingPassword(session) };
}

function awaitingPassword(session: CliSession): boolean {
  return session.awaiting === 'enable';
}

function reportError(ctx: Ctx, outcome: { error: string; index: number; token: string; start: number }, offset: number, line: string): void {
  if (outcome.error === 'ambiguous') ctx.out.push(`% Ambiguous command:  "${line.trim()}"`);
  else if (outcome.error === 'incomplete') ctx.out.push('% Incomplete command.');
  else ctx.out.push(`${' '.repeat(offset + outcome.start)}^`, "% Invalid input detected at '^' marker.");
}

export function cliHelp(sim: Simulator, session: CliSession, line: string, lang: Lang): string[] {
  const device = sim.topo.device(session.deviceId)!;
  const isConfig = session.mode === 'config' || CONFIG_SUBMODES.includes(session.mode);
  const doMatch = /^\s*do\s+(.*)$/i.exec(line);
  const mode = isConfig && doMatch ? 'priv' : session.mode;
  const text = isConfig && doMatch ? doMatch[1] : line;
  const entries = helpFor(trieFor(mode, device.kind), text, device, HELP);
  if (!entries) return ["% Invalid input detected at '^' marker."];
  if (!entries.length) return ['% Unrecognized command'];
  const width = Math.max(...entries.map((e) => e.word.length)) + 2;
  return entries.map((e) => `  ${e.word.padEnd(width)}${e.help ? e.help[lang] : ''}`);
}

export function cliComplete(sim: Simulator, session: CliSession, line: string): string | null {
  const device = sim.topo.device(session.deviceId)!;
  const isConfig = session.mode === 'config' || CONFIG_SUBMODES.includes(session.mode);
  const doMatch = /^(\s*do\s+)(.*)$/i.exec(line);
  if (isConfig && doMatch) {
    const completed = completeLine(trieFor('priv', device.kind), doMatch[2], device);
    return completed === null ? null : `${doMatch[1]}${completed}`;
  }
  return completeLine(trieFor(session.mode, device.kind), line, device);
}


const HELP: Record<string, L10n> = {
  enable: l('Przejście do trybu uprzywilejowanego', 'Turn on privileged commands'),
  disable: l('Powrót do trybu użytkownika', 'Turn off privileged commands'),
  exit: l('Wyjście z bieżącego trybu', 'Exit from the current mode'),
  logout: l('Zakończenie sesji', 'Exit from the EXEC'),
  end: l('Powrót do trybu uprzywilejowanego', 'Exit to privileged EXEC mode'),
  configure: l('Wejście w tryb konfiguracji', 'Enter configuration mode'),
  terminal: l('Konfiguracja z terminala lub ustawienia terminala', 'Configure from the terminal or set terminal parameters'),
  show: l('Wyświetlanie informacji o urządzeniu', 'Show running system information'),
  ping: l('Wysłanie żądań echa ICMP', 'Send echo messages'),
  traceroute: l('Śledzenie trasy do celu', 'Trace route to destination'),
  copy: l('Kopiowanie konfiguracji', 'Copy from one file to another'),
  write: l('Zapis konfiguracji', 'Write running configuration to memory'),
  memory: l('Zapis do pamięci NVRAM', 'Write to NV memory'),
  erase: l('Kasowanie pliku', 'Erase a filesystem'),
  clear: l('Czyszczenie tablic i liczników', 'Reset functions'),
  'running-config': l('Bieżąca konfiguracja (RAM)', 'Current operating configuration'),
  'startup-config': l('Konfiguracja startowa (NVRAM)', 'Contents of startup configuration'),
  ip: l('Polecenia protokołu IP', 'Global IP configuration subcommands'),
  interface: l('Wybór interfejsu do konfiguracji', 'Select an interface to configure'),
  interfaces: l('Stan interfejsów', 'Interface status and configuration'),
  brief: l('Skrócone podsumowanie', 'Brief summary'),
  route: l('Tablica routingu lub trasa statyczna', 'IP routing table or static route'),
  arp: l('Tablica ARP', 'ARP table'),
  'arp-cache': l('Pamięć podręczna ARP', 'Clear the entire ARP cache'),
  vlan: l('Konfiguracja VLAN-ów', 'VLAN commands'),
  mac: l('Tablica adresów MAC', 'MAC configuration'),
  'address-table': l('Tablica adresów MAC', 'MAC forwarding table'),
  dynamic: l('Wpisy dynamiczne', 'Dynamic entries'),
  trunk: l('Ustawienia trunka 802.1Q', 'Trunking parameters'),
  status: l('Stan portów', 'Show interface line status'),
  'spanning-tree': l('Protokół drzewa rozpinającego (STP)', 'Spanning Tree Subsystem'),
  ospf: l('Protokół OSPF', 'OSPF information'),
  neighbor: l('Sąsiedzi', 'Neighbor list'),
  protocols: l('Protokoły routingu', 'IP routing protocol process parameters and statistics'),
  dhcp: l('Serwer DHCP', 'Configure DHCP server and relay parameters'),
  binding: l('Przydzielone adresy', 'DHCP address bindings'),
  pool: l('Pula adresów DHCP', 'Configure DHCP address pools'),
  nat: l('Translacja adresów (NAT)', 'NAT configuration commands'),
  translations: l('Aktualne translacje', 'Translation entries'),
  'access-lists': l('Listy kontroli dostępu', 'List access lists'),
  'access-list': l('Lista kontroli dostępu (ACL)', 'Add an access list entry'),
  'access-group': l('Przypisanie listy ACL do interfejsu', 'Specify access control for packets'),
  version: l('Wersja systemu', 'System hardware and software status'),
  clock: l('Zegar systemowy', 'Display the system clock'),
  lldp: l('Protokół wykrywania sąsiadów LLDP', 'LLDP information'),
  neighbors: l('Sąsiednie urządzenia', 'LLDP neighbor entries'),
  history: l('Historia poleceń', 'Display the session command history'),
  hostname: l('Nazwa urządzenia', 'Set system\'s network name'),
  no: l('Negacja polecenia lub przywrócenie wartości domyślnych', 'Negate a command or set its defaults'),
  range: l('Zakres interfejsów', 'Interface range command'),
  routing: l('Włączenie routingu IP', 'Enable IP routing'),
  'default-gateway': l('Brama domyślna (urządzenie bez routingu)', 'Specify default gateway (if not routing IP)'),
  router: l('Proces routingu', 'Enable a routing process'),
  'excluded-address': l('Adresy wyłączone z puli', 'Prevent DHCP from assigning certain addresses'),
  inside: l('Strona wewnętrzna NAT', 'Inside address translation'),
  outside: l('Strona zewnętrzna NAT', 'Outside address translation'),
  source: l('Translacja adresu źródłowego', 'Source address translation'),
  list: l('Lista ACL określająca adresy', 'Specify access list describing local addresses'),
  overload: l('PAT: wiele adresów za jednym', 'Overload an address translation'),
  static: l('Translacja statyczna', 'Specify static local->global mapping'),
  permit: l('Zezwolenie', 'Specify packets to forward'),
  deny: l('Odrzucenie', 'Specify packets to reject'),
  any: l('Dowolny adres', 'Any source host'),
  host: l('Pojedynczy host', 'A single host address'),
  remark: l('Komentarz w liście ACL', 'Access list entry comment'),
  standard: l('Standardowa lista ACL (adres źródłowy)', 'Standard Access List'),
  extended: l('Rozszerzona lista ACL', 'Extended Access List'),
  icmp: l('Protokół ICMP', 'Internet Control Message Protocol'),
  tcp: l('Protokół TCP', 'Transmission Control Protocol'),
  udp: l('Protokół UDP', 'User Datagram Protocol'),
  mode: l('Tryb', 'Mode'),
  mst: l('Wspólne drzewo MST', 'Multiple spanning tree configuration'),
  'rapid-pvst': l('Osobne drzewo dla każdego VLAN-u', 'Per-VLAN rapid spanning tree mode'),
  priority: l('Priorytet mostu', 'Set the bridge priority'),
  root: l('Most główny', 'Configure switch as root'),
  primary: l('Główny', 'Configure this switch as primary root'),
  secondary: l('Zapasowy', 'Configure switch as secondary root'),
  banner: l('Komunikat powitalny', 'Define a login banner'),
  motd: l('Komunikat dnia', 'Set Message of the Day banner'),
  secret: l('Hasło zapisane jako skrót', 'Specify the secret'),
  username: l('Konto lokalnego użytkownika', 'Establish User Name Authentication'),
  password: l('Hasło', 'Set a password'),
  privilege: l('Poziom uprawnień', 'Set user privilege level'),
  'domain-name': l('Nazwa domeny', 'Define the default domain name'),
  domain: l('Ustawienia domeny', 'IP DNS Resolver'),
  name: l('Nazwa', 'Name'),
  'domain-lookup': l('Rozwiązywanie nazw przez DNS', 'Enable IP Domain Name System hostname translation'),
  crypto: l('Polecenia kryptograficzne', 'Encryption module'),
  key: l('Klucze', 'Long term key operations'),
  generate: l('Generowanie kluczy', 'Generate new keys'),
  rsa: l('Para kluczy RSA', 'Generate RSA keys'),
  modulus: l('Długość klucza w bitach', 'Provide number of modulus bits on the command line'),
  ssh: l('Bezpieczny dostęp SSH', 'Configure ssh options'),
  line: l('Linie terminala', 'Configure a terminal line'),
  vty: l('Linie zdalne (SSH, Telnet)', 'Virtual terminal'),
  console: l('Port konsoli', 'Primary terminal line'),
  service: l('Usługi systemowe', 'Modify use of network based services'),
  'password-encryption': l('Szyfrowanie haseł w konfiguracji', 'Encrypt system passwords'),
  run: l('Włączenie protokołu', 'Enable LLDP'),
  login: l('Wymaganie logowania', 'Enable password checking'),
  local: l('Konta lokalne', 'Local password checking'),
  transport: l('Dozwolone protokoły dostępu', 'Define transport protocols for line'),
  input: l('Połączenia przychodzące', 'Define which protocols to use when connecting to the terminal server'),
  telnet: l('Telnet (nieszyfrowany)', 'TCP/IP Telnet protocol'),
  all: l('Wszystkie', 'All protocols'),
  none: l('Żaden', 'No protocols'),
  'exec-timeout': l('Czas bezczynności do wylogowania', 'Set the EXEC timeout'),
  'logging': l('Ustawienia komunikatów', 'Modify message logging facilities'),
  synchronous: l('Komunikaty nie przerywają wpisywania', 'Synchronized message output'),
  address: l('Adres IP interfejsu', 'Set the IP address of an interface'),
  shutdown: l('Wyłączenie interfejsu', 'Shutdown the selected interface'),
  description: l('Opis interfejsu', 'Interface specific description'),
  switchport: l('Ustawienia portu warstwy 2', 'Set switching mode characteristics'),
  access: l('Port dostępowy', 'Set access mode characteristics of the interface'),
  native: l('VLAN natywny (bez tagu)', 'Set native VLAN when interface is in trunking mode'),
  allowed: l('Dozwolone VLAN-y', 'Set allowed VLAN characteristics when interface is in trunking mode'),
  add: l('Dodanie VLAN-ów', 'Add VLANs to the current list'),
  remove: l('Usunięcie VLAN-ów', 'Remove VLANs from the current list'),
  nonegotiate: l('Wyłączenie negocjacji DTP', 'Device will not engage in negotiation protocol on this interface'),
  portfast: l('Szybkie przejście portu do przekazywania', 'Spanning tree portfast options'),
  bpduguard: l('Ochrona przed ramkami BPDU', 'Don\'t accept BPDUs on this interface'),
  encapsulation: l('Enkapsulacja (np. 802.1Q)', 'Set encapsulation type for an interface'),
  dot1q: l('Tagowanie IEEE 802.1Q', 'IEEE 802.1Q Virtual LAN'),
  'helper-address': l('Przekaźnik DHCP (adres serwera)', 'Specify a destination address for UDP broadcasts'),
  in: l('Ruch przychodzący', 'Inbound packets'),
  out: l('Ruch wychodzący', 'Outbound packets'),
  cost: l('Koszt interfejsu', 'Interface cost'),
  network: l('Sieć', 'Network number'),
  area: l('Obszar OSPF', 'Set the OSPF area ID'),
  'router-id': l('Identyfikator routera', 'Router-id for this OSPF process'),
  'passive-interface': l('Interfejs bez sąsiedztw', 'Suppress routing updates on an interface'),
  'auto-cost': l('Obliczanie kosztu z przepustowości', 'Calculate OSPF interface cost according to bandwidth'),
  'reference-bandwidth': l('Przepustowość odniesienia (Mb/s)', 'Use reference bandwidth method to assign OSPF cost'),
  'default-information': l('Rozgłaszanie trasy domyślnej', 'Control distribution of default information'),
  originate: l('Rozgłaszaj', 'Distribute a default route'),
  'default-router': l('Brama domyślna dla klientów', 'Default routers'),
  'dns-server': l('Serwer DNS dla klientów', 'DNS servers'),
  lease: l('Czas dzierżawy', 'Address lease time'),
  repeat: l('Liczba pakietów', 'Specify repeat count'),
  'port-security': l('Ochrona portu limitem adresów MAC', 'Secure the port with a MAC address limit'),
  maximum: l('Największa liczba adresów MAC', 'Max secure addresses'),
  violation: l('Reakcja na naruszenie', 'Security violation mode'),
  protect: l('Odrzucaj po cichu', 'Security violation protect mode'),
  restrict: l('Odrzucaj i licz naruszenia', 'Security violation restrict mode'),
  'mac-address': l('Bezpieczny adres MAC', 'Secure mac address'),
  sticky: l('Zapamiętuj adresy w konfiguracji', 'Configure dynamic secure addresses as sticky'),
  snooping: l('Ochrona przed fałszywym serwerem DHCP', 'DHCP Snooping'),
  trust: l('Port zaufany (za nim jest prawdziwy serwer)', 'DHCP Snooping trust config'),
  information: l('Opcja 82 (informacje o porcie)', 'DHCP Snooping information'),
  option: l('Opcja DHCP', 'DHCP Snooping information option'),
  limit: l('Ograniczenie', 'DHCP Snooping limit'),
  rate: l('Liczba pakietów na sekundę', 'DHCP Snooping rate limit'),
  'channel-group': l('Dodanie portu do kanału EtherChannel', 'Etherchannel/port bundling configuration'),
  active: l('LACP aktywnie negocjuje kanał', 'Enable LACP unconditionally'),
  passive: l('LACP czeka na negocjację drugiej strony', 'Enable LACP only if a LACP device is detected'),
  on: l('Kanał bez negocjacji', 'Enable Etherchannel only'),
  etherchannel: l('Kanały EtherChannel', 'EtherChannel information'),
  summary: l('Podsumowanie', 'One-line summary per channel-group'),
  vrrp: l('Zapasowa brama VRRP', 'VRRP Interface configuration commands'),
  standby: l('Zapasowa brama HSRP', 'HSRP interface configuration commands'),
  preempt: l('Przejmowanie roli przez wyższy priorytet', 'Overthrow lower priority designated routers'),
  length: l('Liczba wierszy ekranu', 'Set number of lines on a screen'),
  '<cr>': l('Wykonaj', 'Execute'),
};
