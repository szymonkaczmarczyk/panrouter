import { Cable, Download, FolderOpen, Hand, LayoutTemplate, Mail, Maximize, MousePointer2, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { tr, tx } from '../../i18n';
import { toast } from '../../ui/toast';
import { modelOf } from '../catalog';
import { TEMPLATES } from '../templates';
import type { Network } from '../types';
import { Canvas, stepTimes, type View } from './Canvas';
import type { CableChoice, SimController, Tool } from './controller';
import { DevicePanel } from './DevicePanel';
import { EventPanel } from './EventPanel';
import { Palette } from './Palette';

export function fitView(net: Network, width: number, height: number): View {
  if (!net.devices.length) return { x: -60, y: -40, zoom: 1 };
  const xs = net.devices.map((d) => d.x);
  const ys = net.devices.map((d) => d.y);
  const minX = Math.min(...xs) - 90;
  const maxX = Math.max(...xs) + 90;
  const minY = Math.min(...ys) - 80;
  const maxY = Math.max(...ys) + 110;
  const zoom = Math.min(1.4, Math.max(0.4, Math.min(width / (maxX - minX), height / (maxY - minY))));
  return { zoom, x: (minX + maxX) / 2 - width / zoom / 2, y: (minY + maxY) / 2 - height / zoom / 2 };
}

const TOOLS: { id: Tool; key: string; icon: typeof Hand; label: [string, string] }[] = [
  { id: 'select', key: 'V', icon: MousePointer2, label: ['Wybierz i przesuń', 'Select and move'] },
  { id: 'connect', key: 'C', icon: Cable, label: ['Połącz kablem', 'Connect cable'] },
  { id: 'pdu', key: 'P', icon: Mail, label: ['Pakiet testowy', 'Test packet'] },
  { id: 'delete', key: 'D', icon: Trash2, label: ['Usuń', 'Delete'] },
];

interface Props {
  ctrl: SimController;
  allowFiles?: boolean;
  locked?: boolean;
  leading?: ComponentChildren;
  side?: ComponentChildren;
}

export function Workspace({ ctrl, allowFiles = false, locked = false, leading, side }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: -60, y: -40, zoom: 1 });
  const [menu, setMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mode = ctrl.mode.value;
  const tool = ctrl.tool.value;

  const fit = () => {
    const el = canvasRef.current;
    if (!el) return;
    const palette = el.querySelector<HTMLElement>('.palette');
    const reserved = palette ? palette.offsetHeight + 24 : 0;
    setView(fitView(ctrl.net, el.clientWidth, el.clientHeight - reserved));
  };

  useEffect(() => {
    const id = window.setTimeout(fit, 30);
    return () => window.clearTimeout(id);
  }, [ctrl]);

  const setTool = (next: Tool) => {
    ctrl.tool.value = next;
    ctrl.connectFrom.value = null;
    ctrl.pduFrom.value = null;
    ctrl.placing.value = null;
  };

  const setMode = (next: 'realtime' | 'simulation') => {
    ctrl.mode.value = next;
    ctrl.playing.value = false;
    if (next === 'simulation') ctrl.panel.value = null;
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        if (ctrl.placing.value || ctrl.connectFrom.value || ctrl.pduFrom.value) {
          ctrl.placing.value = null;
          ctrl.connectFrom.value = null;
          ctrl.pduFrom.value = null;
        } else if (ctrl.panel.value) ctrl.panel.value = null;
        else setTool('select');
        return;
      }
      const found = TOOLS.find((t) => t.key.toLowerCase() === key);
      if (found) {
        event.preventDefault();
        setTool(found.id);
        return;
      }
      if (key === 's') {
        event.preventDefault();
        setMode(ctrl.mode.value === 'realtime' ? 'simulation' : 'realtime');
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        fit();
        return;
      }
      if ((key === 'delete' || key === 'backspace') && ctrl.selected.value && !locked) {
        event.preventDefault();
        ctrl.deleteDevice(ctrl.selected.value);
        return;
      }
      if (ctrl.mode.value === 'simulation') {
        const times = stepTimes(ctrl.events.value, ctrl.filters.value);
        if (key === 'arrowright') {
          event.preventDefault();
          ctrl.step.value = Math.min(times.length - 1, ctrl.step.value + 1);
        }
        if (key === 'arrowleft') {
          event.preventDefault();
          ctrl.step.value = Math.max(-1, ctrl.step.value - 1);
        }
        if (key === ' ') {
          event.preventDefault();
          ctrl.playing.value = !ctrl.playing.value;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctrl, locked]);

  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !(event.target as Element).closest('.menu-wrap')) setMenu(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [menu]);

  const exportNet = () => {
    const blob = new Blob([JSON.stringify(ctrl.net, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siec-${new Date().toISOString().slice(0, 10)}.panrouter.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenu(false);
  };

  const importNet = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    setMenu(false);
    if (!file) return;
    if (file.size > 3_000_000) return toast(tx('Plik jest za duży (limit 3 MB).', 'The file is too large (3 MB limit).'), 'danger');
    try {
      const net = JSON.parse(await file.text()) as Network;
      if (net.version !== 1 || !Array.isArray(net.devices) || !Array.isArray(net.links) || net.devices.some((d) => !d.id || !d.kind || !Array.isArray(d.ports))) throw new Error('format');
      net.devices.forEach((d) => modelOf(d.kind));
      ctrl.load(net);
      fit();
      toast(tx('Wczytano sieć z pliku.', 'Network loaded from file.'), 'ok');
    } catch {
      toast(tx('Ten plik nie zawiera sieci PanRouter. Wybierz plik .panrouter.json.', 'This file does not contain a PanRouter network. Choose a .panrouter.json file.'), 'danger');
    }
  };

  const loadTemplate = (id: string) => {
    const template = TEMPLATES.find((t) => t.id === id)!;
    if (ctrl.net.devices.length && !window.confirm(tx('Zastąpić obecną sieć szablonem? Niezapisane zmiany przepadną.', 'Replace the current network with the template? Unsaved changes will be lost.'))) return;
    ctrl.load(template.build());
    ctrl.sim.autoDhcp();
    ctrl.bump();
    setMenu(false);
    window.setTimeout(fit, 30);
  };

  const hint = (() => {
    if (ctrl.placing.value) return tx(`Kliknij na planszy, żeby postawić: ${tr(modelOf(ctrl.placing.value).title)}. Esc anuluje.`, `Click the canvas to place: ${tr(modelOf(ctrl.placing.value).title)}. Esc cancels.`);
    if (tool === 'connect') return ctrl.connectFrom.value ? tx('Teraz kliknij drugie urządzenie.', 'Now click the second device.') : tx('Kliknij pierwsze urządzenie, które chcesz połączyć.', 'Click the first device you want to connect.');
    if (tool === 'pdu') return ctrl.pduFrom.value ? tx('Kliknij odbiorcę pakietu.', 'Click the packet receiver.') : tx('Kliknij nadawcę pakietu testowego (ping).', 'Click the test packet sender (ping).');
    if (tool === 'delete') return tx('Kliknij urządzenie albo kabel, żeby usunąć.', 'Click a device or cable to delete it.');
    return '';
  })();

  return (
    <div class="ws" data-mode={mode}>
      <div class="ws-toolbar">
        {leading}
        <div class="segmented tools" role="toolbar" aria-label={tx('Narzędzia', 'Tools')}>
          {TOOLS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" aria-pressed={tool === item.id} onClick={() => setTool(item.id)} title={`${tx(...item.label)} (${item.key})`} aria-label={`${tx(...item.label)} (${item.key})`}>
                <Icon aria-hidden="true" />
                <span class="tool-label">{tx(...item.label)}</span>
                <kbd>{item.key}</kbd>
              </button>
            );
          })}
        </div>
        {tool === 'connect' && (
          <div class="segmented" role="group" aria-label={tx('Rodzaj kabla', 'Cable type')}>
            {(
              [
                ['auto', 'Automatyczny', 'Automatic'],
                ['copper', 'Miedź Cat6A', 'Copper Cat6A'],
                ['fiber', 'Światłowód', 'Fiber'],
              ] as [CableChoice, string, string][]
            ).map(([id, pl, en]) => (
              <button key={id} type="button" aria-pressed={ctrl.cable.value === id} onClick={() => (ctrl.cable.value = id)}>
                {id !== 'auto' && <span class={`cable-swatch cable-${id}`} />}
                {tx(pl, en)}
              </button>
            ))}
          </div>
        )}
        <div class="spacer" />
        <div class="segmented zoom" role="group" aria-label={tx('Powiększenie', 'Zoom')}>
          <button type="button" onClick={() => setView({ ...view, zoom: Math.max(0.35, view.zoom / 1.2) })} aria-label={tx('Oddal', 'Zoom out')}>
            <ZoomOut aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setView({ ...view, zoom: Math.min(2.5, view.zoom * 1.2) })} aria-label={tx('Przybliż', 'Zoom in')}>
            <ZoomIn aria-hidden="true" />
          </button>
          <button type="button" onClick={fit} aria-label={tx('Dopasuj widok (F)', 'Fit view (F)')} title={tx('Dopasuj widok (F)', 'Fit view (F)')}>
            <Maximize aria-hidden="true" />
          </button>
        </div>
        {allowFiles && (
          <div class="menu-wrap">
            <button type="button" class="btn btn-sm" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <FolderOpen aria-hidden="true" />
              {tx('Plik', 'File')}
            </button>
            {menu && (
              <div class="menu" role="menu">
                <div class="menu-label">{tx('Szablony', 'Templates')}</div>
                {TEMPLATES.map((template) => (
                  <button key={template.id} type="button" role="menuitem" onClick={() => loadTemplate(template.id)}>
                    <LayoutTemplate aria-hidden="true" />
                    <span>
                      <strong>{tr(template.title)}</strong>
                      <span class="dim small">{tr(template.summary)}</span>
                    </span>
                  </button>
                ))}
                <div class="menu-sep" />
                <button type="button" role="menuitem" onClick={exportNet}>
                  <Download aria-hidden="true" />
                  <span>{tx('Zapisz sieć do pliku', 'Save network to file')}</span>
                </button>
                <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
                  <Upload aria-hidden="true" />
                  <span>{tx('Wczytaj sieć z pliku', 'Load network from file')}</span>
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importNet} />
          </div>
        )}
        <div class="segmented mode-switch" role="group" aria-label={tx('Tryb pracy', 'Mode')}>
          <button type="button" aria-pressed={mode === 'realtime'} onClick={() => setMode('realtime')} title={tx('Czas rzeczywisty (S)', 'Realtime (S)')}>
            {tx('Czas rzeczywisty', 'Realtime')}
          </button>
          <button type="button" aria-pressed={mode === 'simulation'} onClick={() => setMode('simulation')} title={tx('Symulacja krok po kroku (S)', 'Step-by-step simulation (S)')}>
            {tx('Symulacja', 'Simulation')}
          </button>
        </div>
      </div>
      <div class="ws-body">
        {side}
        <div class="ws-canvas" ref={canvasRef}>
          <Canvas ctrl={ctrl} view={view} onView={setView} readOnlyDevices={locked} />
          {hint && (
            <div class="canvas-hint" role="status">
              {hint}
            </div>
          )}
          {ctrl.net.devices.length === 0 && !ctrl.placing.value && (
            <div class="canvas-empty">
              <strong>{tx('Plansza jest pusta', 'The canvas is empty')}</strong>
              <span class="muted">{tx('Przeciągnij urządzenie z palety poniżej albo zacznij od gotowej sieci:', 'Drag a device from the palette below or start from a ready network:')}</span>
              {allowFiles && (
                <div class="template-grid">
                  {TEMPLATES.filter((t) => t.id !== 'empty').map((template) => (
                    <button key={template.id} type="button" class="template-card" onClick={() => loadTemplate(template.id)}>
                      <LayoutTemplate aria-hidden="true" />
                      <strong>{tr(template.title)}</strong>
                      <span class="dim small">{tr(template.summary)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!locked && <Palette ctrl={ctrl} />}
          {locked && (
            <div class="palette palette-locked small muted">{tx('W tym laboratorium używasz tylko urządzeń z planszy.', 'In this lab you only use the devices on the canvas.')}</div>
          )}
        </div>
        {ctrl.panel.value ? <DevicePanel ctrl={ctrl} locked={locked} /> : mode === 'simulation' ? <EventPanel ctrl={ctrl} /> : null}
      </div>
    </div>
  );
}
