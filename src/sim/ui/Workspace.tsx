import { Cable, Copy, Download, FolderOpen, GraduationCap, Hand, ImageDown, LayoutTemplate, Library, Link2, Mail, Maximize, MousePointer2, Redo2, StickyNote, Trash2, Undo2, Upload, ZoomIn, ZoomOut } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { tr, tx } from '../../i18n';
import { Dialog } from '../../ui/Dialog';
import { toast } from '../../ui/toast';
import { modelOf } from '../catalog';
import { normalizeNetwork } from '../normalize';
import { encodeNetwork, shareUrl } from '../share';
import { TEMPLATES } from '../templates';
import type { Network } from '../types';
import { Canvas, stepTimes, type View } from './Canvas';
import type { CableChoice, SimController, Tool } from './controller';
import { DevicePanel } from './DevicePanel';
import { renderNetworkPng } from './exportImage';
import { LabBuilder } from './LabBuilder';
import { NetworkLibrary } from './NetworkLibrary';
import { EventPanel } from './EventPanel';
import { Palette } from './Palette';

const HINT_SPACE = 56;

export function fitView(net: Network, width: number, height: number, top = 0): View {
  if (!net.devices.length && !net.notes.length) return { x: -60, y: -40, zoom: 1 };
  const minX = Math.min(...net.devices.map((d) => d.x - 90), ...net.notes.map((n) => n.x - 20));
  const maxX = Math.max(...net.devices.map((d) => d.x + 90), ...net.notes.map((n) => n.x + 210));
  const minY = Math.min(...net.devices.map((d) => d.y - 80), ...net.notes.map((n) => n.y - 20));
  const maxY = Math.max(...net.devices.map((d) => d.y + 110), ...net.notes.map((n) => n.y + 170));
  const usable = height - top;
  const zoom = Math.min(1.4, Math.max(0.4, Math.min(width / (maxX - minX), usable / (maxY - minY))));
  return { zoom, x: (minX + maxX) / 2 - width / zoom / 2, y: (minY + maxY) / 2 - usable / zoom / 2 - top / zoom };
}

const TOOLS: { id: Tool; key: string; icon: typeof Hand; label: [string, string] }[] = [
  { id: 'select', key: 'V', icon: MousePointer2, label: ['Wybierz i przesuń', 'Select and move'] },
  { id: 'connect', key: 'C', icon: Cable, label: ['Połącz kablem', 'Connect cable'] },
  { id: 'note', key: 'N', icon: StickyNote, label: ['Notatka', 'Note'] },
  { id: 'pdu', key: 'P', icon: Mail, label: ['Pakiet testowy', 'Test packet'] },
  { id: 'delete', key: 'D', icon: Trash2, label: ['Usuń', 'Delete'] },
];

interface Props {
  ctrl: SimController;
  allowFiles?: boolean;
  locked?: boolean;
  leading?: ComponentChildren;
  side?: ComponentChildren;
  overlay?: ComponentChildren;
}

export function Workspace({ ctrl, allowFiles = false, locked = false, leading, side, overlay }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: -60, y: -40, zoom: 1 });
  const [menu, setMenu] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [library, setLibrary] = useState(false);
  const [labBuilder, setLabBuilder] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mode = ctrl.mode.value;
  const tool = ctrl.tool.value;

  const fit = () => {
    const el = canvasRef.current;
    if (!el) return;
    const palette = el.querySelector<HTMLElement>('.palette');
    const sheet = el.parentElement?.querySelector<HTMLElement>('.event-panel, .device-panel');
    const sheetCover = sheet && getComputedStyle(sheet).position === 'fixed' ? el.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top + 24 : 0;
    const reserved = Math.max(palette && palette.offsetParent ? palette.offsetHeight + 24 : 0, sheetCover);
    const hint = el.querySelector<HTMLElement>('.canvas-hint');
    const top = Math.max(HINT_SPACE, hint ? hint.offsetTop + hint.offsetHeight + 12 : 0);
    setView(fitView(ctrl.net, el.clientWidth, el.clientHeight - reserved, top));
  };

  useEffect(() => {
    const id = window.setTimeout(fit, 30);
    return () => window.clearTimeout(id);
  }, [ctrl, ctrl.net, mode]);

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
      if (target.closest('input, textarea, select, [contenteditable], dialog')) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        if (key === 'z' || key === 'y') {
          event.preventDefault();
          const redo = key === 'y' || event.shiftKey;
          if (!(redo ? ctrl.redo() : ctrl.undo())) toast(redo ? tx('Nie ma czego ponowić.', 'Nothing to redo.') : tx('Nie ma czego cofnąć.', 'Nothing to undo.'), 'info', 1800);
        }
        if (key === 'a' && ctrl.net.devices.length) {
          event.preventDefault();
          ctrl.multi.value = ctrl.net.devices.map((d) => d.id);
          ctrl.selected.value = null;
        }
        return;
      }
      if (event.altKey) return;
      if (key === 'escape') {
        if (ctrl.multi.value.length) {
          ctrl.multi.value = [];
          return;
        }
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
      if ((key === 'delete' || key === 'backspace') && !locked && (ctrl.multi.value.length || ctrl.selected.value)) {
        event.preventDefault();
        if (ctrl.multi.value.length) ctrl.deleteDevices(ctrl.multi.value);
        else ctrl.deleteDevice(ctrl.selected.value!);
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

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNet = () => {
    download(new Blob([JSON.stringify(ctrl.net, null, 2)], { type: 'application/json' }), `siec-${new Date().toISOString().slice(0, 10)}.panrouter.json`);
    setMenu(false);
  };

  const copyShareLink = async () => {
    setMenu(false);
    if (!ctrl.net.devices.length) return toast(tx('Plansza jest pusta. Dodaj urządzenia, zanim udostępnisz sieć.', 'The canvas is empty. Add devices before sharing the network.'), 'warn');
    const url = shareUrl(await encodeNetwork(ctrl.net));
    try {
      await navigator.clipboard.writeText(url);
      toast(tx('Skopiowano link. Kto go otworzy, zobaczy tę sieć u siebie.', 'Link copied. Whoever opens it will see this network.'), 'ok');
      if (url.length > 30_000) toast(tx('Link jest bardzo długi. Jeśli komunikator go utnie, wyślij sieć jako plik.', 'The link is very long. If a messenger cuts it, send the network as a file.'), 'warn', 6000);
    } catch {
      setShareLink(url);
    }
  };

  const savePng = async () => {
    setMenu(false);
    const svg = canvasRef.current?.querySelector<SVGSVGElement>('svg.canvas');
    if (!svg || !ctrl.net.devices.length) return toast(tx('Plansza jest pusta. Nie ma czego zapisać.', 'The canvas is empty. There is nothing to save.'), 'warn');
    try {
      const blob = await renderNetworkPng(svg, ctrl.net, 'PanRouter');
      download(blob, `siec-${new Date().toISOString().slice(0, 10)}.png`);
      toast(tx('Zapisano obraz planszy.', 'Canvas image saved.'), 'ok');
    } catch {
      toast(tx('Nie udało się utworzyć obrazu. Spróbuj ponownie albo w innej przeglądarce.', 'Could not create the image. Try again or use another browser.'), 'danger');
    }
  };

  const importNet = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    setMenu(false);
    if (!file) return;
    if (file.size > 3_000_000) return toast(tx('Plik jest za duży (limit 3 MB).', 'The file is too large (3 MB limit).'), 'danger');
    try {
      const net = normalizeNetwork(JSON.parse(await file.text()));
      if (!net) throw new Error('format');
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

  const editNote = (id: string) => {
    setNoteDraft(ctrl.net.notes.find((n) => n.id === id)?.text ?? '');
    setEditingNote(id);
  };

  const closeNote = (save: boolean) => {
    if (!editingNote) return;
    const original = ctrl.net.notes.find((n) => n.id === editingNote)?.text ?? '';
    ctrl.setNoteText(editingNote, save ? noteDraft : original);
    setEditingNote(null);
  };

  const selectedCount = ctrl.multi.value.length;
  const hint = (() => {
    if (selectedCount) return tx(`Zaznaczono: ${selectedCount}. Przeciągnij jedno z nich, żeby przesunąć wszystkie. Delete usuwa, Esc odznacza.`, `Selected: ${selectedCount}. Drag one to move them all. Delete removes, Esc clears.`);
    if (tool === 'note') return tx('Kliknij na planszy, żeby dodać notatkę.', 'Click the canvas to add a note.');
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
        <div class="segmented history" role="group" aria-label={tx('Historia zmian', 'Change history')}>
          <button type="button" onClick={() => ctrl.undo()} disabled={!ctrl.canUndo.value} aria-label={tx('Cofnij (Ctrl+Z)', 'Undo (Ctrl+Z)')} title={tx('Cofnij (Ctrl+Z)', 'Undo (Ctrl+Z)')}>
            <Undo2 aria-hidden="true" />
          </button>
          <button type="button" onClick={() => ctrl.redo()} disabled={!ctrl.canRedo.value} aria-label={tx('Ponów (Ctrl+Shift+Z)', 'Redo (Ctrl+Shift+Z)')} title={tx('Ponów (Ctrl+Shift+Z)', 'Redo (Ctrl+Shift+Z)')}>
            <Redo2 aria-hidden="true" />
          </button>
        </div>
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
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setLibrary(true);
                  }}
                >
                  <Library aria-hidden="true" />
                  <span>{tx('Moje sieci', 'My networks')}</span>
                </button>
                <div class="menu-sep" />
                <button type="button" role="menuitem" onClick={() => void copyShareLink()}>
                  <Link2 aria-hidden="true" />
                  <span>{tx('Kopiuj link do tej sieci', 'Copy a link to this network')}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    if (!ctrl.net.devices.length) return toast(tx('Plansza jest pusta. Zbuduj sieć, z której ma powstać laboratorium.', 'The canvas is empty. Build the network the lab should use.'), 'warn');
                    setLabBuilder(true);
                  }}
                >
                  <GraduationCap aria-hidden="true" />
                  <span>{tx('Zrób z tej sieci laboratorium', 'Turn this network into a lab')}</span>
                </button>
                <button type="button" role="menuitem" onClick={() => void savePng()}>
                  <ImageDown aria-hidden="true" />
                  <span>{tx('Zapisz obraz planszy (PNG)', 'Save canvas image (PNG)')}</span>
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
          <Canvas ctrl={ctrl} view={view} onView={setView} readOnlyDevices={locked} onEditNote={editNote} />
          {hint && (
            <div class="canvas-hint" role="status">
              {hint}
            </div>
          )}
          {overlay}
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
            <div class="palette palette-locked small muted">{tx('Tu pracujesz tylko na urządzeniach z planszy. Nowych nie dodajesz.', 'Here you only work with the devices on the canvas. You do not add new ones.')}</div>
          )}
        </div>
        {ctrl.panel.value ? <DevicePanel ctrl={ctrl} locked={locked} /> : mode === 'simulation' ? <EventPanel ctrl={ctrl} /> : null}
      </div>
      {editingNote && (
        <Dialog
          title={tx('Notatka na planszy', 'Canvas note')}
          onClose={() => closeNote(false)}
          actions={
            <>
              <button
                type="button"
                class="btn btn-danger"
                onClick={() => {
                  ctrl.deleteNote(editingNote);
                  setEditingNote(null);
                }}
              >
                <Trash2 aria-hidden="true" />
                {tx('Usuń notatkę', 'Delete note')}
              </button>
              <button type="button" class="btn btn-primary" onClick={() => closeNote(true)}>
                {tx('Zapisz notatkę', 'Save note')}
              </button>
            </>
          }
        >
          <div class="field">
            <label for="note-text">{tx('Treść (do 500 znaków)', 'Text (up to 500 characters)')}</label>
            <textarea
              id="note-text"
              class="input"
              rows={5}
              maxLength={500}
              value={noteDraft}
              data-autofocus
              onInput={(event) => setNoteDraft((event.currentTarget as HTMLTextAreaElement).value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  closeNote(true);
                }
              }}
              placeholder={tx('Np. VLAN 10 to biuro, VLAN 20 to goście', 'E.g. VLAN 10 is the office, VLAN 20 is guests')}
            />
          </div>
          <p class="small dim">{tx('Ctrl+Enter zapisuje. Notatki trafiają też do pliku, linku i obrazu PNG.', 'Ctrl+Enter saves. Notes are included in the file, link and PNG image.')}</p>
        </Dialog>
      )}
      {labBuilder && <LabBuilder net={ctrl.net} onClose={() => setLabBuilder(false)} />}
      {library && <NetworkLibrary ctrl={ctrl} onClose={() => setLibrary(false)} onOpened={() => window.setTimeout(fit, 30)} />}
      {shareLink && (
        <Dialog
          title={tx('Link do sieci', 'Network link')}
          onClose={() => setShareLink(null)}
          actions={
            <button
              type="button"
              class="btn btn-primary"
              onClick={(event) => {
                const input = (event.currentTarget as HTMLElement).closest('dialog')?.querySelector('input');
                input?.select();
              }}
            >
              <Copy aria-hidden="true" />
              {tx('Zaznacz link', 'Select the link')}
            </button>
          }
        >
          <p>{tx('Przeglądarka nie pozwoliła skopiować automatycznie. Zaznacz link i skopiuj go skrótem Ctrl+C (na Macu Cmd+C).', 'The browser did not allow automatic copying. Select the link and copy it with Ctrl+C (Cmd+C on a Mac).')}</p>
          <input class="input mono" readOnly value={shareLink} aria-label={tx('Link do sieci', 'Network link')} onFocus={(event) => (event.currentTarget as HTMLInputElement).select()} />
        </Dialog>
      )}
    </div>
  );
}
