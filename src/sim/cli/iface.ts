import type { Device } from '../types';

export interface IfaceRef {
  name: string;
  kind: 'port' | 'sub' | 'svi' | 'loop' | 'po';
  exists: boolean;
  parent?: string;
  vlan?: number;
  number?: number;
}

const VIRTUAL_TYPES: { long: string; kind: 'svi' | 'loop' | 'po' }[] = [
  { long: 'vlan', kind: 'svi' },
  { long: 'loopback', kind: 'loop' },
  { long: 'port-channel', kind: 'po' },
];

function splitType(text: string): { type: string; rest: string } | null {
  const match = /^([a-z-]+)\s*([0-9][0-9/.]*)?$/i.exec(text.trim());
  if (!match) return null;
  return { type: match[1].toLowerCase(), rest: match[2] ?? '' };
}

function portTypes(device: Device): string[] {
  const types = new Set<string>();
  for (const port of device.ports) {
    const match = /^([A-Za-z-]+)/.exec(port.name);
    if (match) types.add(match[1].toLowerCase());
  }
  return [...types];
}

export function resolveIface(device: Device, text: string, allowCreate: boolean): IfaceRef | 'ambiguous' | null {
  const parts = splitType(text);
  if (!parts || !parts.rest) return null;
  const { type, rest } = parts;
  const physical = portTypes(device).filter((t) => t.startsWith(type) || shortOf(device, t).toLowerCase() === type);
  const virtual = device.kind === 'router' ? VIRTUAL_TYPES.filter((v) => v.kind === 'loop') : VIRTUAL_TYPES;
  const virtualMatches = virtual.filter((v) => v.long.startsWith(type) && type.length >= 2);
  if (physical.length + virtualMatches.length > 1) {
    const exact = physical.filter((t) => device.ports.some((p) => p.name.toLowerCase() === `${t}${rest.split('.')[0]}`));
    if (exact.length === 1 && virtualMatches.length === 0) return resolvePhysical(device, exact[0], rest, allowCreate);
    return 'ambiguous';
  }
  if (physical.length === 1) return resolvePhysical(device, physical[0], rest, allowCreate);
  if (virtualMatches.length === 1) {
    const number = Number(rest);
    if (!Number.isInteger(number) || number < 0) return null;
    const kind = virtualMatches[0].kind;
    if (kind === 'svi' && (number < 1 || number > 4094)) return null;
    if (device.kind !== 'router' && device.kind !== 'switch' && device.kind !== 'l3switch') return null;
    if (kind === 'po') {
      if (number < 1 || number > 64) return null;
      return { name: `Port-channel${number}`, kind, exists: device.ports.some((p) => p.channelGroup === number), number };
    }
    const name = kind === 'svi' ? `Vlan${number}` : `Loopback${number}`;
    const exists = device.vifs.some((v) => v.name.toLowerCase() === name.toLowerCase());
    if (!exists && !allowCreate) return null;
    return { name, kind, exists, number, vlan: kind === 'svi' ? number : undefined };
  }
  return null;
}

function shortOf(device: Device, longType: string): string {
  const port = device.ports.find((p) => p.name.toLowerCase().startsWith(longType));
  if (!port) return longType;
  const match = /^([A-Za-z-]+)/.exec(port.short);
  return match ? match[1] : longType;
}

function resolvePhysical(device: Device, type: string, rest: string, allowCreate: boolean): IfaceRef | null {
  const [base, sub] = rest.split('.');
  const port = device.ports.find((p) => p.name.toLowerCase() === `${type}${base}`);
  if (!port) return null;
  if (sub === undefined) return { name: port.name, kind: 'port', exists: true };
  const number = Number(sub);
  if (!Number.isInteger(number) || number < 1 || number > 4094 || device.kind !== 'router') return null;
  const name = `${port.name}.${number}`;
  const exists = device.vifs.some((v) => v.name === name);
  if (!exists && !allowCreate) return null;
  return { name, kind: 'sub', exists, parent: port.name, number };
}

export function expandRange(device: Device, text: string): string[] | null {
  const cleaned = text.replace(/\s*-\s*/g, '-').replace(/\s*,\s*/g, ',');
  const result: string[] = [];
  for (const chunk of cleaned.split(',')) {
    const match = /^([a-z-]+)?\s*([0-9/]*?)(\d+)(?:-(\d+))?$/i.exec(chunk.trim());
    if (!match) return null;
    const typeText = match[1] ?? '';
    const prefix = match[2];
    const from = Number(match[3]);
    const to = match[4] ? Number(match[4]) : from;
    const previous = result.at(-1);
    const type = typeText || (previous ? /^([A-Za-z-]+)/.exec(previous)![1] : '');
    if (!type) return null;
    for (let n = from; n <= to; n++) {
      const ref = resolveIface(device, `${type}${prefix}${n}`, false);
      if (!ref || ref === 'ambiguous' || ref.kind !== 'port') return null;
      result.push(ref.name);
    }
  }
  return result.length ? result : null;
}

export function shortIfName(device: Device, name: string): string {
  const port = device.ports.find((p) => p.name === name);
  if (port) return port.short;
  const sub = /^(.*)\.(\d+)$/.exec(name);
  if (sub) {
    const parent = device.ports.find((p) => p.name === sub[1]);
    if (parent) return `${parent.short}.${sub[2]}`;
  }
  if (name.startsWith('Loopback')) return name.replace('Loopback', 'Lo');
  if (name.startsWith('Vlan')) return name.replace('Vlan', 'Vl');
  if (name.startsWith('Port-channel')) return name.replace('Port-channel', 'Po');
  return name;
}
