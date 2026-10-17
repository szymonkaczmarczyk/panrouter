import { Cpu, LayoutGrid, Monitor, Server, Settings2, SquareTerminal, X } from 'lucide-preact';
import { tr, tx } from '../../i18n';
import { modelOf } from '../catalog';
import type { Device } from '../types';
import type { SimController } from './controller';
import { DeviceGlyph } from './DeviceGlyph';
import { ApTab, FirewallTab, HomeRouterTab, InternetTab } from './tabs/ApplianceTabs';
import { CliTab } from './tabs/CliTab';
import { DesktopTab, hasDesktop } from './tabs/DesktopTab';
import { NetConfigTab } from './tabs/NetConfigTab';
import { PhysicalTab } from './tabs/PhysicalTab';
import { ServicesTab } from './tabs/ServicesTab';

interface TabDef {
  id: string;
  label: string;
  icon: typeof Cpu;
}

function tabsFor(device: Device): TabDef[] {
  const physical = { id: 'physical', label: tx('Fizyczne', 'Physical'), icon: Cpu };
  switch (device.kind) {
    case 'router':
    case 'switch':
    case 'l3switch':
      return [{ id: 'cli', label: 'CLI', icon: SquareTerminal }, { id: 'config', label: tx('Konfiguracja', 'Config'), icon: Settings2 }, physical];
    case 'homeRouter':
    case 'ap':
    case 'firewall':
      return [{ id: 'panel', label: tx('Panel', 'Panel'), icon: LayoutGrid }, physical];
    case 'internet':
      return [{ id: 'panel', label: tx('Informacje', 'Info'), icon: LayoutGrid }, physical];
    case 'server':
      return [{ id: 'desktop', label: tx('Pulpit', 'Desktop'), icon: Monitor }, { id: 'services', label: tx('Usługi', 'Services'), icon: Server }, physical];
    default:
      return [{ id: 'desktop', label: hasDesktop(device) ? tx('Pulpit', 'Desktop') : tx('Ustawienia IP', 'IP settings'), icon: Monitor }, physical];
  }
}

export function DevicePanel({ ctrl, locked }: { ctrl: SimController; locked?: boolean }) {
  const state = ctrl.panel.value;
  ctrl.rev.value;
  if (!state) return null;
  const device = ctrl.net.devices.find((d) => d.id === state.dev);
  if (!device) return null;
  const tabs = tabsFor(device);
  const active = tabs.some((t) => t.id === state.tab) ? state.tab : tabs[0].id;
  const spec = modelOf(device.kind);
  const close = () => {
    ctrl.panel.value = null;
  };
  return (
    <section class="device-panel" aria-label={tx(`Urządzenie ${device.name}`, `Device ${device.name}`)}>
      <header class="panel-head">
        <button type="button" class="btn btn-ghost btn-icon" onClick={close} aria-label={tx('Zamknij panel', 'Close panel')} title={tx('Zamknij (Esc)', 'Close (Esc)')}>
          <X aria-hidden="true" />
        </button>
        <DeviceGlyph kind={device.kind} size={36} />
        <div class="panel-title">
          <strong>{device.name}</strong>
          <span class="dim small">{tr(spec.title)}</span>
        </div>
      </header>
      <div class="tabs" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={tab.id === active} onClick={() => (ctrl.panel.value = { dev: device.id, tab: tab.id })}>
              <Icon aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div class="panel-body">
        {active === 'cli' && <CliTab ctrl={ctrl} device={device} />}
        {active === 'config' && <NetConfigTab ctrl={ctrl} device={device} />}
        {active === 'physical' && (
          <>
            <PhysicalTab ctrl={ctrl} device={device} />
            {!locked && (
              <div class="tab-body">
                <button type="button" class="btn btn-danger btn-sm" onClick={() => ctrl.deleteDevice(device.id)}>
                  {tx('Usuń urządzenie', 'Delete device')}
                </button>
              </div>
            )}
          </>
        )}
        {active === 'desktop' && <DesktopTab ctrl={ctrl} device={device} app={state.app} onApp={(app) => (ctrl.panel.value = { dev: device.id, tab: 'desktop', app })} />}
        {active === 'services' && <ServicesTab ctrl={ctrl} device={device} />}
        {active === 'panel' && device.kind === 'homeRouter' && <HomeRouterTab ctrl={ctrl} device={device} />}
        {active === 'panel' && device.kind === 'ap' && <ApTab ctrl={ctrl} device={device} />}
        {active === 'panel' && device.kind === 'firewall' && <FirewallTab ctrl={ctrl} device={device} />}
        {active === 'panel' && device.kind === 'internet' && <InternetTab ctrl={ctrl} device={device} />}
      </div>
    </section>
  );
}
