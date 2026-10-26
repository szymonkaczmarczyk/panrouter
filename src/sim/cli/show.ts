import type { Simulator } from '../engine';
import { formatMacCisco, hostCount, ipToStr, prefixToMask } from '../ip';
import { formatIpv6 } from '../ip6';
import { modelOf } from '../catalog';
import type { L3If, Route } from '../topology';
import { parseVlanList, RADIO_PREFIX } from '../topology';
import type { Acl, AclEntry, AddrSpec, Device, Port, PortMatch, VirtualIf } from '../types';
import { shortIfName } from './iface';

export function pad(text: string | number, width: number): string {
  const value = String(text);
  return value.length >= width ? `${value} ` : value.padEnd(width);
}

export function padLeft(text: string | number, width: number): string {
  return String(text).padStart(width);
}

export function maskStr(prefix: number): string {
  return ipToStr(prefixToMask(prefix));
}

export function fakeHash(secret: string): string {
  let hash = 0x811c9dc5;
  for (const char of `panrouter:${secret}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const alphabet = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let out = '';
  let value = hash;
  for (let i = 0; i < 24; i++) {
    out += alphabet[(value + i * 7) % 64];
    value = Math.imul(value ^ (value >>> 13), 0x5bd1e995) >>> 0;
  }
  return `$9$${out.slice(0, 14)}$${out.slice(14)}`;
}

function ifStatus(sim: Simulator, device: Device, entry: L3If | null, port: Port | null, vif: VirtualIf | null): { status: string; protocol: string } {
  if (port) {
    if (port.shutdown) return { status: 'administratively down', protocol: 'down' };
    if (port.errDisabled) return { status: 'down', protocol: 'down' };
    const up = sim.topo.portUp(device, port.name);
    return { status: up ? 'up' : 'down', protocol: up ? 'up' : 'down' };
  }
  if (vif) {
    if (vif.shutdown) return { status: 'administratively down', protocol: 'down' };
    const up = entry?.up ?? false;
    if (vif.kind === 'svi') return { status: 'up', protocol: up ? 'up' : 'down' };
    if (vif.kind === 'loop') return { status: 'up', protocol: 'up' };
    if (vif.kind === 'tunnel') return { status: 'up', protocol: up ? 'up' : 'down' };
    const parent = device.ports.find((p) => p.name === vif.parent);
    if (parent?.shutdown) return { status: 'administratively down', protocol: 'down' };
    return { status: up ? 'up' : 'down', protocol: up ? 'up' : 'down' };
  }
  return { status: 'down', protocol: 'down' };
}

export function showIpIntBrief(sim: Simulator, device: Device): string[] {
  const lines = [`${pad('Interface', 23)}${pad('IP-Address', 16)}OK? Method Status                Protocol`];
  const l3 = sim.topo.l3Ifs(device);
  for (const port of device.ports) {
    const entry = l3.find((e) => e.attach.kind === 'port' && e.attach.port === port.name) ?? null;
    const { status, protocol } = ifStatus(sim, device, entry, port, null);
    const ip = !port.switchport && port.ip ? port.ip : 'unassigned';
    const method = port.dhcp && !port.switchport ? 'DHCP' : ip === 'unassigned' ? 'unset' : 'manual';
    lines.push(`${pad(port.name, 23)}${pad(ip, 16)}YES ${pad(method, 7)}${pad(status, 22)}${protocol}`);
  }
  for (const vif of device.vifs) {
    const entry = l3.find((e) => e.name === vif.name) ?? null;
    const { status, protocol } = ifStatus(sim, device, entry, null, vif);
    const ip = vif.ip || 'unassigned';
    lines.push(`${pad(vif.name, 23)}${pad(ip, 16)}YES ${pad(ip === 'unassigned' ? 'unset' : 'manual', 7)}${pad(status, 22)}${protocol}`);
  }
  return lines;
}

function mediaType(port: Port): string {
  if (port.media === 'fiber') return port.speed >= 25000 ? 'SFP-25GBase-SR' : 'SFP-10GBase-SR';
  return port.speed >= 10000 ? '100/1000/10GBaseT' : port.speed >= 2500 ? '100/1000/2.5GBaseT' : '10/100/1000BaseTX';
}

export function showInterfacesStatus(sim: Simulator, device: Device): string[] {
  const lines = [`${pad('Port', 13)}${pad('Name', 19)}${pad('Status', 13)}${pad('Vlan', 11)}Duplex  Speed  Type`];
  for (const port of device.ports) {
    const up = sim.topo.portUp(device, port.name);
    const status = port.shutdown ? 'disabled' : port.errDisabled ? 'err-disabled' : up ? 'connected' : 'notconnect';
    const vlan = !port.switchport ? 'routed' : port.mode === 'trunk' ? 'trunk' : String(port.accessVlan);
    const speed = up ? `a-${sim.topo.linkSpeed(device, port.name) >= 1000 ? `${sim.topo.linkSpeed(device, port.name) / 1000}G` : sim.topo.linkSpeed(device, port.name)}` : 'auto';
    lines.push(`${pad(port.short, 13)}${pad(port.description.slice(0, 18), 19)}${pad(status, 13)}${pad(vlan, 11)}${pad(up ? 'a-full' : 'auto', 8)}${pad(speed, 7)}${mediaType(port)}`);
  }
  return lines;
}

function joinPorts(names: string[]): string[] {
  const rows: string[] = [];
  for (let i = 0; i < names.length; i += 4) rows.push(names.slice(i, i + 4).join(', ') + (i + 4 < names.length ? ',' : ''));
  return rows.length ? rows : [''];
}

export function showVlanBrief(_sim: Simulator, device: Device): string[] {
  const lines = [
    `${pad('VLAN', 5)}${pad('Name', 33)}${pad('Status', 10)}Ports`,
    `${pad('----', 5)}${pad('--------------------------------', 33)}${pad('---------', 10)}-------------------------------`,
  ];
  for (const vlan of device.vlans) {
    const ports = device.ports.filter((p) => p.switchport && p.mode === 'access' && p.accessVlan === vlan.id).map((p) => p.short);
    const rows = joinPorts(ports);
    lines.push(`${pad(vlan.id, 5)}${pad(vlan.name, 33)}${pad('active', 10)}${rows[0]}`);
    for (const row of rows.slice(1)) lines.push(`${' '.repeat(48)}${row}`);
  }
  for (const id of [1002, 1003, 1004, 1005]) {
    const names: Record<number, string> = { 1002: 'fddi-default', 1003: 'token-ring-default', 1004: 'fddinet-default', 1005: 'trnet-default' };
    lines.push(`${pad(id, 5)}${pad(names[id], 33)}act/unsup`);
  }
  return lines;
}

function vlanListText(set: Set<number> | 'all'): string {
  if (set === 'all') return '1-4094';
  const sorted = [...set].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const value = sorted[i];
    if (value === prev + 1) {
      prev = value;
      continue;
    }
    if (start !== undefined) parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = value;
    prev = value;
  }
  return parts.join(',') || 'none';
}

export function showInterfacesTrunk(sim: Simulator, device: Device): string[] {
  const trunks = device.ports
    .filter((p) => p.switchport && p.mode === 'trunk' && sim.topo.portUp(device, p.name) && !sim.topo.memberInactive(device.id, p.name))
    .map((p) => ({ ...p, short: sim.topo.portLabel(device, p.name) }));
  if (!trunks.length) return [''];
  const lines = ['', `${pad('Port', 12)}${pad('Mode', 17)}${pad('Encapsulation', 15)}${pad('Status', 14)}Native vlan`];
  for (const port of trunks) lines.push(`${pad(port.short, 12)}${pad('on', 17)}${pad('802.1q', 15)}${pad('trunking', 14)}${port.nativeVlan}`);
  lines.push('', `${pad('Port', 12)}Vlans allowed on trunk`);
  for (const port of trunks) lines.push(`${pad(port.short, 12)}${vlanListText(parseVlanList(port.allowedVlans))}`);
  lines.push('', `${pad('Port', 12)}Vlans allowed and active in management domain`);
  for (const port of trunks) {
    const allowed = parseVlanList(port.allowedVlans);
    const active = new Set(device.vlans.map((v) => v.id).filter((id) => allowed === 'all' || allowed.has(id)));
    lines.push(`${pad(port.short, 12)}${vlanListText(active)}`);
  }
  lines.push('', `${pad('Port', 12)}Vlans in spanning tree forwarding state and not pruned`);
  for (const port of trunks) {
    const allowed = parseVlanList(port.allowedVlans);
    const active = new Set(device.vlans.map((v) => v.id).filter((id) => allowed === 'all' || allowed.has(id)));
    lines.push(`${pad(port.short, 12)}${sim.topo.stpBlocked(device.id, port.name) ? 'none' : vlanListText(active)}`);
  }
  return lines;
}

export function showMacTable(sim: Simulator, device: Device): string[] {
  const lines = ['          Mac Address Table', '-------------------------------------------', '', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----'];
  const entries = sim.macTable(device);
  for (const entry of entries) {
    const port = entry.port.startsWith(RADIO_PREFIX) ? 'Radio' : sim.topo.portLabel(device, entry.port);
    const owner = device.ports.find((p) => p.name === entry.port);
    const secure = owner?.portSecurity.enabled && sim.secureMacs(device, owner).includes(entry.mac);
    lines.push(`${padLeft(entry.vlan, 4)}    ${pad(formatMacCisco(entry.mac), 18)}${pad(secure ? 'STATIC' : 'DYNAMIC', 12)}${port}`);
  }
  lines.push(`Total Mac Addresses for this criterion: ${entries.length}`);
  return lines;
}

function routeLine(route: Route): string {
  const code = route.code === 'E2' ? 'O*E2' : `${route.code}${route.isDefault && route.code !== 'O' ? '*' : ''}`;
  const dest = `${ipToStr(route.net)}/${route.prefix}`;
  const ifName = route.ifName ? route.ifName : '';
  if (route.code === 'C' || route.code === 'L') return `${pad(code, 9)}${dest} is directly connected, ${ifName}`;
  const via = route.via !== null ? `via ${ipToStr(route.via)}` : `is directly connected`;
  const age = route.code === 'O' || route.code === 'E2' ? ', 00:02:14' : '';
  const out = ifName && route.code !== 'S' ? `, ${ifName}` : route.code === 'S' && route.via === null ? `, ${ifName}` : '';
  return `${pad(code, 9)}${dest} [${route.ad}/${route.metric}] ${via}${age}${out}`.replace('[0/0] is directly connected', `is directly connected`);
}

export function showIpRoute(sim: Simulator, device: Device): string[] {
  if (!sim.topo.isRouting(device)) {
    const gw = device.defaultGateway || 'not set';
    return [`Default gateway is ${gw}`, '', 'Host               Gateway           Last Use    Total Uses  Interface', 'ICMP redirect cache is empty'];
  }
  const routes = sim.topo.routes(device);
  const lines = [
    'Codes: L - local, C - connected, S - static, O - OSPF',
    '       E2 - OSPF external type 2, * - candidate default',
    '',
  ];
  const def = routes.find((r) => r.isDefault);
  if (def && def.via !== null) lines.push(`Gateway of last resort is ${ipToStr(def.via)} to network 0.0.0.0`, '');
  else lines.push('Gateway of last resort is not set', '');
  const sorted = [...routes].sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.net - b.net || a.prefix - b.prefix || (a.code === 'L' ? 1 : -1)));
  for (const route of sorted) lines.push(routeLine(route));
  return lines;
}

export function showArp(sim: Simulator, device: Device): string[] {
  const lines = [`${pad('Protocol', 10)}${pad('Address', 17)}${pad('Age (min)', 11)}${pad('Hardware Addr', 16)}${pad('Type', 7)}Interface`];
  const rows: { ip: number; age: string; mac: string; ifName: string }[] = [];
  for (const entry of sim.topo.l3Ifs(device)) {
    if (entry.ip === null || !entry.up || entry.attach.kind === 'loop' || entry.attach.kind === 'tunnel') continue;
    rows.push({ ip: entry.ip, age: '-', mac: entry.mac, ifName: entry.name });
  }
  for (const entry of sim.arpTable(device)) rows.push({ ip: entry.ip, age: '0', mac: entry.mac, ifName: entry.ifName });
  rows.sort((a, b) => a.ip - b.ip);
  for (const row of rows) {
    lines.push(`${pad('Internet', 10)}${pad(ipToStr(row.ip), 17)}${padLeft(row.age, 9)}  ${pad(formatMacCisco(row.mac), 16)}${pad('ARPA', 7)}${row.ifName}`);
  }
  return lines;
}

export function showOspfNeighbors(sim: Simulator, device: Device): string[] {
  const neighbors = sim.topo.ospf().neighbors.get(device.id) ?? [];
  const lines = ['', `${pad('Neighbor ID', 16)}${pad('Pri', 6)}${pad('State', 16)}${pad('Dead Time', 12)}${pad('Address', 16)}Interface`];
  for (const n of neighbors) {
    lines.push(`${pad(n.routerId, 16)}${pad('  1', 6)}${pad(n.state, 16)}${pad('00:00:34', 12)}${pad(ipToStr(n.address), 16)}${n.ifName}`);
  }
  return lines;
}

export function showIpProtocols(sim: Simulator, device: Device): string[] {
  if (!device.ospf) return ['*** IP Routing is NSF aware ***', ''];
  const ospf = device.ospf;
  const lines = [
    '*** IP Routing is NSF aware ***',
    '',
    `Routing Protocol is "ospf ${ospf.processId}"`,
    '  Outgoing update filter list for all interfaces is not set',
    '  Incoming update filter list for all interfaces is not set',
    `  Router ID ${ipToStr(sim.topo.routerId(device))}`,
    `  Reference bandwidth unit is ${ospf.refBw} mbps`,
    '  Routing for Networks:',
    ...ospf.networks.map((n) => `    ${n.net} ${n.wildcard} area ${n.area}`),
  ];
  if (ospf.passive.length) lines.push('  Passive Interface(s):', ...ospf.passive.map((p) => `    ${p}`));
  lines.push('  Distance: (default is 110)');
  return lines;
}

export function showDhcpBinding(_sim: Simulator, device: Device): string[] {
  const lines = ['Bindings from all pools not associated with VRF:', `${pad('IP address', 16)}${pad('Client-ID/Hardware address', 28)}${pad('Lease expiration', 24)}${pad('Type', 11)}State`];
  const expires = new Date(Date.now() + 86400000);
  const when = expires.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  for (const binding of device.dhcpBindings) {
    const mac = `01${binding.mac}`.match(/.{1,4}/g)!.join('.');
    lines.push(`${pad(binding.ip, 16)}${pad(mac, 28)}${pad(when, 24)}${pad('Automatic', 11)}Active`);
  }
  return lines;
}

export function showDhcpPool(_sim: Simulator, device: Device): string[] {
  const lines: string[] = [];
  for (const pool of device.dhcpPools) {
    const leased = device.dhcpBindings.filter((b) => b.pool === pool.name).length;
    lines.push(
      '',
      `Pool ${pool.name} :`,
      ` Utilization mark (high/low)    : 100 / 0`,
      ` Total addresses                : ${pool.network ? hostCount(pool.prefix) : 0}`,
      ` Leased addresses               : ${leased}`,
      ` Excluded addresses             : ${device.dhcpExcluded.length}`,
      ` Network                        : ${pool.network ? `${pool.network}/${pool.prefix}` : 'not set'}`,
      ` Default router                 : ${pool.router || 'not set'}`,
      ` DNS server                     : ${pool.dns || 'not set'}`,
    );
  }
  return lines.length ? lines : [''];
}

export function showNat(sim: Simulator, device: Device): string[] {
  const lines = [`${pad('Pro', 5)}${pad('Inside global', 23)}${pad('Inside local', 23)}${pad('Outside local', 23)}Outside global`];
  for (const e of sim.natTable(device)) {
    if (e.kind === 'static') {
      lines.push(`${pad('---', 5)}${pad(ipToStr(e.outsideIp), 23)}${pad(ipToStr(e.insideIp), 23)}${pad('---', 23)}---`);
      continue;
    }
    const remote = `${ipToStr(e.remoteIp)}:${e.insidePort}`;
    lines.push(`${pad(e.proto, 5)}${pad(`${ipToStr(e.outsideIp)}:${e.outsidePort}`, 23)}${pad(`${ipToStr(e.insideIp)}:${e.insidePort}`, 23)}${pad(remote, 23)}${remote}`);
  }
  return lines;
}

export function addrText(spec: AddrSpec, standard = false): string {
  if (spec.any) return 'any';
  if (spec.wildcard === '0.0.0.0') return standard ? spec.ip : `host ${spec.ip}`;
  return standard ? `${spec.ip}, wildcard bits ${spec.wildcard}` : `${spec.ip} ${spec.wildcard}`;
}

function portMatchText(match: PortMatch | null): string {
  if (!match) return '';
  const names: Record<number, string> = { 22: '22', 23: 'telnet', 25: 'smtp', 53: 'domain', 80: 'www', 443: '443', 123: 'ntp', 161: 'snmp' };
  if (match.op === 'range') return ` range ${match.a} ${match.b}`;
  return ` ${match.op} ${names[match.a] ?? match.a}`;
}

export function aclEntryText(acl: Acl, entry: AclEntry, forShow: boolean): string {
  if (entry.remark) return `remark ${entry.remark}`;
  if (acl.type === 'standard') return `${entry.action} ${forShow ? addrText(entry.src, true) : addrText(entry.src).replace(/^host /, '')}`;
  return `${entry.action} ${entry.proto} ${addrText(entry.src)}${portMatchText(entry.srcPort)} ${addrText(entry.dst)}${portMatchText(entry.dstPort)}`;
}

export function showAccessLists(_sim: Simulator, device: Device): string[] {
  const lines: string[] = [];
  for (const acl of device.acls) {
    lines.push(`${acl.type === 'standard' ? 'Standard' : 'Extended'} IP access list ${acl.name}`);
    acl.entries.forEach((entry, index) => {
      if (entry.remark) return;
      lines.push(`    ${(index + 1) * 10} ${aclEntryText(acl, entry, true)}`);
    });
  }
  return lines.length ? lines : [''];
}

export function showSpanningTree(sim: Simulator, device: Device): string[] {
  const info = sim.topo.stpInfo(device.id);
  if (!info) return ['No spanning tree instance exists.'];
  const [rootPrio, rootMac] = info.rootId.split('.');
  const [myPrio, myMac] = info.bridgeId.split('.');
  const lines = [
    'MST0',
    '  Spanning tree enabled protocol mstp',
    `  Root ID    Priority    ${Number(rootPrio)}`,
    `             Address     ${formatMacCisco(rootMac)}`,
  ];
  if (info.isRoot) lines.push('             This bridge is the root');
  else lines.push(`             Cost        ${info.rootCost}`, `             Port        ${shortIfName(device, info.rootPort ?? '')}`);
  lines.push(
    '',
    `  Bridge ID  Priority    ${Number(myPrio)}`,
    `             Address     ${formatMacCisco(myMac)}`,
    '',
    `${pad('Interface', 20)}${pad('Role', 5)}${pad('Sts', 4)}${pad('Cost', 10)}${pad('Prio.Nbr', 9)}Type`,
    `${pad('-------------------', 20)}${pad('----', 5)}${pad('---', 4)}${pad('---------', 10)}${pad('--------', 9)}--------`,
  );
  for (const port of device.ports) {
    const role = info.ports.get(port.name);
    if (!role) continue;
    const roleText = role.role === 'root' ? 'Root' : role.role === 'designated' ? 'Desg' : 'Altn';
    const sts = role.role === 'alternate' ? 'BLK' : 'FWD';
    const index = device.ports.indexOf(port) + 1;
    lines.push(`${pad(sim.topo.portLabel(device, port.name), 20)}${pad(roleText, 5)}${pad(sts, 4)}${pad(role.cost, 10)}${pad(`128.${index}`, 9)}P2p`);
  }
  return lines;
}

export function showVersion(_sim: Simulator, device: Device): string[] {
  const spec = modelOf(device.kind);
  const counts = new Map<string, number>();
  for (const port of device.ports) {
    const label = port.speed >= 25000 ? 'Twenty Five Gigabit Ethernet' : port.speed >= 10000 ? 'Ten Gigabit Ethernet' : 'Gigabit Ethernet';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [
    `PanRouter OS Software, ${spec.model} Software, Version 17.15.2`,
    'Symulowane oprogramowanie sieciowe projektu PanRouter.',
    '',
    `${device.name} uptime is 1 hour, 12 minutes`,
    'System image file is "flash:panrouter-os.17.15.2.bin"',
    '',
    `${spec.model} processor with 4194304K bytes of memory.`,
    ...[...counts].map(([label, count]) => `${count} ${label} interfaces`),
    '32768K bytes of non-volatile configuration memory.',
    '',
    'Configuration register is 0x2102',
  ];
}

export function showLldp(sim: Simulator, device: Device): string[] {
  const lines = [
    'Capability codes:',
    '    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device',
    '    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other',
    '',
    `${pad('Device ID', 20)}${pad('Local Intf', 15)}${pad('Hold-time', 11)}${pad('Capability', 16)}Port ID`,
  ];
  let count = 0;
  for (const port of device.ports) {
    if (!sim.topo.portUp(device, port.name)) continue;
    const end = sim.topo.peer(device.id, port.name);
    if (!end) continue;
    const peer = sim.topo.device(end.dev);
    if (!peer) continue;
    const peerPort = sim.topo.port(peer, end.port);
    const cap = peer.kind === 'router' || peer.kind === 'homeRouter' || peer.kind === 'firewall' ? 'R' : peer.kind === 'switch' ? 'B' : peer.kind === 'l3switch' ? 'B,R' : peer.kind === 'ap' ? 'W' : peer.kind === 'voip' ? 'T' : 'S';
    lines.push(`${pad(peer.name, 20)}${pad(port.short, 15)}${pad(120, 11)}${pad(cap, 16)}${peerPort?.short ?? end.port}`);
    count++;
  }
  lines.push('', `Total entries displayed: ${count}`);
  return lines;
}

export function showInterface(sim: Simulator, device: Device, name: string): string[] {
  const port = device.ports.find((p) => p.name === name);
  const vif = device.vifs.find((v) => v.name === name);
  const entry = sim.topo.l3If(device, name) ?? null;
  const { status, protocol } = ifStatus(sim, device, entry, port ?? null, vif ?? null);
  const mac = port?.mac ?? (vif?.kind === 'sub' ? device.ports.find((p) => p.name === vif.parent)?.mac : device.baseMac) ?? device.baseMac;
  const lines = [`${name} is ${status}, line protocol is ${protocol}${port?.errDisabled ? ' (err-disabled)' : ''}`, `  Hardware is ${modelOf(device.kind).model}, address is ${formatMacCisco(mac)} (bia ${formatMacCisco(mac)})`];
  const description = port?.description || vif?.description;
  if (description) lines.push(`  Description: ${description}`);
  const ip = port && !port.switchport ? port.ip : vif?.ip;
  const prefix = port?.prefix ?? vif?.prefix ?? 24;
  if (ip) lines.push(`  Internet address is ${ip}/${prefix}`);
  const speed = port ? sim.topo.linkSpeed(device, port.name) || port.speed : 1000;
  lines.push(`  MTU 1500 bytes, BW ${speed * 1000} Kbit/sec, DLY 10 usec,`);
  if (vif?.kind === 'sub') lines.push(`  Encapsulation 802.1Q Virtual LAN, Vlan ID  ${vif.vlan}.`);
  if (port) {
    lines.push(`  ${protocol === 'up' ? 'Full-duplex' : 'Auto-duplex'}, ${protocol === 'up' ? `${speed}Mb/s` : 'Auto-speed'}, media type is ${port.media === 'fiber' ? 'SFP' : 'RJ45'}`);
    lines.push('  5 minute input rate 0 bits/sec, 0 packets/sec', '  5 minute output rate 0 bits/sec, 0 packets/sec');
  }
  return lines;
}

export function showClock(): string[] {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).replace(/,/g, '');
  return [`*${time}.${String(now.getMilliseconds()).padStart(3, '0')} CET ${date}`];
}

function portLines(device: Device, port: Port): string[] {
  const lines = [`interface ${port.name}`];
  if (port.description) lines.push(` description ${port.description}`);
  if (port.switchport) {
    if (device.kind === 'homeRouter') return lines;
    if (port.mode === 'access') {
      if (port.accessVlan !== 1) lines.push(` switchport access vlan ${port.accessVlan}`);
      lines.push(' switchport mode access');
    } else {
      if (port.nativeVlan !== 1) lines.push(` switchport trunk native vlan ${port.nativeVlan}`);
      if (port.allowedVlans && port.allowedVlans !== 'all') lines.push(` switchport trunk allowed vlan ${port.allowedVlans}`);
      lines.push(' switchport mode trunk');
    }
    const sec = port.portSecurity;
    if (sec.enabled || sec.sticky || sec.macs.length) {
      if (sec.maximum !== 1) lines.push(` switchport port-security maximum ${sec.maximum}`);
      if (sec.violation !== 'shutdown') lines.push(` switchport port-security violation ${sec.violation}`);
      for (const mac of sec.macs) lines.push(` switchport port-security mac-address ${formatMacCisco(mac)}`);
      if (sec.sticky) lines.push(' switchport port-security mac-address sticky');
      for (const mac of sec.stickyMacs) lines.push(` switchport port-security mac-address sticky ${formatMacCisco(mac)}`);
      if (sec.enabled) lines.push(' switchport port-security');
    }
    if (port.channelGroup > 0) lines.push(` channel-group ${port.channelGroup} mode ${port.channelMode || 'on'}`);
    if (port.dhcpTrust) lines.push(' ip dhcp snooping trust');
  } else {
    if (device.kind === 'l3switch') lines.push(' no switchport');
    if (port.dhcp) lines.push(' ip address dhcp');
    else if (port.ip) lines.push(` ip address ${port.ip} ${maskStr(port.prefix)}`);
    else lines.push(' no ip address');
    l3Extras(port, lines);
  }
  if (port.shutdown) lines.push(' shutdown');
  return lines;
}

function l3Extras(cfg: Port | VirtualIf, lines: string[]): void {
  if (cfg.helper) lines.push(` ip helper-address ${cfg.helper}`);
  if (cfg.nat) lines.push(` ip nat ${cfg.nat}`);
  if (cfg.aclIn) lines.push(` ip access-group ${cfg.aclIn} in`);
  if (cfg.aclOut) lines.push(` ip access-group ${cfg.aclOut} out`);
  if (cfg.ospfCost) lines.push(` ip ospf cost ${cfg.ospfCost}`);
  if (cfg.ipv6Enable) lines.push(' ipv6 enable');
  for (const address of cfg.ipv6) lines.push(` ipv6 address ${address.toUpperCase()}`);
  if (cfg.ndManaged) lines.push(' ipv6 nd managed-config-flag');
  if (cfg.ndOther) lines.push(' ipv6 nd other-config-flag');
  if (cfg.dhcp6Server) lines.push(` ipv6 dhcp server ${cfg.dhcp6Server}`);
  if (cfg.ospf6Pid) lines.push(` ipv6 ospf ${cfg.ospf6Pid} area ${cfg.ospf6Area}`);
  const group = cfg.fhrp;
  if (!group) return;
  if (group.proto === 'vrrp') {
    if (group.ip) lines.push(` vrrp ${group.group} ip ${group.ip}`);
    if (group.priority !== 100) lines.push(` vrrp ${group.group} priority ${group.priority}`);
    if (!group.preempt) lines.push(` no vrrp ${group.group} preempt`);
  } else {
    if (group.ip) lines.push(` standby ${group.group} ip ${group.ip}`);
    if (group.priority !== 100) lines.push(` standby ${group.group} priority ${group.priority}`);
    if (group.preempt) lines.push(` standby ${group.group} preempt`);
  }
}

function vifLines(vif: VirtualIf): string[] {
  const lines = [`interface ${vif.name}`];
  if (vif.description) lines.push(` description ${vif.description}`);
  if (vif.kind === 'sub') lines.push(` encapsulation dot1Q ${vif.vlan}`);
  lines.push(vif.ip ? ` ip address ${vif.ip} ${maskStr(vif.prefix)}` : ' no ip address');
  l3Extras(vif, lines);
  if (vif.kind === 'tunnel') {
    if (vif.tunnelSource) lines.push(` tunnel source ${vif.tunnelSource}`);
    if (vif.tunnelMode === 'ipsec') lines.push(' tunnel mode ipsec ipv4');
    if (vif.tunnelDest) lines.push(` tunnel destination ${vif.tunnelDest}`);
    if (vif.tunnelProtection) lines.push(` tunnel protection ipsec profile ${vif.tunnelProtection}`);
  }
  if (vif.shutdown) lines.push(' shutdown');
  return lines;
}

export function runningConfig(_sim: Simulator, device: Device): string[] {
  const m = device.mgmt;
  const out: string[] = ['Building configuration...', '', 'Current configuration : 2048 bytes', '!', 'version 17.15'];
  out.push(m.passwordEncryption ? 'service password-encryption' : 'no service password-encryption', '!', `hostname ${device.name}`, '!');
  if (m.enableSecret) out.push(`enable secret 9 ${m.enableSecret}`, '!');
  if (m.domain) out.push(`ip domain name ${m.domain}`);
  for (const range of device.dhcpExcluded) out.push(`ip dhcp excluded-address ${range.from}${range.to && range.to !== range.from ? ` ${range.to}` : ''}`);
  for (const pool of device.dhcpPools) {
    out.push('!', `ip dhcp pool ${pool.name}`);
    if (pool.network) out.push(` network ${pool.network} ${maskStr(pool.prefix)}`);
    if (pool.router) out.push(` default-router ${pool.router}`);
    if (pool.dns) out.push(` dns-server ${pool.dns}`);
    if (pool.domain) out.push(` domain-name ${pool.domain}`);
  }
  if (device.dhcpPools.length || device.dhcpExcluded.length || m.domain) out.push('!');
  for (const user of m.users) out.push(`username ${user.name} secret 9 ${user.secret}`);
  if (m.users.length) out.push('!');
  if (device.kind === 'switch' || device.kind === 'l3switch') {
    if (device.stpPriority !== 32768) out.push(`spanning-tree mst 0 priority ${device.stpPriority}`);
    out.push('spanning-tree mode mst', '!');
    for (const vlan of device.vlans) {
      if (vlan.id === 1) continue;
      out.push(`vlan ${vlan.id}`, ` name ${vlan.name}`, '!');
    }
    if (device.dhcpSnooping.vlans.length) out.push(`ip dhcp snooping vlan ${compactList(device.dhcpSnooping.vlans)}`);
    if (device.dhcpSnooping.enabled) out.push('ip dhcp snooping');
    if (device.dhcpSnooping.enabled || device.dhcpSnooping.vlans.length) out.push('!');
  }
  if (device.kind === 'l3switch' && device.ipRouting) out.push('ip routing', '!');
  for (const key of device.cryptoKeys) out.push(`crypto isakmp key ${key.key} address ${key.peer}`);
  if (device.cryptoKeys.length) out.push('!');
  for (const profile of device.ipsecProfiles) out.push(`crypto ipsec profile ${profile}`, '!');
  if (device.ipv6Routing) out.push('ipv6 unicast-routing', '!');
  for (const pool of device.dhcp6Pools) {
    out.push(`ipv6 dhcp pool ${pool.name}`);
    if (pool.prefix) out.push(` address prefix ${pool.prefix.toUpperCase()}`);
    if (pool.dns) out.push(` dns-server ${pool.dns.toUpperCase()}`);
    if (pool.domain) out.push(` domain-name ${pool.domain}`);
    out.push('!');
  }
  for (const group of [...new Set(device.ports.filter((p) => p.switchport && p.channelGroup > 0).map((p) => p.channelGroup))].sort((a, b) => a - b)) {
    const reference = device.ports.find((p) => p.switchport && p.channelGroup === group)!;
    const lines = [`interface Port-channel${group}`];
    if (reference.mode === 'trunk') {
      if (reference.nativeVlan !== 1) lines.push(` switchport trunk native vlan ${reference.nativeVlan}`);
      if (reference.allowedVlans && reference.allowedVlans !== 'all') lines.push(` switchport trunk allowed vlan ${reference.allowedVlans}`);
      lines.push(' switchport mode trunk');
    } else {
      if (reference.accessVlan !== 1) lines.push(` switchport access vlan ${reference.accessVlan}`);
      lines.push(' switchport mode access');
    }
    out.push(...lines, '!');
  }
  for (const port of device.ports) {
    out.push(...portLines(device, port), '!');
    for (const vif of device.vifs.filter((v) => v.kind === 'sub' && v.parent === port.name)) out.push(...vifLines(vif), '!');
  }
  for (const vif of device.vifs.filter((v) => v.kind !== 'sub')) out.push(...vifLines(vif), '!');
  if (device.ospf) {
    const o = device.ospf;
    out.push(`router ospf ${o.processId}`);
    if (o.routerId) out.push(` router-id ${o.routerId}`);
    if (o.refBw !== 100) out.push(` auto-cost reference-bandwidth ${o.refBw}`);
    for (const p of o.passive) out.push(` passive-interface ${p}`);
    for (const n of o.networks) out.push(` network ${n.net} ${n.wildcard} area ${n.area}`);
    if (o.defaultOriginate) out.push(' default-information originate');
    out.push('!');
  }
  if (device.ospf6) {
    const o = device.ospf6;
    out.push(`ipv6 router ospf ${o.processId}`);
    if (o.routerId) out.push(` router-id ${o.routerId}`);
    for (const p of o.passive) out.push(` passive-interface ${p}`);
    if (o.defaultOriginate) out.push(' default-information originate');
    out.push('!');
  }
  for (const rule of device.nat) {
    if (rule.kind === 'pat') out.push(`ip nat inside source list ${rule.acl} interface ${rule.iface} overload`);
    else out.push(`ip nat inside source static ${rule.inside} ${rule.outside}`);
  }
  for (const route of device.routes) {
    out.push(`ip route ${route.net} ${maskStr(route.prefix)} ${route.iface || route.via}${route.iface && route.via ? ` ${route.via}` : ''}${route.ad !== 1 ? ` ${route.ad}` : ''}`);
  }
  if (device.defaultGateway) out.push(`ip default-gateway ${device.defaultGateway}`);
  for (const route of device.routes6) out.push(`ipv6 route ${route.net.toUpperCase()}/${route.prefix}${route.iface ? ` ${route.iface}` : ''}${route.via ? ` ${route.via.toUpperCase()}` : ''}`);
  if (m.sshV2) out.push('ip ssh version 2');
  out.push('!');
  for (const acl of device.acls) {
    if (/^\d+$/.test(acl.name)) {
      for (const entry of acl.entries) out.push(`access-list ${acl.name} ${aclEntryText(acl, entry, false)}`);
    } else {
      out.push(`ip access-list ${acl.type} ${acl.name}`);
      for (const entry of acl.entries) out.push(` ${aclEntryText(acl, entry, false)}`);
    }
  }
  if (device.acls.length) out.push('!');
  if (device.banner) out.push(`banner motd ^C${device.banner}^C`, '!');
  out.push('line con 0');
  if (m.consolePassword) out.push(` password ${m.passwordEncryption ? `7 ${type7(m.consolePassword)}` : m.consolePassword}`);
  if (m.consoleLogin) out.push(' login');
  out.push('line vty 0 4');
  if (m.execTimeout !== 10) out.push(` exec-timeout ${m.execTimeout} 0`);
  if (m.vtyPassword) out.push(` password ${m.passwordEncryption ? `7 ${type7(m.vtyPassword)}` : m.vtyPassword}`);
  if (m.vtyLogin === 'local') out.push(' login local');
  else if (m.vtyLogin === 'password') out.push(' login');
  if (m.vtyTransport) out.push(` transport input ${m.vtyTransport}`);
  out.push('!', 'end');
  return out;
}

const upper6 = (value: bigint) => formatIpv6(value).toUpperCase();

export function showIpv6IntBrief(sim: Simulator, device: Device): string[] {
  const lines: string[] = [];
  const l3 = sim.topo.l3Ifs(device);
  const names = [...device.ports.filter((p) => !p.switchport).map((p) => p.name), ...device.vifs.map((v) => v.name)];
  for (const name of names) {
    const port = device.ports.find((p) => p.name === name) ?? null;
    const vif = device.vifs.find((v) => v.name === name) ?? null;
    const entry = l3.find((e) => e.name === name) ?? null;
    const { status, protocol } = ifStatus(sim, device, entry, port, vif);
    lines.push(`${pad(name, 31)}[${status}/${protocol}]`);
    const v6 = sim.topo.ip6If(device, name);
    if (!v6) lines.push('    unassigned');
    else for (const a of v6.addrs) lines.push(`    ${upper6(a.addr)}`);
  }
  return lines.length ? lines : [''];
}

export function showIpv6Route(sim: Simulator, device: Device): string[] {
  const routes = sim.topo.routes6(device);
  const lines = [`IPv6 Routing Table - default - ${routes.length} entries`, 'Codes: C - Connected, L - Local, S - Static, ND - ND Default', '       O - OSPF Intra, OE2 - OSPF ext 2', ''];
  for (const route of routes) {
    const ad = route.code === 'S' ? '[1/0]' : route.code === 'ND' ? '[2/0]' : route.code === 'O' || route.code === 'OE2' ? `[110/${route.metric ?? 1}]` : '[0/0]';
    lines.push(`${pad(route.code, 4)}${upper6(route.net)}/${route.prefix} ${ad}`);
    if (route.code === 'C') lines.push(`     via ${route.ifName}, directly connected`);
    else if (route.code === 'L') lines.push(`     via ${route.ifName}, receive`);
    else lines.push(`     via ${route.via !== null ? upper6(route.via) : ''}${route.ifName ? `, ${route.ifName}` : ''}`);
  }
  return lines;
}

export function showOspf6Neighbors(sim: Simulator, device: Device): string[] {
  if (!device.ospf6) return [''];
  const neighbors = sim.topo.ospf6().neighbors.get(device.id) ?? [];
  const lines = ['', `          OSPFv3 Router with ID (${ipToStr(sim.topo.routerId6(device))}) (Process ID ${device.ospf6.processId})`, '', `${pad('Neighbor ID', 16)}${pad('Pri', 6)}${pad('State', 16)}${pad('Dead Time', 12)}${pad('Interface ID', 14)}Interface`];
  for (const n of neighbors) {
    const peer = sim.net.devices.find((d) => d.id === n.peerDev);
    const peerIndex = peer ? Math.max(1, [...peer.ports.map((p) => p.name), ...peer.vifs.map((v) => v.name)].indexOf(n.peerIf) + 1) : 1;
    lines.push(`${pad(n.routerId, 16)}${pad('  1', 6)}${pad(n.state, 16)}${pad('00:00:36', 12)}${pad(peerIndex, 14)}${shortIfName(device, n.ifName)}`);
  }
  return lines;
}

function tunnels(sim: Simulator, device: Device) {
  return device.vifs
    .filter((v) => v.kind === 'tunnel' && v.tunnelMode === 'ipsec')
    .map((vif) => ({ vif, src: sim.topo.tunnelSourceIp(device, vif), peer: sim.topo.tunnelPeer(device, vif), up: sim.topo.tunnelUp(device, vif) }));
}

export function showIsakmpSa(sim: Simulator, device: Device): string[] {
  const lines = ['IPv4 Crypto ISAKMP SA', `${pad('dst', 16)}${pad('src', 16)}${pad('state', 12)}${pad('conn-id', 8)}status`];
  let id = 1001;
  for (const t of tunnels(sim, device)) {
    if (t.src === null || !t.peer) continue;
    lines.push(`${pad(t.vif.tunnelDest, 16)}${pad(ipToStr(t.src), 16)}${pad(t.up ? 'QM_IDLE' : 'MM_KEY_EXCH', 12)}${pad(id++, 8)}${t.up ? 'ACTIVE' : 'FAILED'}`);
  }
  return lines;
}

export function showIpsecSa(sim: Simulator, device: Device): string[] {
  const lines: string[] = [];
  for (const t of tunnels(sim, device)) {
    lines.push('', `interface: ${t.vif.name}`, `    Crypto map tag: ${t.vif.name}-head-0, local addr ${t.src !== null ? ipToStr(t.src) : '0.0.0.0'}`, '', `   current_peer ${t.vif.tunnelDest || '0.0.0.0'} port 500`);
    lines.push(`     PERMIT, flags={origin_is_acl,}`, `   local crypto endpt.: ${t.src !== null ? ipToStr(t.src) : '0.0.0.0'}, remote crypto endpt.: ${t.vif.tunnelDest || '0.0.0.0'}`);
    lines.push(`     inbound esp sas: ${t.up ? '1' : '0'}`, `     outbound esp sas: ${t.up ? '1' : '0'}`, `     Status: ${t.up ? 'ACTIVE(ACTIVE)' : 'DOWN'}`);
  }
  return lines.length ? lines : [''];
}

export function showDhcp6Pool(_sim: Simulator, device: Device): string[] {
  const lines: string[] = [];
  for (const pool of device.dhcp6Pools) {
    lines.push(`DHCPv6 pool: ${pool.name}`);
    if (pool.prefix) lines.push(`  Address allocation prefix: ${pool.prefix.toUpperCase()} valid 172800 preferred 86400`);
    if (pool.dns) lines.push(`  DNS server: ${pool.dns.toUpperCase()}`);
    if (pool.domain) lines.push(`  Domain name: ${pool.domain}`);
    const users = [...device.ports, ...device.vifs].filter((cfg) => cfg.dhcp6Server === pool.name).length;
    lines.push(`  Active clients: 0`, `  Interfaces using the pool: ${users}`);
  }
  return lines.length ? lines : [''];
}

export function showIpv6Neighbors(sim: Simulator, device: Device): string[] {
  const lines = [`${pad('IPv6 Address', 42)}${pad('Age', 4)}${pad('Link-layer Addr', 16)}${pad('State', 6)}Interface`];
  for (const entry of sim.ndTable(device)) lines.push(`${pad(upper6(entry.ip), 42)}${pad(0, 4)}${pad(formatMacCisco(entry.mac), 16)}${pad('REACH', 6)}${shortIfName(device, entry.ifName)}`);
  return lines;
}

function compactList(ids: number[]): string {
  const sorted = [...ids].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? `${start}` : `${start}-${sorted[i]}`);
  }
  return parts.join(',');
}

const VIOLATION_LABEL: Record<string, string> = { shutdown: 'Shutdown', restrict: 'Restrict', protect: 'Protect' };

export function showPortSecurity(sim: Simulator, device: Device): string[] {
  const lines = [
    'Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action',
    '                (Count)       (Count)          (Count)',
    '---------------------------------------------------------------------------',
  ];
  for (const port of device.ports.filter((p) => p.portSecurity.enabled)) {
    const current = sim.secureMacs(device, port).length;
    const violations = sim.violation(device, port).count;
    lines.push(`${padLeft(port.short, 11)}${padLeft(port.portSecurity.maximum, 15)}${padLeft(current, 13)}${padLeft(violations, 19)}${padLeft(VIOLATION_LABEL[port.portSecurity.violation], 16)}`);
  }
  lines.push('---------------------------------------------------------------------------', 'Total Addresses in System (excluding one mac per port)     : 0', 'Max Addresses limit in System (excluding one mac per port) : 4096');
  return lines;
}

export function showPortSecurityInterface(sim: Simulator, device: Device, name: string): string[] {
  const port = device.ports.find((p) => p.name === name);
  if (!port || !port.switchport) return ['% Port security is not supported on this interface'];
  const sec = port.portSecurity;
  const record = sim.violation(device, port);
  const status = !sec.enabled ? 'Secure-down' : port.errDisabled ? 'Secure-shutdown' : sim.topo.portUp(device, port.name) ? 'Secure-up' : 'Secure-down';
  const last = record.last || [...sec.stickyMacs, ...sec.macs].at(-1) || '';
  return [
    `Port Security              : ${sec.enabled ? 'Enabled' : 'Disabled'}`,
    `Port Status                : ${status}`,
    `Violation Mode             : ${VIOLATION_LABEL[sec.violation]}`,
    'Aging Time                 : 0 mins',
    'Aging Type                 : Absolute',
    'SecureStatic Address Aging : Disabled',
    `Maximum MAC Addresses      : ${sec.maximum}`,
    `Total MAC Addresses        : ${sim.secureMacs(device, port).length}`,
    `Configured MAC Addresses   : ${sec.macs.length}`,
    `Sticky MAC Addresses       : ${sec.stickyMacs.length}`,
    `Last Source Address:Vlan   : ${last ? `${formatMacCisco(last)}:${port.accessVlan}` : '0000.0000.0000:0'}`,
    `Security Violation Count   : ${record.count}`,
  ];
}

export function showDhcpSnooping(_sim: Simulator, device: Device): string[] {
  const snooping = device.dhcpSnooping;
  const lines = [
    `Switch DHCP snooping is ${snooping.enabled ? 'enabled' : 'disabled'}`,
    'DHCP snooping is configured on following VLANs:',
    snooping.vlans.length ? compactList(snooping.vlans) : 'none',
    'DHCP snooping is operational on following VLANs:',
    snooping.enabled && snooping.vlans.length ? compactList(snooping.vlans.filter((v) => device.vlans.some((x) => x.id === v))) || 'none' : 'none',
    'Insertion of option 82 is disabled',
    '',
    `${pad('Interface', 25)}${pad('Trusted', 12)}${pad('Allow option', 15)}Rate limit (pps)`,
    `${pad('-----------------------', 25)}${pad('-------', 12)}${pad('------------', 15)}----------------`,
  ];
  for (const port of device.ports.filter((p) => p.dhcpTrust)) lines.push(`${pad(port.name, 25)}${pad('yes', 12)}${pad('yes', 15)}unlimited`);
  return lines;
}

export function showDhcpSnoopingBinding(sim: Simulator, device: Device): string[] {
  const bindings = sim.snoopingBindings(device);
  const lines = [
    `${pad('MacAddress', 20)}${pad('IpAddress', 17)}${pad('Lease(sec)', 12)}${pad('Type', 15)}${pad('VLAN', 6)}Interface`,
    `${pad('------------------', 20)}${pad('---------------', 17)}${pad('----------', 12)}${pad('-------------', 15)}${pad('----', 6)}--------------------`,
  ];
  for (const binding of bindings) {
    lines.push(`${pad(formatMacColonUpper(binding.mac), 20)}${pad(ipToStr(binding.ip), 17)}${pad(86400, 12)}${pad('dhcp-snooping', 15)}${pad(binding.vlan, 6)}${binding.port ? sim.topo.portLabel(device, binding.port) : '-'}`);
  }
  lines.push(`Total number of bindings: ${bindings.length}`);
  return lines;
}

function formatMacColonUpper(mac: string): string {
  return mac.toUpperCase().match(/.{2}/g)!.join(':');
}

const MEMBER_FLAG: Record<string, string> = { primary: 'P', bundled: 'P', individual: 'I', suspended: 's', down: 'D' };

export function showEtherchannelSummary(sim: Simulator, device: Device): string[] {
  const channels = sim.topo.channels(device);
  const lines = [
    'Flags:  D - down        P - bundled in port-channel',
    '        I - stand-alone s - suspended',
    '        S - Layer2      U - in use',
    '',
    `Number of channel-groups in use: ${channels.length}`,
    `Number of aggregators:           ${channels.length}`,
    '',
    'Group  Port-channel  Protocol    Ports',
    '------+-------------+-----------+-----------------------------------------------',
  ];
  for (const channel of channels) {
    const inUse = channel.members.some((m) => m.state === 'primary' || m.state === 'bundled');
    const ports = channel.members.map((m) => `${m.port.short}(${MEMBER_FLAG[m.state]})`).join(' ');
    lines.push(`${pad(channel.group, 7)}${pad(`Po${channel.group}(S${inUse ? 'U' : 'D'})`, 14)}${pad(channel.lacp ? 'LACP' : '-', 12)}${ports}`);
  }
  return lines;
}

function fhrpRows(sim: Simulator, device: Device, proto: 'vrrp' | 'hsrp') {
  return sim.topo
    .l3Ifs(device)
    .filter((entry) => entry.cfg.fhrp?.proto === proto)
    .map((entry) => ({ entry, group: entry.cfg.fhrp!, state: sim.topo.fhrpOf(device, entry) }));
}

export function showVrrpBrief(sim: Simulator, device: Device): string[] {
  const lines = [`${pad('Interface', 19)}${pad('Grp', 4)}${pad('Pri', 4)}${pad('Time', 6)}${pad('Own', 4)}${pad('Pre', 4)}${pad('State', 8)}${pad('Master addr', 16)}Group addr`];
  for (const { entry, group, state } of fhrpRows(sim, device, 'vrrp')) {
    const status = !state ? 'Init' : state.active ? 'Master' : 'Backup';
    const master = state ? ipToStr(state.activeIp) : '0.0.0.0';
    lines.push(`${pad(shortIfName(device, entry.name), 19)}${pad(group.group, 4)}${pad(state?.priority ?? group.priority, 4)}${pad(3609, 6)}${pad(state?.priority === 255 ? 'Y' : '', 4)}${pad(group.preempt ? 'Y' : '', 4)}${pad(status, 8)}${pad(master, 16)}${group.ip || 'unknown'}`);
  }
  return lines;
}

export function showStandbyBrief(sim: Simulator, device: Device): string[] {
  const lines = [
    '                     P indicates configured to preempt.',
    '                     |',
    `${pad('Interface', 12)}${pad('Grp', 5)}${pad('Pri', 4)}${pad('P', 2)}${pad('State', 8)}${pad('Active', 16)}${pad('Standby', 16)}Virtual IP`,
  ];
  for (const { entry, group, state } of fhrpRows(sim, device, 'hsrp')) {
    const status = !state ? 'Init' : state.active ? 'Active' : state.standbyIp === entry.ip ? 'Standby' : 'Listen';
    const active = !state ? 'unknown' : state.active ? 'local' : ipToStr(state.activeIp);
    const standby = !state ? 'unknown' : state.standbyIp === entry.ip ? 'local' : state.standbyIp !== null ? ipToStr(state.standbyIp) : 'unknown';
    lines.push(`${pad(shortIfName(device, entry.name), 12)}${pad(group.group, 5)}${pad(group.priority, 4)}${pad(group.preempt ? 'P' : ' ', 2)}${pad(status, 8)}${pad(active, 16)}${pad(standby, 16)}${group.ip || 'unknown'}`);
  }
  return lines;
}

function type7(text: string): string {
  return fakeHash(text).replace(/[^0-9A-F]/gi, '').toUpperCase().slice(0, 16).padEnd(16, '0');
}
