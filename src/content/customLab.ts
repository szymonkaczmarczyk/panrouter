import { l, type L10n } from '../i18n/l10n';
import { parseIp } from '../sim/ip';
import { parseIpv6 } from '../sim/ip6';
import { normalizeNetwork } from '../sim/normalize';
import { decodePayload, encodePayload } from '../sim/share';
import type { Simulator } from '../sim/engine';
import type { Network } from '../sim/types';
import { prepareForTests } from './incidents';

export type CheckKind = 'ping' | 'noping' | 'http';

export interface CustomCheck {
  kind: CheckKind;
  from: string;
  target: string;
}

export interface CustomLab {
  title: string;
  text: string;
  checks: CustomCheck[];
  net: Network;
}

export const CHECK_LIMIT = 20;
export const TITLE_LIMIT = 80;
export const TEXT_LIMIT = 1500;

const KINDS: CheckKind[] = ['ping', 'noping', 'http'];

export function checkLabel(check: CustomCheck): L10n {
  if (check.kind === 'http') return l(`${check.from} otwiera ${check.target}`, `${check.from} opens ${check.target}`);
  if (check.kind === 'noping') return l(`${check.from} nie pinguje ${check.target}`, `${check.from} cannot ping ${check.target}`);
  return l(`${check.from} pinguje ${check.target}`, `${check.from} pings ${check.target}`);
}

function cleanText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, limit) : '';
}

export function normalizeCustomLab(value: unknown): CustomLab | null {
  const raw = value as Partial<CustomLab> | null;
  if (!raw || typeof raw !== 'object') return null;
  const net = normalizeNetwork(raw.net);
  const title = cleanText(raw.title, TITLE_LIMIT);
  if (!net || !title || !Array.isArray(raw.checks)) return null;
  const names = new Set(net.devices.map((d) => d.name));
  const checks = raw.checks
    .slice(0, CHECK_LIMIT)
    .map((c) => ({ kind: c?.kind, from: cleanText(c?.from, 40), target: cleanText(c?.target, 200) }))
    .filter((c): c is CustomCheck => KINDS.includes(c.kind as CheckKind) && names.has(c.from) && Boolean(c.target));
  if (!checks.length) return null;
  return { title, text: cleanText(raw.text, TEXT_LIMIT), checks, net };
}

export function encodeCustomLab(lab: CustomLab): Promise<string> {
  return encodePayload(lab);
}

export async function decodeCustomLab(data: string): Promise<CustomLab | null> {
  return normalizeCustomLab(await decodePayload(data));
}

export function customLabUrl(data: string): string {
  return `${window.location.origin}${window.location.pathname}#/lab-z-linku?lab=${data}`;
}

function pingable(sim: Simulator, fromId: string, target: string): boolean {
  const v4 = parseIp(target);
  if (v4 !== null) return sim.canReach(fromId, v4);
  const v6 = parseIpv6(target);
  if (v6 !== null) return sim.canReach6(fromId, v6);
  const device = sim.net.devices.find((d) => d.name.toLowerCase() === target.toLowerCase());
  if (!device) return false;
  return sim.topo.l3Ifs(device).some((entry) => entry.up && entry.ip !== null && sim.canReach(fromId, entry.ip));
}

export function runCustomChecks(net: Network, checks: CustomCheck[]): boolean[] {
  const sim = prepareForTests(net);
  return checks.map((check) => {
    const from = sim.net.devices.find((d) => d.name === check.from);
    if (!from) return false;
    if (check.kind === 'http') return sim.http(from.id, check.target).status === 'ok';
    const reached = pingable(sim, from.id, check.target);
    return check.kind === 'ping' ? reached : !reached;
  });
}
