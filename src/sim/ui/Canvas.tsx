import { useSignal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { tx } from '../../i18n';
import { progress } from '../../state/progress';
import { toast } from '../../ui/toast';
import { modelOf } from '../catalog';
import { isHost } from '../network';
import type { Device, DeviceKind, Link, TraceEvent } from '../types';
import type { SimController } from './controller';
import { DeviceShape, categoryColor } from './DeviceGlyph';
import { PortPicker } from './PortPicker';

export interface View {
  x: number;
  y: number;
  zoom: number;
}

const TILE = 56;

export const PROTO_COLOR: Record<string, string> = {
  ARP: 'var(--proto-arp)',
  ICMP: 'var(--proto-icmp)',
  DHCP: 'var(--proto-dhcp)',
  DNS: 'var(--proto-dns)',
  TCP: 'var(--proto-tcp)',
  HTTP: 'var(--proto-http)',
  HTTPS: 'var(--proto-https)',
  UDP: 'var(--proto-udp)',
};

function primaryIp(ctrl: SimController, device: Device): string {
  const entry = ctrl.sim.topo.l3Ifs(device).find((e) => e.ip !== null && e.attach.kind !== 'loop');
  if (!entry) return '';
  return `${entry.cfg.ip}/${entry.prefix}`;
}

function connectErrorText(error: string): string {
  switch (error) {
    case 'same-device':
      return tx('Nie można połączyć urządzenia z samym sobą.', 'A device cannot be connected to itself.');
    case 'port-busy':
      return tx('Brak wolnego portu. Odłącz inny kabel albo wybierz inne urządzenie.', 'No free port. Disconnect another cable or pick another device.');
    case 'media-mismatch':
      return tx('Porty nie pasują: kabel miedziany łączy porty RJ45, a światłowód porty SFP.', 'Ports do not match: copper connects RJ45 ports and fiber connects SFP ports.');
    case 'cable-mismatch':
      return tx('Ten kabel nie pasuje do wybranego portu. Wybierz kabel zgodny z typem portu.', 'This cable does not fit the selected port. Choose a cable that matches the port type.');
    case 'wireless-port':
      return tx('Karta Wi-Fi łączy się bezprzewodowo. Skonfiguruj Wi-Fi w panelu urządzenia.', 'A Wi-Fi card connects wirelessly. Set up Wi-Fi in the device panel.');
    default:
      return error;
  }
}

export function useStepEvents(ctrl: SimController): TraceEvent[] {
  const events = ctrl.events.value;
  const step = ctrl.step.value;
  const filters = ctrl.filters.value;
  if (step < 0) return [];
  const times = stepTimes(events, filters);
  const time = times[step];
  if (time === undefined) return [];
  return events.filter((e) => e.time === time && filters.has(e.proto));
}

export function stepTimes(events: TraceEvent[], filters: Set<string>): number[] {
  const set = new Set<number>();
  for (const event of events) if (filters.has(event.proto)) set.add(event.time);
  return [...set].sort((a, b) => a - b);
}

interface Drag {
  id: string;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export function Canvas({ ctrl, view, onView, readOnlyDevices }: { ctrl: SimController; view: View; onView: (v: View) => void; readOnlyDevices?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const drag = useRef<Drag | null>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const picker = useSignal<{ dev: string; x: number; y: number; step: 'a' | 'b' } | null>(null);
  const [, setTick] = useState(0);
  const rev = ctrl.rev.value;
  const settings = progress.value.settings;
  const stepEvents = useStepEvents(ctrl);
  const [anim, setAnim] = useState(1);

  useLayoutEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const reduced = typeof window !== 'undefined' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || settings.motion === 'reduce');

  useEffect(() => {
    if (!stepEvents.length) return;
    if (reduced) {
      setAnim(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 700 / ctrl.speed.value;
    setAnim(0);
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setAnim(t);
      if (t < 1) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [ctrl.step.value, ctrl.events.value.length]);

  useEffect(() => {
    if (!ctrl.flashes.value.length) return;
    let frame = 0;
    const loop = () => {
      const now = performance.now();
      if (ctrl.flashes.value.some((f) => f.until > now)) {
        setTick((n) => n + 1);
        frame = requestAnimationFrame(loop);
      } else ctrl.flashes.value = [];
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [ctrl.flashes.value]);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: view.x + (clientX - rect.left) / view.zoom, y: view.y + (clientY - rect.top) / view.zoom };
  };

  const devices = ctrl.net.devices;
  const byId = new Map(devices.map((d) => [d.id, d]));
  const topo = ctrl.sim.topo;
  const wireless = topo.wifiAssociations();

  const handleDevice = (device: Device, clientX: number, clientY: number) => {
    const tool = ctrl.tool.value;
    if (tool === 'delete') {
      if (readOnlyDevices) return toast(tx('W tym laboratorium nie usuwasz urządzeń.', 'You cannot delete devices in this lab.'), 'warn');
      ctrl.deleteDevice(device.id);
      return;
    }
    if (tool === 'pdu') {
      if (!ctrl.pduFrom.value) {
        if (!isHost(device.kind) && !modelOf(device.kind).cli) return toast(tx('Wybierz komputer, serwer albo router jako nadawcę.', 'Pick a computer, server or router as the sender.'), 'warn');
        ctrl.pduFrom.value = device.id;
        return;
      }
      const from = ctrl.pduFrom.value;
      ctrl.pduFrom.value = null;
      if (from === device.id) return;
      const outcome = ctrl.sendPdu(from, device.id);
      if (outcome === 'no-target-ip') toast(tx('Odbiorca nie ma adresu IP.', 'The receiver has no IP address.'), 'warn');
      else if (ctrl.mode.value === 'realtime') {
        const ok = outcome === 'reply';
        toast(ok ? tx('Pakiet testowy: odpowiedź dotarła.', 'Test packet: reply received.') : tx('Pakiet testowy nie dotarł. Włącz tryb symulacji, żeby zobaczyć, gdzie zginął.', 'The test packet failed. Switch to simulation mode to see where it was lost.'), ok ? 'ok' : 'warn');
      }
      return;
    }
    if (tool === 'connect') {
      const rect = svgRef.current!.getBoundingClientRect();
      const from = ctrl.connectFrom.value;
      if (ctrl.cable.value === 'auto') {
        if (!from) {
          ctrl.connectFrom.value = { dev: device.id, port: '' };
          return;
        }
        ctrl.connectFrom.value = null;
        const result = ctrl.link(from, null, device.id);
        if (typeof result === 'string') toast(connectErrorText(result), 'danger');
        return;
      }
      picker.value = { dev: device.id, x: clientX - rect.left, y: clientY - rect.top, step: from ? 'b' : 'a' };
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
      drag.current = null;
      pan.current = null;
      return;
    }
    const placing = ctrl.placing.value;
    if (placing) {
      const p = toWorld(event.clientX, event.clientY);
      const id = ctrl.addDevice(placing, p.x, p.y);
      ctrl.placing.value = null;
      ctrl.selected.value = id;
      return;
    }
    const deviceEl = target.closest('[data-device]');
    const linkEl = target.closest('[data-link]');
    picker.value = null;
    if (deviceEl) {
      const id = deviceEl.getAttribute('data-device')!;
      const device = byId.get(id)!;
      if (ctrl.tool.value === 'select') {
        const p = toWorld(event.clientX, event.clientY);
        drag.current = { id, dx: p.x - device.x, dy: p.y - device.y, startX: event.clientX, startY: event.clientY, moved: false };
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
      } else handleDevice(device, event.clientX, event.clientY);
      return;
    }
    if (linkEl && ctrl.tool.value === 'delete') {
      if (readOnlyDevices) return toast(tx('W tym laboratorium nie usuwasz kabli.', 'You cannot delete cables in this lab.'), 'warn');
      const id = linkEl.getAttribute('data-link')!;
      if (!id.startsWith('w-')) ctrl.deleteLink(id);
      return;
    }
    ctrl.selected.value = null;
    pan.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const zoom = Math.min(2.5, Math.max(0.35, (pinch.current.zoom * dist) / pinch.current.dist));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const before = toWorld(mid.x, mid.y);
      const rect = svgRef.current!.getBoundingClientRect();
      onView({ zoom, x: before.x - (mid.x - rect.left) / zoom, y: before.y - (mid.y - rect.top) / zoom });
      return;
    }
    const d = drag.current;
    if (d) {
      if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 5) return;
      d.moved = true;
      const p = toWorld(event.clientX, event.clientY);
      ctrl.moveDevice(d.id, p.x - d.dx, p.y - d.dy, false);
      return;
    }
    const p = pan.current;
    if (p) onView({ ...view, x: p.vx - (event.clientX - p.x) / view.zoom, y: p.vy - (event.clientY - p.y) / view.zoom });
  };

  const onPointerUp = (event: PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    pan.current = null;
    if (!d) return;
    const device = byId.get(d.id);
    if (!device) return;
    if (d.moved) ctrl.moveDevice(d.id, device.x, device.y, true);
    else {
      ctrl.selected.value = d.id;
      ctrl.panel.value = { dev: d.id, tab: 'default' };
    }
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
    const zoom = Math.min(2.5, Math.max(0.35, view.zoom * factor));
    const before = toWorld(event.clientX, event.clientY);
    const rect = svgRef.current!.getBoundingClientRect();
    onView({ zoom, x: before.x - (event.clientX - rect.left) / zoom, y: before.y - (event.clientY - rect.top) / zoom });
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const kind = event.dataTransfer?.getData('application/x-panrouter-device') as DeviceKind | '';
    if (!kind) return;
    const p = toWorld(event.clientX, event.clientY);
    const id = ctrl.addDevice(kind, p.x, p.y);
    ctrl.selected.value = id;
  };

  const ledColor = (dev: Device, port: string) => {
    if (!topo.portUp(dev, port)) return 'var(--danger)';
    if (topo.stpBlocked(dev.id, port)) return 'var(--warn)';
    return 'var(--ok)';
  };

  const now = performance.now();
  const flashes = ctrl.flashes.value.filter((f) => f.until > now);
  const flashByLink = new Map(flashes.map((f) => [f.link, f]));
  const activeLinks = new Set(stepEvents.map((e) => e.link).filter(Boolean));

  const renderLink = (link: Link) => {
    const a = byId.get(link.a.dev);
    const b = byId.get(link.b.dev);
    if (!a || !b) return null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const off = TILE / 2 + 10;
    const flash = flashByLink.get(link.id);
    const portA = a.ports.find((p) => p.name === link.a.port);
    const portB = b.ports.find((p) => p.name === link.b.port);
    return (
      <g key={link.id} data-link={link.id} class={`link ${activeLinks.has(link.id) ? 'link-active' : ''}`}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="link-hit" />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class={`link-line link-${link.cable}`} />
        {flash && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="link-flash" style={{ stroke: PROTO_COLOR[flash.proto], opacity: Math.max(0, (flash.until - now) / 700) }} />}
        <circle cx={a.x + ux * off} cy={a.y + uy * off} r="4.5" style={{ fill: ledColor(a, link.a.port) }} class="led" />
        <circle cx={b.x - ux * off} cy={b.y - uy * off} r="4.5" style={{ fill: ledColor(b, link.b.port) }} class="led" />
        {settings.showPorts && (
          <>
            <text x={a.x + ux * (off + 16) - uy * 10} y={a.y + uy * (off + 16) + ux * 10} class="port-label">
              {portA?.short}
            </text>
            <text x={b.x - ux * (off + 16) - uy * 10} y={b.y - uy * (off + 16) + ux * 10} class="port-label">
              {portB?.short}
            </text>
          </>
        )}
      </g>
    );
  };

  const packets = stepEvents.map((event) => {
    const from = byId.get(event.from.dev);
    const to = event.to ? byId.get(event.to.dev) : null;
    if (!from) return null;
    const t = to ? anim : 1;
    const x = to ? from.x + (to.x - from.x) * t : from.x;
    const y = to ? from.y + (to.y - from.y) * t : from.y - TILE / 2 - 14;
    const color = PROTO_COLOR[event.proto] ?? 'var(--text)';
    const index = ctrl.events.value.indexOf(event);
    const selected = ctrl.selectedEvent.value === index;
    return (
      <g
        key={`${event.seq}`}
        transform={`translate(${x} ${y})`}
        class={`packet ${selected ? 'packet-selected' : ''}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          ctrl.selectedEvent.value = index;
        }}
      >
        <rect x="-11" y="-8" width="22" height="16" rx="2.5" style={{ fill: color }} />
        <path d="M-11 -7 0 1 11 -7" style={{ fill: 'none', stroke: 'var(--bg)', strokeWidth: 1.6 }} />
        {anim >= 1 && event.outcome === 'drop' && (
          <g class="packet-drop">
            <circle cx="13" cy="-11" r="8" />
            <path d="M9.5 -14.5l7 7M16.5 -14.5l-7 7" />
          </g>
        )}
      </g>
    );
  });

  const selectedId = ctrl.selected.value;
  const rangeDevices = devices.filter((d) => (d.kind === 'ap' || d.kind === 'homeRouter') && (selectedId === d.id || ctrl.placing.value === 'laptop' || ctrl.placing.value === 'phone'));
  const pickerState = picker.value;

  return (
    <div class="canvas-wrap" data-tool={ctrl.tool.value} data-placing={ctrl.placing.value ? 'true' : 'false'} data-rev={rev}>
      <svg
        ref={svgRef}
        class="canvas"
        viewBox={`${view.x} ${view.y} ${size.w / view.zoom} ${size.h / view.zoom}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        role="application"
        aria-label={tx('Plansza topologii sieci', 'Network topology canvas')}
      >
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" class="grid-dot" />
          </pattern>
        </defs>
        <rect x={view.x} y={view.y} width={size.w / view.zoom} height={size.h / view.zoom} fill="url(#grid)" class="canvas-bg" />
        {rangeDevices.map((d) => (
          <circle key={`range-${d.id}`} cx={d.x} cy={d.y} r={modelOf(d.kind).wifiRange} class="wifi-range" />
        ))}
        {wireless.map((w) => {
          const client = byId.get(w.client);
          const ap = byId.get(w.ap);
          if (!client || !ap) return null;
          const flash = flashByLink.get(`w-${w.client}`);
          return (
            <g key={`w-${w.client}`} data-link={`w-${w.client}`} class={activeLinks.has(`w-${w.client}`) ? 'link-active' : ''}>
              <line x1={ap.x} y1={ap.y} x2={client.x} y2={client.y} class="link-line link-wireless" />
              {flash && <line x1={ap.x} y1={ap.y} x2={client.x} y2={client.y} class="link-flash" style={{ stroke: PROTO_COLOR[flash.proto], opacity: Math.max(0, (flash.until - now) / 700) }} />}
            </g>
          );
        })}
        {ctrl.net.links.map(renderLink)}
        {devices.map((device) => {
          const powered = topo.isPowered(device);
          const ip = settings.showIps ? primaryIp(ctrl, device) : '';
          const isSource = ctrl.connectFrom.value?.dev === device.id || ctrl.pduFrom.value === device.id;
          return (
            <g
              key={device.id}
              data-device={device.id}
              transform={`translate(${device.x} ${device.y})`}
              class={`node ${selectedId === device.id ? 'node-selected' : ''} ${isSource ? 'node-source' : ''} ${powered ? '' : 'node-off'}`}
              style={{ color: categoryColor(device.kind) }}
              tabIndex={0}
              role="button"
              aria-label={`${device.name}, ${modelOf(device.kind).model}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (ctrl.tool.value === 'select') {
                    ctrl.selected.value = device.id;
                    ctrl.panel.value = { dev: device.id, tab: 'default' };
                  } else handleDevice(device, 0, 0);
                }
              }}
            >
              <rect x={-TILE / 2 - 6} y={-TILE / 2 - 6} width={TILE + 12} height={TILE + 12} rx="16" class="node-ring" />
              <g transform={`translate(${-TILE / 2} ${-TILE / 2}) scale(${TILE / 48})`}>
                <rect x="1.5" y="1.5" width="45" height="45" rx="11" class="node-tile" />
                <DeviceShape kind={device.kind} />
              </g>
              <text y={TILE / 2 + 18} class="node-name">
                {device.name}
              </text>
              {!powered && (
                <text y={TILE / 2 + 34} class="node-warn">
                  {tx('brak zasilania PoE', 'no PoE power')}
                </text>
              )}
              {powered && ip && (
                <text y={TILE / 2 + 34} class="node-ip">
                  {ip}
                </text>
              )}
            </g>
          );
        })}
        {packets}
      </svg>
      {pickerState && (
        <PortPicker
          ctrl={ctrl}
          deviceId={pickerState.dev}
          x={pickerState.x}
          y={pickerState.y}
          onPick={(port) => {
            picker.value = null;
            const from = ctrl.connectFrom.value;
            if (!from) {
              ctrl.connectFrom.value = { dev: pickerState.dev, port };
              return;
            }
            ctrl.connectFrom.value = null;
            const result = ctrl.link(from, { dev: pickerState.dev, port });
            if (typeof result === 'string') toast(connectErrorText(result), 'danger');
          }}
          onClose={() => (picker.value = null)}
        />
      )}
    </div>
  );
}
