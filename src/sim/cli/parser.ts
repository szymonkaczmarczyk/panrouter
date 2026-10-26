import type { L10n } from '../../i18n/l10n';
import { parseIp } from '../ip';
import { parseCidr6, parseIpv6 } from '../ip6';
import type { Device, DeviceKind } from '../types';
import { expandRange, resolveIface } from './iface';

export type Mode = 'user' | 'priv' | 'config' | 'if' | 'if-range' | 'subif' | 'vlan' | 'router' | 'router6' | 'dhcp' | 'dhcp6' | 'ipsec' | 'std-acl' | 'ext-acl' | 'line';

export type ParamType = 'ip' | 'ip6' | 'ip6p' | 'mask' | 'wild' | 'num' | 'word' | 'iface' | 'ifnew' | 'line' | 'vlans' | 'ifrange';

export interface ParamSpec {
  type: ParamType;
  name: string;
  min: number;
  max: number;
}

export type ArgValue = string | number | string[];
export type Args = Record<string, ArgValue>;

export interface CommandDef<C> {
  modes: Mode[];
  pattern: string;
  kinds?: DeviceKind[];
  run: (ctx: C, args: Args) => void;
}

export interface TrieNode<C> {
  kw: string | null;
  param: ParamSpec | null;
  children: TrieNode<C>[];
  run: ((ctx: C, args: Args) => void) | null;
}

export type ParseResult<C> =
  | { ok: true; run: (ctx: C, args: Args) => void; args: Args }
  | { ok: false; error: 'invalid' | 'ambiguous' | 'incomplete'; index: number; token: string };

function parseParam(token: string): ParamSpec {
  const [type, name, range] = token.slice(1, -1).split(':');
  const [min, max] = (range ?? '').split('-').map(Number);
  return { type: type as ParamType, name: name ?? type, min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER };
}

export function buildTrie<C>(defs: CommandDef<C>[], mode: Mode, kind: DeviceKind): TrieNode<C> {
  const root: TrieNode<C> = { kw: null, param: null, children: [], run: null };
  for (const def of defs) {
    if (!def.modes.includes(mode)) continue;
    if (def.kinds && !def.kinds.includes(kind)) continue;
    let node = root;
    for (const token of def.pattern.split(' ')) {
      const isParam = token.startsWith('<');
      const spec = isParam ? parseParam(token) : null;
      let child = node.children.find((c) =>
        isParam
          ? c.param && c.param.type === spec!.type && c.param.name === spec!.name && c.param.min === spec!.min && c.param.max === spec!.max
          : c.kw === token,
      );
      if (!child) {
        child = { kw: isParam ? null : token, param: spec, children: [], run: null };
        node.children.push(child);
      }
      node = child;
    }
    node.run = def.run;
  }
  return root;
}

export function tokenize(line: string): { text: string; start: number }[] {
  const tokens: { text: string; start: number }[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) tokens.push({ text: match[0], start: match.index });
  return tokens;
}

function matchParam(spec: ParamSpec, tokens: string[], index: number, device: Device): { value: ArgValue; consumed: number } | null {
  const token = tokens[index];
  switch (spec.type) {
    case 'ip':
      return parseIp(token) !== null ? { value: token, consumed: 1 } : null;
    case 'ip6':
      return parseIpv6(token) !== null ? { value: token.toLowerCase(), consumed: 1 } : null;
    case 'ip6p':
      return parseCidr6(token) !== null ? { value: token.toLowerCase(), consumed: 1 } : null;
    case 'mask':
      if (parseIp(token) === null) return null;
      return { value: token, consumed: 1 };
    case 'wild':
      return parseIp(token) !== null ? { value: token, consumed: 1 } : null;
    case 'num': {
      if (!/^\d+$/.test(token)) return null;
      const n = Number(token);
      return n >= spec.min && n <= spec.max ? { value: n, consumed: 1 } : null;
    }
    case 'word':
      return { value: token, consumed: 1 };
    case 'line':
      return { value: tokens.slice(index).join(' '), consumed: tokens.length - index };
    case 'vlans':
      return /^[\d,-]+$/.test(token) ? { value: token, consumed: 1 } : null;
    case 'iface':
    case 'ifnew': {
      const allow = spec.type === 'ifnew';
      const single = resolveIface(device, token, allow);
      if (single && single !== 'ambiguous') return { value: single.name, consumed: 1 };
      if (index + 1 < tokens.length && /^\d/.test(tokens[index + 1])) {
        const joined = resolveIface(device, `${token}${tokens[index + 1]}`, allow);
        if (joined && joined !== 'ambiguous') return { value: joined.name, consumed: 2 };
      }
      return null;
    }
    case 'ifrange': {
      const text = tokens.slice(index).join(' ');
      const names = expandRange(device, text);
      return names ? { value: names, consumed: tokens.length - index } : null;
    }
  }
}

export function parse<C>(root: TrieNode<C>, line: string, device: Device): ParseResult<C> {
  const tokens = tokenize(line);
  const words = tokens.map((t) => t.text);
  const args: Args = {};
  let node = root;
  let index = 0;
  while (index < words.length) {
    const token = words[index];
    const lower = token.toLowerCase();
    const keywords = node.children.filter((c) => c.kw && c.kw.startsWith(lower));
    const exact = keywords.find((c) => c.kw === lower);
    let chosen: TrieNode<C> | null = exact ?? (keywords.length === 1 ? keywords[0] : null);
    let consumed = 1;
    if (!chosen && keywords.length > 1) return { ok: false, error: 'ambiguous', index, token };
    if (!chosen) {
      for (const child of node.children) {
        if (!child.param) continue;
        const matched = matchParam(child.param, words, index, device);
        if (!matched) continue;
        chosen = child;
        consumed = matched.consumed;
        args[child.param.name] = matched.value;
        break;
      }
    }
    if (!chosen) return { ok: false, error: 'invalid', index, token };
    node = chosen;
    index += consumed;
  }
  if (!node.run) return { ok: false, error: 'incomplete', index, token: '' };
  return { ok: true, run: node.run, args };
}

export interface HelpEntry {
  word: string;
  help: L10n | null;
}

const PARAM_LABEL: Record<ParamType, string> = {
  ip: 'A.B.C.D',
  ip6: 'X:X:X:X::X',
  ip6p: 'X:X:X:X::X/<0-128>',
  mask: 'A.B.C.D',
  wild: 'A.B.C.D',
  num: '<n>',
  word: 'WORD',
  iface: 'INTERFACE',
  ifnew: 'INTERFACE',
  line: 'LINE',
  vlans: 'VLAN_IDS',
  ifrange: 'INTERFACES',
};

export function helpFor<C>(root: TrieNode<C>, line: string, device: Device, dictionary: Record<string, L10n>): HelpEntry[] | null {
  const endsWithSpace = /\s$/.test(line) || line === '';
  const tokens = tokenize(line).map((t) => t.text);
  const partial = endsWithSpace ? '' : (tokens.pop() ?? '');
  let node = root;
  let index = 0;
  while (index < tokens.length) {
    const lower = tokens[index].toLowerCase();
    const keywords = node.children.filter((c) => c.kw && c.kw.startsWith(lower));
    const exact = keywords.find((c) => c.kw === lower);
    let chosen = exact ?? (keywords.length === 1 ? keywords[0] : null);
    let consumed = 1;
    if (!chosen) {
      for (const child of node.children) {
        if (!child.param) continue;
        const matched = matchParam(child.param, tokens, index, device);
        if (matched) {
          chosen = child;
          consumed = matched.consumed;
          break;
        }
      }
    }
    if (!chosen) return null;
    node = chosen;
    index += consumed;
  }
  const entries: HelpEntry[] = [];
  for (const child of node.children) {
    if (child.kw) {
      if (child.kw.startsWith(partial.toLowerCase())) entries.push({ word: child.kw, help: dictionary[child.kw] ?? null });
    } else if (child.param && !partial) {
      const label = child.param.type === 'num' && child.param.max < Number.MAX_SAFE_INTEGER ? `<${child.param.min}-${child.param.max}>` : PARAM_LABEL[child.param.type];
      entries.push({ word: label, help: dictionary[`<${child.param.name}>`] ?? null });
    }
  }
  if (node.run && !partial) entries.push({ word: '<cr>', help: null });
  entries.sort((a, b) => (a.word === '<cr>' ? 1 : b.word === '<cr>' ? -1 : a.word.localeCompare(b.word)));
  return entries;
}

export function completeLine<C>(root: TrieNode<C>, line: string, device: Device): string | null {
  if (/\s$/.test(line) || !line.trim()) return null;
  const tokens = tokenize(line);
  const last = tokens.pop()!;
  const before = line.slice(0, last.start);
  const entries = helpFor(root, before, device, {});
  if (!entries) return null;
  const matches = entries.filter((e) => /^[a-z0-9-]+$/.test(e.word) && e.word.startsWith(last.text.toLowerCase()));
  if (matches.length !== 1) return null;
  return `${before}${matches[0].word} `;
}

