import { signal } from '@preact/signals';
import { cliExecute, newSession, type CliSession } from '../cli/ios';
import { newHostSession, type HostSession } from '../cli/host';
import { Simulator } from '../engine';
import { autoConnect, canConnect, connect, createDevice, removeDevice, removeLink, type ConnectError } from '../network';
import type { CableType, DeviceKind, Link, LinkEnd, Network, TraceEvent } from '../types';

export type Tool = 'select' | 'connect' | 'delete' | 'pdu';
export type CableChoice = 'auto' | CableType;
export type SimMode = 'realtime' | 'simulation';

export interface TermState {
  lines: { text: string; kind: 'out' | 'in' | 'err' }[];
}

export interface PanelState {
  dev: string;
  tab: string;
  app?: string;
}

export interface Flash {
  link: string;
  proto: string;
  until: number;
}

export class SimController {
  net: Network;
  sim: Simulator;
  rev = signal(0);
  mode = signal<SimMode>('realtime');
  tool = signal<Tool>('select');
  cable = signal<CableChoice>('auto');
  events = signal<TraceEvent[]>([]);
  step = signal(-1);
  selectedEvent = signal<number | null>(null);
  playing = signal(false);
  speed = signal(1);
  filters = signal<Set<string>>(new Set(['ARP', 'ICMP', 'DHCP', 'DNS', 'TCP', 'HTTP', 'HTTPS', 'UDP']));
  panel = signal<PanelState | null>(null);
  selected = signal<string | null>(null);
  connectFrom = signal<LinkEnd | null>(null);
  pduFrom = signal<string | null>(null);
  placing = signal<DeviceKind | null>(null);
  flashes = signal<Flash[]>([]);
  terminals = new Map<string, TermState>();
  cliSessions = new Map<string, CliSession>();
  hostSessions = new Map<string, HostSession>();
  private persist: (net: Network) => void;
  private gui = new Map<string, CliSession>();

  constructor(net: Network, persist: (net: Network) => void) {
    this.net = net;
    this.persist = persist;
    this.sim = new Simulator(net);
    this.sim.onTrace = (events) => this.onTrace(events);
  }

  load(net: Network): void {
    this.net = net;
    this.sim.reset(net);
    this.events.value = [];
    this.step.value = -1;
    this.selectedEvent.value = null;
    this.panel.value = null;
    this.selected.value = null;
    this.terminals.clear();
    this.cliSessions.clear();
    this.hostSessions.clear();
    this.gui.clear();
    this.bump();
    this.persist(net);
  }

  private onTrace(events: TraceEvent[]): void {
    if (this.mode.value === 'simulation') {
      const offset = this.events.value.length ? this.events.value[this.events.value.length - 1].time + 1 : 0;
      const base = events[0]?.time ?? 0;
      const shifted = events.map((event) => ({ ...event, time: event.time - base + offset }));
      this.events.value = [...this.events.value, ...shifted].slice(-1500);
      return;
    }
    const now = performance.now();
    const fresh = events.filter((e) => e.link).map((e) => ({ link: e.link!, proto: e.proto, until: now + 700 }));
    if (!fresh.length) return;
    this.flashes.value = [...this.flashes.value.filter((f) => f.until > now), ...fresh].slice(-120);
  }

  bump(): void {
    this.rev.value++;
    if (this.sim.dirty) {
      this.sim.dirty = false;
      this.persist(this.net);
    }
  }

  changed(structural = true): void {
    if (structural) this.sim.invalidate();
    else this.sim.refresh();
    this.sim.autoDhcp();
    this.bump();
    this.persist(this.net);
  }

  saveOnly(): void {
    this.bump();
    this.persist(this.net);
  }

  addDevice(kind: DeviceKind, x: number, y: number): string {
    const device = createDevice(this.net, kind, Math.round(x), Math.round(y));
    this.net.devices.push(device);
    this.changed();
    return device.id;
  }

  moveDevice(id: string, x: number, y: number, commit: boolean): void {
    const device = this.net.devices.find((d) => d.id === id);
    if (!device) return;
    device.x = Math.round(x);
    device.y = Math.round(y);
    if (commit) {
      const wireless = device.kind === 'ap' || device.kind === 'homeRouter' || device.ports.some((p) => p.media === 'wireless');
      if (wireless) this.changed();
      else this.saveOnly();
    } else this.bump();
  }

  deleteDevice(id: string): void {
    removeDevice(this.net, id);
    if (this.panel.value?.dev === id) this.panel.value = null;
    if (this.selected.value === id) this.selected.value = null;
    this.terminals.delete(id);
    this.cliSessions.delete(id);
    this.hostSessions.delete(id);
    this.changed();
  }

  deleteLink(id: string): void {
    removeLink(this.net, id);
    this.changed();
  }

  link(a: LinkEnd, b: LinkEnd | null, targetDevice?: string): Link | ConnectError {
    if (!b && targetDevice) {
      const devA = this.net.devices.find((d) => d.id === a.dev)!;
      const devB = this.net.devices.find((d) => d.id === targetDevice)!;
      const result = autoConnect(this.net, devA, devB);
      if (typeof result !== 'string') this.changed();
      return result;
    }
    const devA = this.net.devices.find((d) => d.id === a.dev)!;
    const portA = devA.ports.find((p) => p.name === a.port)!;
    const cable: CableType = portA.media === 'fiber' ? 'fiber' : 'copper';
    const error = canConnect(this.net, a, b!, cable);
    if (error) return error;
    const result = connect(this.net, a, b!, cable);
    if (typeof result !== 'string') this.changed();
    return result;
  }

  terminal(devId: string): TermState {
    let term = this.terminals.get(devId);
    if (!term) {
      term = { lines: [] };
      this.terminals.set(devId, term);
    }
    return term;
  }

  cliSession(devId: string): CliSession {
    let session = this.cliSessions.get(devId);
    if (!session) {
      session = newSession(devId);
      this.cliSessions.set(devId, session);
    }
    return session;
  }

  hostSession(devId: string): HostSession {
    let session = this.hostSessions.get(devId);
    if (!session) {
      session = newHostSession(devId);
      this.hostSessions.set(devId, session);
    }
    return session;
  }

  runConfig(devId: string, commands: string[]): { commands: string[]; errors: string[] } {
    let session = this.gui.get(devId);
    if (!session) {
      session = newSession(devId);
      this.gui.set(devId, session);
    }
    session.mode = 'user';
    const errors: string[] = [];
    const all = ['enable', 'configure terminal', ...commands, 'end'];
    let changed = false;
    for (const command of all) {
      const result = cliExecute(this.sim, session, command);
      if (result.changed) {
        changed = true;
        this.sim.invalidate();
      }
      const problem = result.lines.find(
        (line) => (line.startsWith('%') && !/^%(LINK|LINEPROTO)|^% Access VLAN|^% Warning|^%Warning/.test(line)) || line.startsWith('Bad mask'),
      );
      if (problem) errors.push(`${command}: ${problem}`);
    }
    if (changed) this.changed();
    return { commands, errors };
  }

  clearEvents(): void {
    this.events.value = [];
    this.step.value = -1;
    this.selectedEvent.value = null;
    this.playing.value = false;
  }

  sendPdu(fromId: string, toId: string): string | null {
    const from = this.net.devices.find((d) => d.id === fromId);
    const to = this.net.devices.find((d) => d.id === toId);
    if (!from || !to) return null;
    const target = this.sim.topo.l3Ifs(to).find((e) => e.ip !== null && e.up);
    if (!target || target.ip === null) return 'no-target-ip';
    const result = this.sim.echo(fromId, target.ip);
    this.bump();
    return result.outcome;
  }
}
