import { modelOf, portGroupName } from './catalog';
import type { CableType, Device, DeviceKind, Link, LinkEnd, Network, Port, PortSecurity, VirtualIf } from './types';

export const INTERNET_DNS = '198.51.100.53';
export const INTERNET_WEB = '198.51.100.80';
export const INTERNET_HOSTS: { ip: string; name: string }[] = [
  { ip: INTERNET_DNS, name: 'dns.dostawca.pl' },
  { ip: INTERNET_WEB, name: 'www.przyklad.pl' },
  { ip: '198.51.100.123', name: 'czas.dostawca.pl' },
];

const HOST_KINDS: DeviceKind[] = ['pc', 'laptop', 'phone', 'server', 'printer', 'camera', 'voip'];
const L2_KINDS: DeviceKind[] = ['switch', 'l3switch', 'ap'];

export function isHost(kind: DeviceKind): boolean {
  return HOST_KINDS.includes(kind);
}

export function isSwitchLike(kind: DeviceKind): boolean {
  return L2_KINDS.includes(kind) || kind === 'homeRouter';
}

export function emptyNetwork(): Network {
  return { version: 1, seq: 0, devices: [], links: [], notes: [] };
}

function nextSeq(net: Network): number {
  net.seq += 1;
  return net.seq;
}

function macFor(net: Network): string {
  const n = nextSeq(net);
  return `02a0c9${n.toString(16).padStart(6, '0')}`;
}

export function blankPort(name: string, short: string, mac: string): Port {
  return {
    name,
    short,
    media: 'copper',
    speed: 1000,
    poe: false,
    mac,
    shutdown: false,
    description: '',
    switchport: false,
    mode: 'access',
    accessVlan: 1,
    nativeVlan: 1,
    allowedVlans: 'all',
    dhcp: false,
    gateway: '',
    dns: '',
    zone: '',
    ip: '',
    prefix: 24,
    helper: '',
    nat: '',
    aclIn: '',
    aclOut: '',
    ospfCost: 0,
    fhrp: null,
    portSecurity: blankPortSecurity(),
    errDisabled: false,
    dhcpTrust: false,
    channelGroup: 0,
    channelMode: '',
  };
}

export function blankPortSecurity(): PortSecurity {
  return { enabled: false, maximum: 1, violation: 'shutdown', sticky: false, macs: [], stickyMacs: [] };
}

export function blankVif(kind: VirtualIf['kind'], name: string, parent = '', vlan = 0): VirtualIf {
  return {
    kind,
    name,
    parent,
    vlan,
    shutdown: false,
    description: '',
    ip: '',
    prefix: 24,
    helper: '',
    nat: '',
    aclIn: '',
    aclOut: '',
    ospfCost: 0,
    fhrp: null,
  };
}

export function uniqueName(net: Network, prefix: string): string {
  let n = 1;
  const taken = new Set(net.devices.map((d) => d.name.toLowerCase()));
  while (taken.has(`${prefix}${n}`.toLowerCase())) n++;
  return `${prefix}${n}`;
}

export function createDevice(net: Network, kind: DeviceKind, x: number, y: number, name?: string): Device {
  const spec = modelOf(kind);
  const ports: Port[] = [];
  for (const group of spec.ports) {
    for (const id of group.ids) {
      const names = portGroupName(group, id);
      const port = blankPort(names.name, names.short, macFor(net));
      port.media = group.media;
      port.speed = group.speed;
      port.poe = Boolean(group.poe);
      ports.push(port);
    }
  }
  const device: Device = {
    id: `d${nextSeq(net)}`,
    kind,
    model: spec.model,
    name: name ?? uniqueName(net, spec.namePrefix),
    x,
    y,
    baseMac: macFor(net),
    ports,
    vifs: [],
    vlans: [],
    ipRouting: spec.routing,
    routes: [],
    defaultGateway: '',
    dhcpPools: [],
    dhcpExcluded: [],
    dhcpBindings: [],
    dnsRecords: [],
    services: { dhcp: false, dns: false, http: false },
    web: { title: '', body: '' },
    ospf: null,
    acls: [],
    nat: [],
    wifi: null,
    wifiClient: null,
    fwRules: [],
    stpPriority: 32768,
    dhcpSnooping: { enabled: false, vlans: [] },
    banner: '',
    mgmt: {
      enableSecret: '',
      users: [],
      domain: '',
      sshKeys: false,
      sshV2: false,
      vtyTransport: '',
      vtyLogin: '',
      vtyPassword: '',
      consolePassword: '',
      consoleLogin: false,
      execTimeout: 10,
      passwordEncryption: false,
      lldp: true,
      domainLookup: true,
    },
    startup: '',
  };
  applyDefaults(device);
  return device;
}

function applyDefaults(device: Device): void {
  switch (device.kind) {
    case 'router':
      for (const port of device.ports) port.shutdown = true;
      break;
    case 'switch':
    case 'l3switch': {
      for (const port of device.ports) port.switchport = true;
      device.vlans = [{ id: 1, name: 'default' }];
      const svi = blankVif('svi', 'Vlan1', '', 1);
      svi.shutdown = true;
      device.vifs.push(svi);
      device.ipRouting = false;
      break;
    }
    case 'ap':
      device.ports[0].switchport = true;
      device.vlans = [{ id: 1, name: 'default' }];
      device.wifi = { ssid: 'Firma', security: 'wpa3', key: 'Haslo-Do-Sieci-1', band: '6', vlan: 1 };
      break;
    case 'homeRouter': {
      const wan = device.ports[0];
      wan.dhcp = true;
      wan.nat = 'outside';
      for (const port of device.ports.slice(1)) port.switchport = true;
      device.vlans = [{ id: 1, name: 'lan' }];
      const lan = blankVif('svi', 'LAN', '', 1);
      lan.ip = '192.168.1.1';
      lan.prefix = 24;
      lan.nat = 'inside';
      device.vifs.push(lan);
      device.dhcpPools = [{ name: 'LAN', network: '192.168.1.0', prefix: 24, router: '192.168.1.1', dns: '', domain: 'dom.lan' }];
      device.dhcpExcluded = [{ from: '192.168.1.1', to: '192.168.1.99' }];
      device.services.dhcp = true;
      device.nat = [{ kind: 'pat', acl: '*', iface: 'WAN' }];
      device.wifi = { ssid: `Dom-${device.name}`, security: 'wpa3', key: 'Haslo-Do-Sieci-1', band: '5', vlan: 1 };
      break;
    }
    case 'firewall':
      device.fwRules = [
        { name: 'LAN do internetu', from: 'inside', to: 'outside', proto: 'any', port: 0, dst: '', action: 'allow' },
      ];
      device.nat = [{ kind: 'pat', acl: '*', iface: '*' }];
      break;
    case 'internet':
      device.ports.forEach((port, index) => {
        const base = 203 * 2 ** 24 + 113 * 256;
        const net = base + index * 32;
        port.ip = toDotted(net + 1);
        port.prefix = 27;
        device.dhcpPools.push({
          name: `KLIENT${index}`,
          network: toDotted(net),
          prefix: 27,
          router: toDotted(net + 1),
          dns: INTERNET_DNS,
          domain: '',
        });
      });
      device.services = { dhcp: true, dns: true, http: true };
      device.dnsRecords = INTERNET_HOSTS.map((host) => ({ name: host.name, type: 'A' as const, value: host.ip }));
      device.dnsRecords.push({ name: 'przyklad.pl', type: 'A', value: INTERNET_WEB });
      device.web = { title: 'Przykład', body: 'Strona testowa w internecie symulatora.' };
      break;
    case 'pc':
    case 'laptop':
    case 'phone':
    case 'printer':
    case 'camera':
    case 'voip':
      for (const port of device.ports) port.dhcp = true;
      break;
    case 'server':
      device.web = { title: device.name, body: '' };
      break;
  }
}

function toDotted(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

export function findDevice(net: Network, id: string): Device | undefined {
  return net.devices.find((d) => d.id === id);
}

export function findDeviceByName(net: Network, name: string): Device | undefined {
  const lower = name.toLowerCase();
  return net.devices.find((d) => d.name.toLowerCase() === lower);
}

export function findPort(device: Device, name: string): Port | undefined {
  return device.ports.find((p) => p.name === name);
}

export function linkAt(net: Network, dev: string, port: string): Link | undefined {
  return net.links.find(
    (link) => (link.a.dev === dev && link.a.port === port) || (link.b.dev === dev && link.b.port === port),
  );
}

export function peerOf(link: Link, dev: string, port: string): LinkEnd {
  return link.a.dev === dev && link.a.port === port ? link.b : link.a;
}

export type ConnectError = 'same-device' | 'port-busy' | 'media-mismatch' | 'cable-mismatch' | 'wireless-port';

export function canConnect(net: Network, a: LinkEnd, b: LinkEnd, cable: CableType): ConnectError | null {
  if (a.dev === b.dev) return 'same-device';
  const devA = findDevice(net, a.dev);
  const devB = findDevice(net, b.dev);
  const portA = devA && findPort(devA, a.port);
  const portB = devB && findPort(devB, b.port);
  if (!portA || !portB) return 'port-busy';
  if (portA.media === 'wireless' || portB.media === 'wireless') return 'wireless-port';
  if (linkAt(net, a.dev, a.port) || linkAt(net, b.dev, b.port)) return 'port-busy';
  if (portA.media !== portB.media) return 'media-mismatch';
  if (portA.media !== cable) return 'cable-mismatch';
  return null;
}

export function connect(net: Network, a: LinkEnd, b: LinkEnd, cable: CableType): Link | ConnectError {
  const error = canConnect(net, a, b, cable);
  if (error) return error;
  const link: Link = { id: `l${nextSeq(net)}`, a: { ...a }, b: { ...b }, cable };
  net.links.push(link);
  return link;
}

export function freePorts(net: Network, device: Device, media?: CableType): Port[] {
  return device.ports.filter(
    (p) => p.media !== 'wireless' && !linkAt(net, device.id, p.name) && (!media || p.media === media),
  );
}

export function autoConnect(net: Network, devA: Device, devB: Device): Link | ConnectError {
  for (const media of ['copper', 'fiber'] as CableType[]) {
    const portA = freePorts(net, devA, media)[0];
    const portB = freePorts(net, devB, media)[0];
    if (portA && portB) return connect(net, { dev: devA.id, port: portA.name }, { dev: devB.id, port: portB.name }, media);
  }
  const anyA = freePorts(net, devA).length > 0;
  const anyB = freePorts(net, devB).length > 0;
  return anyA && anyB ? 'media-mismatch' : 'port-busy';
}

export function removeLink(net: Network, id: string): void {
  net.links = net.links.filter((link) => link.id !== id);
}

export function removeDevice(net: Network, id: string): void {
  net.devices = net.devices.filter((d) => d.id !== id);
  net.links = net.links.filter((link) => link.a.dev !== id && link.b.dev !== id);
}

export function cloneNetwork(net: Network): Network {
  return structuredClone(net);
}
