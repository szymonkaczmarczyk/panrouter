import { useState } from 'preact/hooks';
import { tr, tx } from '../../../i18n';
import { Field } from '../../../ui/Field';
import { modelOf } from '../../catalog';
import { cliExecute, newSession } from '../../cli/ios';
import type { Device } from '../../types';
import type { SimController } from '../controller';
import { DeviceGlyph } from '../DeviceGlyph';
import { hostnameError } from '../forms';

function speedText(speed: number): string {
  return speed >= 1000 ? `${speed / 1000} Gb/s` : `${speed} Mb/s`;
}

export function PhysicalTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const spec = modelOf(device.kind);
  const [name, setName] = useState(device.name);
  const nameError = name === device.name ? null : hostnameError(name) ?? (ctrl.net.devices.some((d) => d.id !== device.id && d.name.toLowerCase() === name.toLowerCase()) ? tx('Ta nazwa jest już zajęta.', 'This name is already taken.') : null);
  const topo = ctrl.sim.topo;
  const rename = () => {
    if (nameError || name === device.name) return;
    if (spec.cli) {
      const session = newSession(device.id);
      for (const cmd of ['enable', 'configure terminal', `hostname ${name}`, 'end']) cliExecute(ctrl.sim, session, cmd);
    } else device.name = name;
    ctrl.saveOnly();
  };
  return (
    <div class="tab-body stack">
      <div class="phys-head">
        <DeviceGlyph kind={device.kind} size={72} />
        <div class="stack" style={{ gap: 'var(--space-1)' }}>
          <strong>{tr(spec.title)}</strong>
          <span class="muted small">{tr(spec.desc)}</span>
          <ul class="spec-list">
            {spec.specs.map((item) => (
              <li key={item.pl}>{tr(item)}</li>
            ))}
            {spec.needsPoe && <li>{tx(topo.isPowered(device) ? 'Zasilanie PoE: tak' : 'Zasilanie PoE: brak, podłącz do portu PoE przełącznika', topo.isPowered(device) ? 'PoE power: yes' : 'PoE power: none, connect to a switch PoE port')}</li>}
          </ul>
        </div>
      </div>
      <form
        class="row-wrap rename"
        onSubmit={(e) => {
          e.preventDefault();
          rename();
        }}
      >
        <Field id={`name-${device.id}`} label={tx('Nazwa urządzenia', 'Device name')} value={name} onInput={setName} error={nameError} mono />
        <button type="submit" class="btn" disabled={Boolean(nameError) || name === device.name}>
          {tx('Zmień nazwę', 'Rename')}
        </button>
      </form>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{tx('Port', 'Port')}</th>
              <th>{tx('Stan', 'Status')}</th>
              <th>{tx('Typ', 'Type')}</th>
              <th>{tx('Połączony z', 'Connected to')}</th>
            </tr>
          </thead>
          <tbody>
            {device.ports.map((port) => {
              const up = topo.portUp(device, port.name);
              const member = topo.memberState(device.id, port.name);
              const blocked = topo.stpBlocked(device.id, port.name) || member === 'suspended';
              const end = topo.peer(device.id, port.name);
              const peer = end ? topo.device(end.dev) : undefined;
              const peerPort = peer && end ? topo.port(peer, end.port) : undefined;
              const status = port.shutdown
                ? tx('wyłączony', 'admin down')
                : port.errDisabled
                  ? tx('err-disabled (port security)', 'err-disabled (port security)')
                  : !end
                    ? tx('wolny', 'free')
                    : member === 'suspended'
                      ? tx(`zawieszony w Po${port.channelGroup}`, `suspended in Po${port.channelGroup}`)
                      : blocked
                        ? tx('zablokowany (STP)', 'blocked (STP)')
                        : up && (member === 'primary' || member === 'bundled')
                          ? tx(`aktywny w Po${port.channelGroup}`, `up in Po${port.channelGroup}`)
                          : up
                            ? tx('aktywny', 'up')
                            : tx('nieaktywny', 'down');
              const color = !end || port.shutdown || port.errDisabled || !up ? 'var(--danger)' : blocked ? 'var(--warn)' : 'var(--ok)';
              return (
                <tr key={port.name}>
                  <td class="mono">{port.short}</td>
                  <td>
                    <span class="row" style={{ gap: 'var(--space-2)' }}>
                      <span class="dot" style={{ background: end || port.shutdown || port.errDisabled ? color : 'var(--surface-3)' }} />
                      {status}
                    </span>
                  </td>
                  <td class="dim">
                    {port.media === 'wireless' ? 'Wi-Fi' : port.media === 'fiber' ? 'SFP' : 'RJ45'} · {speedText(port.speed)}
                    {port.poe ? ' · PoE' : ''}
                  </td>
                  <td>{peer ? `${peer.name} ${peerPort?.short ?? ''}` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
