import type { L10n } from '../i18n/l10n';
import type { Network } from '../sim/types';

export type DiagramId =
  | 'lan-wan'
  | 'home-network'
  | 'client-server'
  | 'osi-stack'
  | 'encapsulation'
  | 'switch-learning'
  | 'vlan-trunk'
  | 'router-on-stick'
  | 'routing-table'
  | 'subnet-bar'
  | 'tcp-handshake'
  | 'dhcp-dora'
  | 'dns-resolution'
  | 'nat-pat'
  | 'stp-loop'
  | 'ospf-areas'
  | 'campus-hierarchy'
  | 'spine-leaf'
  | 'zero-trust'
  | 'wifi-bands'
  | 'ipv6-address'
  | 'fiber-copper';

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'callout'; kind: 'info' | 'tip' | 'warn' | 'ok'; title?: string; text: string }
  | { t: 'code'; lines: string[]; caption?: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'figure'; id: DiagramId; caption: string }
  | { t: 'terms'; items: [string, string][] };

export interface Section {
  id: string;
  title: L10n;
  body: { pl: Block[]; en: Block[] };
}

export type Question =
  | { id: string; kind: 'single'; q: L10n; options: L10n[]; answer: number; explain: L10n }
  | { id: string; kind: 'multi'; q: L10n; options: L10n[]; answer: number[]; explain: L10n }
  | { id: string; kind: 'input'; q: L10n; answer: string[]; placeholder?: string; explain: L10n }
  | { id: string; kind: 'order'; q: L10n; items: L10n[]; explain: L10n };

export interface Module {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  title: L10n;
  summary: L10n;
  minutes: number;
  icon: string;
  sections: Section[];
  quiz: Question[];
  labs: string[];
  games: string[];
}

export interface Level {
  id: 1 | 2 | 3 | 4 | 5;
  title: L10n;
  rank: L10n;
  summary: L10n;
}

export interface LabCheck {
  id: string;
  label: L10n;
  hint: L10n;
  test: (ctx: LabContext) => boolean;
}

export interface LabContext {
  net: Network;
  device: (name: string) => import('../sim/types').Device | undefined;
  port: (name: string, port: string) => import('../sim/types').Port | undefined;
  ping: (from: string, to: string) => boolean;
  http: (from: string, url: string) => boolean;
  connect: (from: string, to: string, port: number) => 'open' | 'refused' | 'timeout';
  ospfNeighbors: (name: string) => number;
  hasRoute: (name: string, cidr: string, code?: string) => boolean;
  portUp: (name: string, port: string) => boolean;
  stpRoot: (name: string) => boolean;
  stpBlockedOn: (name: string) => number;
  connected: (a: string, b: string) => boolean;
  wifi: (name: string) => boolean;
  arpHas: (name: string, ip: string) => boolean;
  macKnows: (switchName: string, deviceName: string) => boolean;
  inSubnet: (ip: string, cidr: string) => boolean;
}

export interface Lab {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  title: L10n;
  summary: L10n;
  minutes: number;
  goals: L10n[];
  steps: { pl: Block[]; en: Block[] };
  build: () => Network;
  checks: LabCheck[];
  locked?: boolean;
}
