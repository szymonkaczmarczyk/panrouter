import { parseCidr } from './ip';
import { blankVif, connect, createDevice, emptyNetwork } from './network';
import type { CableType, Device, DeviceKind, Network, Port, VirtualIf } from './types';

export function portByName(device: Device, name: string): Port {
  const lower = name.toLowerCase();
  const port = device.ports.find((p) => p.name.toLowerCase() === lower || p.short.toLowerCase() === lower);
  if (!port) throw new Error(`${device.name}: no port ${name}`);
  return port;
}

export class NetBuilder {
  readonly net: Network;

  constructor(net: Network = emptyNetwork()) {
    this.net = net;
  }

  add(kind: DeviceKind, name: string, x: number, y: number): Device {
    const device = createDevice(this.net, kind, x, y, name);
    this.net.devices.push(device);
    return device;
  }

  link(a: Device, aPort: string, b: Device, bPort: string): this {
    const portA = portByName(a, aPort);
    const portB = portByName(b, bPort);
    const cable: CableType = portA.media === 'fiber' ? 'fiber' : 'copper';
    const result = connect(this.net, { dev: a.id, port: portA.name }, { dev: b.id, port: portB.name }, cable);
    if (typeof result === 'string') throw new Error(`link ${a.name} ${aPort} - ${b.name} ${bPort}: ${result}`);
    return this;
  }

  host(device: Device, cidr: string, gateway = '', dns = '', portName = 'eth0'): this {
    const port = portByName(device, portName);
    const parsed = parseCidr(cidr);
    if (!parsed) throw new Error(`bad cidr ${cidr}`);
    port.dhcp = false;
    port.ip = cidr.split('/')[0];
    port.prefix = parsed.prefix;
    port.gateway = gateway;
    port.dns = dns;
    return this;
  }

  dhcp(device: Device, portName = 'eth0'): this {
    const port = portByName(device, portName);
    port.dhcp = true;
    port.ip = '';
    return this;
  }

  ip(device: Device, portName: string, cidr: string): this {
    const parsed = parseCidr(cidr);
    if (!parsed) throw new Error(`bad cidr ${cidr}`);
    const vif = device.vifs.find((v) => v.name.toLowerCase() === portName.toLowerCase());
    const target: Port | VirtualIf = vif ?? portByName(device, portName);
    target.ip = cidr.split('/')[0];
    target.prefix = parsed.prefix;
    target.shutdown = false;
    return this;
  }

  up(device: Device, ...ports: string[]): this {
    for (const name of ports) portByName(device, name).shutdown = false;
    return this;
  }

  down(device: Device, ...ports: string[]): this {
    for (const name of ports) portByName(device, name).shutdown = true;
    return this;
  }

  vlan(device: Device, id: number, name = `VLAN${id.toString().padStart(4, '0')}`): this {
    if (!device.vlans.some((v) => v.id === id)) device.vlans.push({ id, name });
    device.vlans.sort((a, b) => a.id - b.id);
    return this;
  }

  access(device: Device, vlan: number, ...ports: string[]): this {
    this.vlan(device, vlan);
    for (const name of ports) {
      const port = portByName(device, name);
      port.mode = 'access';
      port.accessVlan = vlan;
    }
    return this;
  }

  trunk(device: Device, ports: string[], allowed = 'all', native = 1): this {
    for (const name of ports) {
      const port = portByName(device, name);
      port.mode = 'trunk';
      port.allowedVlans = allowed;
      port.nativeVlan = native;
    }
    return this;
  }

  sub(device: Device, parent: string, vlan: number, cidr: string): this {
    const port = portByName(device, parent);
    port.shutdown = false;
    const vif = blankVif('sub', `${port.name}.${vlan}`, port.name, vlan);
    const parsed = parseCidr(cidr)!;
    vif.ip = cidr.split('/')[0];
    vif.prefix = parsed.prefix;
    device.vifs.push(vif);
    return this;
  }

  svi(device: Device, vlan: number, cidr: string): this {
    let vif = device.vifs.find((v) => v.kind === 'svi' && v.vlan === vlan);
    if (!vif) {
      vif = blankVif('svi', `Vlan${vlan}`, '', vlan);
      device.vifs.push(vif);
    }
    const parsed = parseCidr(cidr)!;
    vif.ip = cidr.split('/')[0];
    vif.prefix = parsed.prefix;
    vif.shutdown = false;
    return this;
  }

  loopback(device: Device, n: number, cidr: string): this {
    const vif = blankVif('loop', `Loopback${n}`);
    const parsed = parseCidr(cidr)!;
    vif.ip = cidr.split('/')[0];
    vif.prefix = parsed.prefix;
    device.vifs.push(vif);
    return this;
  }

  route(device: Device, cidr: string, via: string): this {
    const parsed = parseCidr(cidr)!;
    device.routes.push({ net: cidr.split('/')[0], prefix: parsed.prefix, via, iface: '', ad: 1 });
    return this;
  }

  pool(device: Device, name: string, cidr: string, router: string, dns = ''): this {
    const parsed = parseCidr(cidr)!;
    device.dhcpPools.push({ name, network: cidr.split('/')[0], prefix: parsed.prefix, router, dns, domain: '' });
    return this;
  }

  ospf(device: Device, networks: { net: string; wildcard: string; area?: number }[], routerId = ''): this {
    device.ospf = {
      processId: 1,
      routerId,
      networks: networks.map((n) => ({ net: n.net, wildcard: n.wildcard, area: n.area ?? 0 })),
      passive: [],
      refBw: 100,
      defaultOriginate: false,
    };
    return this;
  }
}
