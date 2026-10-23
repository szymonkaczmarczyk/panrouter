import { l, type L10n } from '../i18n/l10n';
import { Simulator } from '../sim/engine';
import { inSubnet, ipToStr, parseIp } from '../sim/ip';
import { isHost } from '../sim/network';
import { TEMPLATES } from '../sim/templates';
import type { AclEntry, Device, Network, Port, VirtualIf } from '../sim/types';

export type IncidentLevel = 1 | 2 | 3;
export type FaultLayer = 'L1' | 'L2' | 'L3' | 'L7';

export interface IncidentTest {
  id: string;
  from: string;
  kind: 'ping' | 'http';
  target: string;
  label: L10n;
}

export interface Fault {
  kind: string;
  layer: FaultLayer;
  device: string;
  solution: L10n;
}

export interface Incident {
  seed: number;
  level: IncidentLevel;
  scenario: string;
  net: Network;
  tests: IncidentTest[];
  faults: Fault[];
}

export const LEVELS: { level: IncidentLevel; faults: number; title: L10n; summary: L10n }[] = [
  { level: 1, faults: 1, title: l('Łatwa', 'Easy'), summary: l('Jedna usterka w sieci małego biura.', 'One fault in a small office network.') },
  { level: 2, faults: 2, title: l('Średnia', 'Medium'), summary: l('Dwie usterki w biurze albo między oddziałami z OSPF.', 'Two faults in an office or between OSPF branches.') },
  { level: 3, faults: 3, title: l('Trudna', 'Hard'), summary: l('Trzy usterki w kampusie z VLAN-ami, trunkami i zaporą.', 'Three faults in a campus with VLANs, trunks and a firewall.') },
];

export const LAYER_HINT: Record<FaultLayer, L10n> = {
  L1: l('Warstwa fizyczna: któryś port albo interfejs nie działa.', 'Physical layer: some port or interface is down.'),
  L2: l('Warstwa łącza danych: sprawdź VLAN-y i trunki.', 'Data link layer: check VLANs and trunks.'),
  L3: l('Warstwa sieci: sprawdź adresy, maski, bramy, trasy albo listy ACL.', 'Network layer: check addresses, masks, gateways, routes or ACLs.'),
  L7: l('Usługi: sprawdź DHCP, DNS albo przekaźnik DHCP.', 'Services: check DHCP, DNS or the DHCP relay.'),
};

type Rng = () => number;

export function rngFor(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, items: T[]): T | undefined {
  return items.length ? items[Math.floor(rng() * items.length)] : undefined;
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function withLastOctet(ip: string, octet: number): string {
  const parts = ip.split('.');
  parts[3] = String(octet);
  return parts.join('.');
}

function otherOctet(ip: string, taken: Set<string>): string {
  for (const octet of [254, 253, 250, 199]) {
    const candidate = withLastOctet(ip, octet);
    if (candidate !== ip && !taken.has(candidate)) return candidate;
  }
  return withLastOctet(ip, 222);
}

function linked(net: Network, device: Device, port: Port): Device | undefined {
  const link = net.links.find((k) => (k.a.dev === device.id && k.a.port === port.name) || (k.b.dev === device.id && k.b.port === port.name));
  if (!link) return undefined;
  const end = link.a.dev === device.id && link.a.port === port.name ? link.b : link.a;
  return net.devices.find((d) => d.id === end.dev);
}

function usedIps(net: Network): Set<string> {
  const ips = new Set<string>();
  for (const d of net.devices) {
    for (const p of d.ports) if (p.ip) ips.add(p.ip);
    for (const v of d.vifs) if (v.ip) ips.add(v.ip);
  }
  return ips;
}

function staticHosts(net: Network): { device: Device; port: Port }[] {
  return net.devices.filter((d) => isHost(d.kind)).flatMap((device) => device.ports.filter((p) => !p.dhcp && p.ip && p.media !== 'wireless').map((port) => ({ device, port })));
}

function gatewayIps(net: Network): Set<string> {
  const ips = new Set<string>();
  for (const d of net.devices) {
    for (const p of d.ports) if (isHost(d.kind) && p.gateway) ips.add(p.gateway);
    for (const pool of d.dhcpPools) if (pool.router) ips.add(pool.router);
  }
  return ips;
}

type Applier = (net: Network, rng: Rng, used: Set<string>) => Fault | null;

const APPLIERS: Applier[] = [
  (net, rng, used) => {
    const options = net.devices
      .filter((d) => ['router', 'switch', 'l3switch'].includes(d.kind))
      .flatMap((device) => device.ports.filter((port) => linked(net, device, port) && !used.has(`${device.id}|${port.name}`)).map((port) => ({ device, port })));
    const choice = pick(rng, options);
    if (!choice) return null;
    choice.port.shutdown = true;
    used.add(`${choice.device.id}|${choice.port.name}`);
    return { kind: 'shutdown', layer: 'L1', device: choice.device.name, solution: l(`Port ${choice.port.short} na ${choice.device.name} był wyłączony poleceniem shutdown. Naprawa: interface ${choice.port.short}, no shutdown.`, `Port ${choice.port.short} on ${choice.device.name} was shut down. Fix: interface ${choice.port.short}, no shutdown.`) };
  },
  (net, rng, used) => {
    const options = net.devices
      .filter((d) => d.kind === 'switch' || d.kind === 'l3switch')
      .flatMap((device) => device.ports.filter((p) => p.switchport && p.mode === 'access' && !used.has(`${device.id}|${p.name}`) && isHost(linked(net, device, p)?.kind ?? 'switch')).map((port) => ({ device, port })));
    const choice = pick(rng, options);
    if (!choice) return null;
    const original = choice.port.accessVlan;
    const others = choice.device.vlans.map((v) => v.id).filter((id) => id !== original);
    let target = pick(rng, others);
    if (target === undefined) {
      target = 99;
      choice.device.vlans.push({ id: 99, name: 'NIEUZYWANY' });
    }
    choice.port.accessVlan = target;
    used.add(`${choice.device.id}|${choice.port.name}`);
    return { kind: 'access-vlan', layer: 'L2', device: choice.device.name, solution: l(`Port ${choice.port.short} na ${choice.device.name} był w VLAN ${target} zamiast ${original}. Naprawa: switchport access vlan ${original}.`, `Port ${choice.port.short} on ${choice.device.name} was in VLAN ${target} instead of ${original}. Fix: switchport access vlan ${original}.`) };
  },
  (net, rng, used) => {
    const options = net.devices
      .filter((d) => d.kind === 'switch' || d.kind === 'l3switch')
      .flatMap((device) => device.ports.filter((p) => p.switchport && p.mode === 'trunk' && linked(net, device, p) && !used.has(`${device.id}|${p.name}`)).map((port) => ({ device, port })));
    const choice = pick(rng, options);
    if (!choice) return null;
    const vlans = choice.device.vlans.map((v) => v.id).filter((id) => id !== 1);
    const removed = pick(rng, vlans);
    if (removed === undefined) return null;
    choice.port.allowedVlans = choice.device.vlans
      .map((v) => v.id)
      .filter((id) => id !== removed)
      .join(',');
    used.add(`${choice.device.id}|${choice.port.name}`);
    return { kind: 'trunk', layer: 'L2', device: choice.device.name, solution: l(`Trunk ${choice.port.short} na ${choice.device.name} nie przepuszczał VLAN ${removed}. Naprawa: switchport trunk allowed vlan add ${removed}.`, `Trunk ${choice.port.short} on ${choice.device.name} did not carry VLAN ${removed}. Fix: switchport trunk allowed vlan add ${removed}.`) };
  },
  (net, rng, used) => {
    const choice = pick(rng, staticHosts(net).filter(({ device, port }) => port.gateway && !used.has(`${device.id}|gw`)));
    if (!choice) return null;
    const good = choice.port.gateway;
    const bad = otherOctet(good, usedIps(net));
    choice.port.gateway = bad;
    used.add(`${choice.device.id}|gw`);
    return { kind: 'host-gateway', layer: 'L3', device: choice.device.name, solution: l(`${choice.device.name} miał bramę ${bad} zamiast ${good}.`, `${choice.device.name} had gateway ${bad} instead of ${good}.`) };
  },
  (net, rng, used) => {
    const choice = pick(rng, staticHosts(net).filter(({ device, port }) => port.gateway && !used.has(`${device.id}|ip`)));
    if (!choice) return null;
    const ip = parseIp(choice.port.ip)!;
    const gateway = parseIp(choice.port.gateway)!;
    const prefix = [25, 26, 27, 28, 29, 30].find((p) => p > choice.port.prefix && !inSubnet(gateway, ip, p));
    if (!prefix) return null;
    const original = choice.port.prefix;
    choice.port.prefix = prefix;
    used.add(`${choice.device.id}|ip`);
    return { kind: 'host-mask', layer: 'L3', device: choice.device.name, solution: l(`${choice.device.name} miał maskę /${prefix} zamiast /${original}, więc brama była poza jego podsiecią.`, `${choice.device.name} had mask /${prefix} instead of /${original}, so the gateway was outside its subnet.`) };
  },
  (net, rng, used) => {
    const choice = pick(rng, staticHosts(net).filter(({ device }) => !used.has(`${device.id}|ip`)));
    if (!choice) return null;
    const parts = choice.port.ip.split('.').map(Number);
    const good = choice.port.ip;
    parts[2] = (parts[2] + 1) % 250;
    const bad = parts.join('.');
    choice.port.ip = bad;
    used.add(`${choice.device.id}|ip`);
    return { kind: 'host-ip', layer: 'L3', device: choice.device.name, solution: l(`${choice.device.name} miał adres ${bad} z innej sieci zamiast ${good}.`, `${choice.device.name} had address ${bad} from another network instead of ${good}.`) };
  },
  (net, rng, used) => {
    const gateways = gatewayIps(net);
    const options = net.devices
      .filter((d) => d.kind === 'router' || d.kind === 'l3switch')
      .flatMap((device) => [...device.ports.filter((p) => !p.switchport), ...device.vifs].filter((cfg) => cfg.ip && gateways.has(cfg.ip) && !used.has(`${device.id}|${cfg.name}`)).map((cfg) => ({ device, cfg })));
    const choice = pick(rng, options);
    if (!choice) return null;
    const good = choice.cfg.ip;
    const bad = otherOctet(good, usedIps(net));
    choice.cfg.ip = bad;
    used.add(`${choice.device.id}|${choice.cfg.name}`);
    const name = 'short' in choice.cfg ? (choice.cfg as Port).short : choice.cfg.name;
    return { kind: 'gateway-ip', layer: 'L3', device: choice.device.name, solution: l(`Interfejs ${name} na ${choice.device.name} miał adres ${bad} zamiast ${good}, czyli bramy, której używają komputery.`, `Interface ${name} on ${choice.device.name} had address ${bad} instead of ${good}, the gateway computers use.`) };
  },
  (net, rng, used) => {
    const choice = pick(rng, net.devices.filter((d) => d.ospf && d.ospf.networks.length > 1 && !used.has(`${d.id}|ospf`)));
    if (!choice) return null;
    const removed = pick(rng, choice.ospf!.networks)!;
    choice.ospf!.networks = choice.ospf!.networks.filter((n) => n !== removed);
    used.add(`${choice.id}|ospf`);
    return { kind: 'ospf', layer: 'L3', device: choice.name, solution: l(`Na ${choice.name} brakowało w OSPF polecenia network ${removed.net} ${removed.wildcard} area ${removed.area}.`, `${choice.name} was missing network ${removed.net} ${removed.wildcard} area ${removed.area} under OSPF.`) };
  },
  (net, rng, used) => {
    const choice = pick(rng, net.devices.filter((d) => (d.kind === 'router' || d.kind === 'l3switch') && d.routes.length && !used.has(`${d.id}|routes`)));
    if (!choice) return null;
    const removed = pick(rng, choice.routes)!;
    choice.routes = choice.routes.filter((r) => r !== removed);
    used.add(`${choice.id}|routes`);
    const mask = ipToStr(removed.prefix ? (0xffffffff << (32 - removed.prefix)) >>> 0 : 0);
    const target = removed.iface || removed.via;
    return { kind: 'route', layer: 'L3', device: choice.name, solution: l(`Na ${choice.name} brakowało trasy: ip route ${removed.net} ${mask} ${target}.`, `${choice.name} was missing the route: ip route ${removed.net} ${mask} ${target}.`) };
  },
  (net, rng, used) => {
    const options = net.devices.flatMap((device) => device.dhcpPools.filter((p) => p.router && !used.has(`${device.id}|pool|${p.name}`)).map((pool) => ({ device, pool })));
    const choice = pick(rng, options);
    if (!choice || choice.device.kind === 'homeRouter' || choice.device.kind === 'internet') return null;
    const good = choice.pool.router;
    const bad = otherOctet(good, usedIps(net));
    choice.pool.router = bad;
    used.add(`${choice.device.id}|pool|${choice.pool.name}`);
    return { kind: 'dhcp-router', layer: 'L7', device: choice.device.name, solution: l(`Pula DHCP ${choice.pool.name} na ${choice.device.name} rozdawała bramę ${bad} zamiast ${good}.`, `DHCP pool ${choice.pool.name} on ${choice.device.name} handed out gateway ${bad} instead of ${good}.`) };
  },
  (net, rng, used) => {
    const options = net.devices.flatMap((device) => [...device.ports, ...device.vifs].filter((cfg: Port | VirtualIf) => cfg.helper && !used.has(`${device.id}|${cfg.name}`)).map((cfg) => ({ device, cfg })));
    const choice = pick(rng, options);
    if (!choice) return null;
    const helper = choice.cfg.helper;
    choice.cfg.helper = '';
    used.add(`${choice.device.id}|${choice.cfg.name}`);
    return { kind: 'helper', layer: 'L7', device: choice.device.name, solution: l(`Na ${choice.device.name} interfejs ${choice.cfg.name} nie miał przekaźnika DHCP: ip helper-address ${helper}.`, `On ${choice.device.name} interface ${choice.cfg.name} had no DHCP relay: ip helper-address ${helper}.`) };
  },
  (net, rng, used) => {
    const gateways = gatewayIps(net);
    const options = net.devices
      .filter((d) => (d.kind === 'router' || d.kind === 'l3switch') && d.ipRouting)
      .flatMap((device) => [...device.ports.filter((p) => !p.switchport), ...device.vifs].filter((cfg) => cfg.ip && gateways.has(cfg.ip) && !cfg.aclIn && !used.has(`${device.id}|${cfg.name}|acl`)).map((cfg) => ({ device, cfg })));
    const servers = net.devices.filter((d) => d.kind === 'server' && d.ports[0].ip);
    const choice = pick(rng, options);
    const server = pick(rng, servers);
    if (!choice || !server) return null;
    const any = { any: true, ip: '', wildcard: '' };
    const deny: AclEntry = { action: 'deny', proto: 'ip', src: any, dst: { any: false, ip: server.ports[0].ip, wildcard: '0.0.0.0' }, srcPort: null, dstPort: null, icmpType: '', remark: '' };
    const permit: AclEntry = { ...deny, action: 'permit', dst: any };
    choice.device.acls.push({ name: 'BLOKADA', type: 'extended', entries: [deny, permit] });
    choice.cfg.aclIn = 'BLOKADA';
    used.add(`${choice.device.id}|${choice.cfg.name}|acl`);
    return { kind: 'acl', layer: 'L3', device: choice.device.name, solution: l(`Na ${choice.device.name} lista ACL BLOKADA na ${choice.cfg.name} blokowała ruch do ${server.name}. Naprawa: no ip access-group BLOKADA in.`, `On ${choice.device.name} ACL BLOKADA on ${choice.cfg.name} blocked traffic to ${server.name}. Fix: no ip access-group BLOKADA in.`) };
  },
  (net, rng, used) => {
    const options = net.devices.flatMap((device) => device.dnsRecords.filter((r) => r.type === 'A' && device.kind !== 'internet' && !used.has(`${device.id}|dns|${r.name}`)).map((record) => ({ device, record })));
    const choice = pick(rng, options);
    if (!choice) return null;
    const good = choice.record.value;
    const bad = otherOctet(good, usedIps(net));
    choice.record.value = bad;
    used.add(`${choice.device.id}|dns|${choice.record.name}`);
    return { kind: 'dns-record', layer: 'L7', device: choice.device.name, solution: l(`Rekord DNS ${choice.record.name} na ${choice.device.name} wskazywał ${bad} zamiast ${good}.`, `DNS record ${choice.record.name} on ${choice.device.name} pointed to ${bad} instead of ${good}.`) };
  },
  (net, rng, used) => {
    const choice = pick(rng, staticHosts(net).filter(({ device, port }) => port.dns && !used.has(`${device.id}|dns`)));
    if (!choice) return null;
    const good = choice.port.dns;
    choice.port.dns = '192.0.2.53';
    used.add(`${choice.device.id}|dns`);
    return { kind: 'host-dns', layer: 'L7', device: choice.device.name, solution: l(`${choice.device.name} miał serwer DNS 192.0.2.53 zamiast ${good}.`, `${choice.device.name} had DNS server 192.0.2.53 instead of ${good}.`) };
  },
  (net, rng, used) => {
    const options = net.devices.filter((d) => d.kind === 'router').flatMap((device) => [...device.ports, ...device.vifs].filter((cfg) => cfg.nat === 'inside' && !used.has(`${device.id}|${cfg.name}|nat`)).map((cfg) => ({ device, cfg })));
    const choice = pick(rng, options);
    if (!choice) return null;
    choice.cfg.nat = '';
    used.add(`${choice.device.id}|${choice.cfg.name}|nat`);
    return { kind: 'nat', layer: 'L3', device: choice.device.name, solution: l(`Na ${choice.device.name} interfejs ${choice.cfg.name} nie był oznaczony jako ip nat inside, więc ruch do internetu nie był tłumaczony.`, `On ${choice.device.name} interface ${choice.cfg.name} was not marked ip nat inside, so internet traffic was not translated.`) };
  },
];

export function prepareForTests(source: Network): Simulator {
  const net = structuredClone(source);
  for (const device of net.devices) {
    for (const port of device.ports) {
      if (!port.dhcp) continue;
      port.ip = '';
      port.gateway = '';
      port.dns = '';
    }
  }
  const sim = new Simulator(net);
  sim.autoDhcp();
  return sim;
}

export function runTest(sim: Simulator, test: IncidentTest): boolean {
  const from = sim.net.devices.find((d) => d.name === test.from);
  if (!from) return false;
  if (test.kind === 'http') return sim.http(from.id, test.target).status === 'ok';
  const ip = parseIp(test.target);
  return ip !== null && sim.canReach(from.id, ip);
}

export function runTests(net: Network, tests: IncidentTest[]): Record<string, boolean> {
  const sim = prepareForTests(net);
  return Object.fromEntries(tests.map((t) => [t.id, runTest(sim, t)]));
}

function candidateTests(sim: Simulator): IncidentTest[] {
  const net = sim.net;
  const clients = net.devices.filter((d) => ['pc', 'laptop', 'voip'].includes(d.kind));
  const servers = net.devices.filter((d) => d.kind === 'server' && d.ports[0].ip);
  const names = new Map<string, string>();
  for (const d of net.devices) for (const r of d.dnsRecords) if (r.type === 'A' && d.kind !== 'internet') names.set(r.value, r.name);
  const hasInternet = net.devices.some((d) => d.kind === 'internet');
  const tests: IncidentTest[] = [];
  for (const client of clients) {
    const port = client.ports.find((p) => p.ip);
    if (!port) continue;
    if (port.gateway) tests.push({ id: `${client.name}-gw`, from: client.name, kind: 'ping', target: port.gateway, label: l(`${client.name} pinguje swoją bramę ${port.gateway}`, `${client.name} pings its gateway ${port.gateway}`) });
    for (const server of servers) {
      const ip = server.ports[0].ip;
      tests.push({ id: `${client.name}-${server.name}`, from: client.name, kind: 'ping', target: ip, label: l(`${client.name} pinguje ${server.name} (${ip})`, `${client.name} pings ${server.name} (${ip})`) });
      if (server.services.http) {
        const name = port.dns ? names.get(ip) : undefined;
        const url = `http://${name ?? ip}`;
        tests.push({ id: `${client.name}-${server.name}-www`, from: client.name, kind: 'http', target: url, label: l(`${client.name} otwiera ${url}`, `${client.name} opens ${url}`) });
      }
    }
    if (hasInternet && port.dns) tests.push({ id: `${client.name}-net`, from: client.name, kind: 'http', target: 'https://www.przyklad.pl', label: l(`${client.name} otwiera https://www.przyklad.pl`, `${client.name} opens https://www.przyklad.pl`) });
  }
  return tests;
}

function scenarioFor(level: IncidentLevel, rng: Rng): string {
  if (level === 1) return 'office';
  if (level === 2) return pick(rng, ['office', 'branches'])!;
  return pick(rng, ['campus', 'campus', 'branches'])!;
}

export function buildIncident(seed: number, level: IncidentLevel): Incident {
  const rng = rngFor(seed * 7919 + level);
  const scenario = scenarioFor(level, rng);
  const healthy = TEMPLATES.find((t) => t.id === scenario)!.build();
  const baselineSim = prepareForTests(healthy);
  const tests = shuffle(rng, candidateTests(baselineSim))
    .filter((t) => runTest(baselineSim, t))
    .slice(0, 9)
    .sort((a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id));
  const wanted = LEVELS.find((x) => x.level === level)!.faults;
  let net = structuredClone(healthy);
  const faults: Fault[] = [];
  const used = new Set<string>();
  for (let round = 0; round < 60 && faults.length < wanted; round++) {
    const applier = pick(rng, APPLIERS)!;
    const sub = Math.floor(rng() * 4294967296);
    const alone = structuredClone(healthy);
    const aloneFault = applier(alone, rngFor(sub), new Set(used));
    if (!aloneFault || Object.values(runTests(alone, tests)).every(Boolean)) continue;
    const attempt = structuredClone(net);
    const trial = new Set(used);
    const fault = applier(attempt, rngFor(sub), trial);
    if (!fault || fault.solution.pl !== aloneFault.solution.pl || faults.some((f) => f.kind === fault.kind)) continue;
    net = attempt;
    for (const key of trial) used.add(key);
    faults.push(fault);
  }
  for (const device of net.devices) for (const port of device.ports) if (port.dhcp && isHost(device.kind)) Object.assign(port, { ip: '', gateway: '', dns: '' });
  return { seed, level, scenario, net, tests, faults };
}

export function randomSeed(): number {
  return Math.floor(10000 + Math.random() * 89999);
}
