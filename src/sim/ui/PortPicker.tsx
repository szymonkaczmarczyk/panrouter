import { useEffect, useRef } from 'preact/hooks';
import { tx } from '../../i18n';
import { linkAt } from '../network';
import type { SimController } from './controller';

function speedText(speed: number): string {
  return speed >= 1000 ? `${speed / 1000} Gb/s` : `${speed} Mb/s`;
}

export function PortPicker({ ctrl, deviceId, x, y, onPick, onClose }: { ctrl: SimController; deviceId: string; x: number; y: number; onPick: (port: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const device = ctrl.net.devices.find((d) => d.id === deviceId);
  const cable = ctrl.cable.value;
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deviceId]);
  if (!device) return null;
  const ports = device.ports.filter((p) => p.media !== 'wireless');
  return (
    <div class="port-picker" ref={ref} style={{ left: `${x + 12}px`, top: `${y + 12}px` }} role="dialog" aria-label={tx(`Wybierz port: ${device.name}`, `Choose a port: ${device.name}`)}>
      <div class="port-picker-head">
        <strong>{device.name}</strong>
        <span class="dim small">{cable === 'fiber' ? tx('kabel światłowodowy', 'fiber cable') : tx('kabel miedziany', 'copper cable')}</span>
      </div>
      <div class="port-picker-list">
        {ports.map((port) => {
          const busy = Boolean(linkAt(ctrl.net, device.id, port.name));
          const wrongMedia = port.media !== cable;
          return (
            <button key={port.name} type="button" disabled={busy || wrongMedia} onClick={() => onPick(port.name)}>
              <span class="mono">{port.short}</span>
              <span class="dim">{port.media === 'fiber' ? 'SFP' : 'RJ45'} · {speedText(port.speed)}</span>
              {busy && <span class="badge">{tx('zajęty', 'in use')}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
