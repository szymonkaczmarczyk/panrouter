import { Download, FolderInput } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { path, replacePath } from '../app/router';
import { plural, tx } from '../i18n';
import { emptyNetwork } from '../sim/network';
import { normalizeNetwork } from '../sim/normalize';
import { decodeNetwork, shareParam } from '../sim/share';
import type { Network } from '../sim/types';
import { SimController } from '../sim/ui/controller';
import { Workspace } from '../sim/ui/Workspace';
import { progress, saveSandbox } from '../state/progress';
import { Dialog } from '../ui/Dialog';
import { toast } from '../ui/toast';

const DEVICES = { pl: ['urządzenie', 'urządzenia', 'urządzeń'] as [string, string, string], en: ['device', 'devices'] as [string, string] };

export function Sandbox() {
  const ctrl = useMemo(() => new SimController(normalizeNetwork(progress.value.sandbox) ?? emptyNetwork(), saveSandbox), []);
  const [incoming, setIncoming] = useState<Network | null>(null);
  const mounted = useRef(true);
  const shared = shareParam(path.value);

  useEffect(() => {
    setMeta(
      tx('Symulator sieci', 'Network simulator'),
      tx('Buduj sieć w przeglądarce: routery, przełączniki, Wi-Fi 7, zapory i serwery. Tryb symulacji pokazuje każdy pakiet.', 'Build a network in your browser: routers, switches, Wi-Fi 7, firewalls and servers. Simulation mode shows every packet.'),
    );
    ctrl.sim.autoDhcp();
    ctrl.bump();
  }, []);

  const open = (net: Network) => {
    ctrl.load(net);
    ctrl.sim.autoDhcp();
    ctrl.bump();
    setIncoming(null);
    toast(tx('Wczytano sieć z linku.', 'Network loaded from the link.'), 'ok');
  };

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!shared) return;
    replacePath('/symulator');
    void decodeNetwork(shared).then((net) => {
      if (!mounted.current) return;
      if (!net) return toast(tx('Ten link do sieci jest uszkodzony albo niepełny. Poproś o nowy.', 'This network link is broken or incomplete. Ask for a new one.'), 'danger', 6000);
      if (ctrl.net.devices.length) setIncoming(net);
      else open(net);
    });
  }, [shared]);

  const saveCurrent = () => {
    const blob = new Blob([JSON.stringify(ctrl.net, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siec-${new Date().toISOString().slice(0, 10)}.panrouter.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const count = ctrl.net.devices.length;
  return (
    <>
      <Workspace ctrl={ctrl} allowFiles />
      {incoming && (
        <Dialog
          title={tx('Otworzyć sieć z linku?', 'Open the network from the link?')}
          onClose={() => setIncoming(null)}
          actions={
            <>
              <button type="button" class="btn" onClick={() => setIncoming(null)}>
                {tx('Zostaw obecną', 'Keep the current one')}
              </button>
              <button type="button" class="btn" onClick={saveCurrent}>
                <Download aria-hidden="true" />
                {tx('Zapisz obecną do pliku', 'Save the current one to a file')}
              </button>
              <button type="button" class="btn btn-primary" onClick={() => open(incoming)}>
                <FolderInput aria-hidden="true" />
                {tx('Otwórz sieć z linku', 'Open the linked network')}
              </button>
            </>
          }
        >
          <p>
            {tx('Link zawiera sieć:', 'The link contains a network with')} {plural(incoming.devices.length, DEVICES)}. {tx('Zastąpi ona Twoją obecną sieć', 'It will replace your current network')} ({plural(count, DEVICES)}).
          </p>
          <p class="small">{tx('Jeśli chcesz zachować obecną sieć, najpierw zapisz ją do pliku.', 'If you want to keep the current network, save it to a file first.')}</p>
        </Dialog>
      )}
    </>
  );
}
