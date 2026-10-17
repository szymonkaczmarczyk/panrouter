import { Simulator } from '../../sim/engine';
import { inSubnet, parseCidr, parseIp } from '../../sim/ip';
import { findDeviceByName } from '../../sim/network';
import type { Network } from '../../sim/types';
import type { LabContext } from '../types';

export function makeLabContext(net: Network, live: Simulator): LabContext {
  const copy = structuredClone(net);
  const sim = new Simulator(copy);
  sim.autoDhcp();
  const dev = (name: string) => findDeviceByName(copy, name);
  const liveDev = (name: string) => findDeviceByName(live.net, name);
  const port = (name: string, portName: string) => {
    const lower = portName.toLowerCase();
    return dev(name)?.ports.find((p) => p.name.toLowerCase() === lower || p.short.toLowerCase() === lower);
  };
  const target = (to: string): number | null => {
    const ip = parseIp(to);
    if (ip !== null) return ip;
    const device = dev(to);
    if (!device) return null;
    return sim.topo.l3Ifs(device).find((e) => e.ip !== null && e.up && e.attach.kind !== 'loop')?.ip ?? null;
  };
  return {
    net: copy,
    device: dev,
    port,
    ping: (from, to) => {
      const a = dev(from);
      const ip = target(to);
      return Boolean(a && ip !== null && sim.canReach(a.id, ip));
    },
    http: (from, url) => {
      const a = dev(from);
      return Boolean(a && sim.http(a.id, url).status === 'ok');
    },
    connect: (from, to, portNumber) => {
      const a = dev(from);
      const ip = target(to);
      if (!a || ip === null) return 'timeout';
      return sim.connect(a.id, ip, portNumber);
    },
    ospfNeighbors: (name) => {
      const d = dev(name);
      return d ? (sim.topo.ospf().neighbors.get(d.id) ?? []).length : 0;
    },
    hasRoute: (name, cidr, code) => {
      const d = dev(name);
      const parsed = parseCidr(cidr);
      if (!d || !parsed) return false;
      return sim.topo.routes(d).some((r) => r.net === parsed.ip && r.prefix === parsed.prefix && (!code || r.code === code));
    },
    portUp: (name, portName) => {
      const d = dev(name);
      const p = port(name, portName);
      return Boolean(d && p && sim.topo.portUp(d, p.name));
    },
    stpRoot: (name) => {
      const d = dev(name);
      return Boolean(d && sim.topo.stpInfo(d.id)?.isRoot);
    },
    stpBlockedOn: (name) => {
      const d = dev(name);
      if (!d) return 0;
      return d.ports.filter((p) => sim.topo.stpBlocked(d.id, p.name)).length;
    },
    connected: (a, b) => {
      const da = dev(a);
      const db = dev(b);
      if (!da || !db) return false;
      return copy.links.some((l) => (l.a.dev === da.id && l.b.dev === db.id) || (l.a.dev === db.id && l.b.dev === da.id));
    },
    wifi: (name) => {
      const d = dev(name);
      return Boolean(d && sim.topo.wifiStatus(d.id) === 'connected');
    },
    arpHas: (name, ip) => {
      const d = liveDev(name);
      const value = parseIp(ip);
      return Boolean(d && value !== null && live.arpTable(d).some((e) => e.ip === value));
    },
    macKnows: (switchName, deviceName) => {
      const sw = liveDev(switchName);
      const host = liveDev(deviceName);
      if (!sw || !host) return false;
      const macs = new Set(host.ports.map((p) => p.mac));
      return live.macTable(sw).some((e) => macs.has(e.mac));
    },
    inSubnet: (ip, cidr) => {
      const value = parseIp(ip);
      const parsed = parseCidr(cidr);
      return Boolean(value !== null && parsed && inSubnet(value, parsed.ip, parsed.prefix));
    },
  };
}
