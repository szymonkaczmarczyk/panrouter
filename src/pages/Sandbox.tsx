import { useEffect, useMemo } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { tx } from '../i18n';
import { emptyNetwork } from '../sim/network';
import { SimController } from '../sim/ui/controller';
import { Workspace } from '../sim/ui/Workspace';
import { progress, saveSandbox } from '../state/progress';

export function Sandbox() {
  const ctrl = useMemo(() => new SimController(structuredClone(progress.value.sandbox ?? emptyNetwork()), saveSandbox), []);
  useEffect(() => {
    setMeta(
      tx('Symulator sieci', 'Network simulator'),
      tx('Buduj sieć w przeglądarce: routery, przełączniki, Wi-Fi 7, zapory i serwery. Tryb symulacji pokazuje każdy pakiet.', 'Build a network in your browser: routers, switches, Wi-Fi 7, firewalls and servers. Simulation mode shows every packet.'),
    );
    ctrl.sim.autoDhcp();
    ctrl.bump();
  }, []);
  return <Workspace ctrl={ctrl} allowFiles />;
}
