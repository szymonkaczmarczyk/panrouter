import { FolderOpen, Save, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { plural, tx } from '../../i18n';
import { progress, removeSavedNetwork, SAVED_LIMIT, storeNetwork } from '../../state/progress';
import { Dialog } from '../../ui/Dialog';
import { toast } from '../../ui/toast';
import { decodeNetwork, encodeNetwork } from '../share';
import type { SimController } from './controller';

const DEVICES = { pl: ['urządzenie', 'urządzenia', 'urządzeń'] as [string, string, string], en: ['device', 'devices'] as [string, string] };

interface Props {
  ctrl: SimController;
  onClose: () => void;
  onOpened: () => void;
}

export function NetworkLibrary({ ctrl, onClose, onOpened }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const saved = progress.value.savedNets;
  const exists = saved.find((n) => n.name.toLowerCase() === name.trim().toLowerCase());

  const save = async (event: Event) => {
    event.preventDefault();
    const clean = name.trim().slice(0, 60);
    if (!clean) return setError(tx('Wpisz nazwę sieci, np. Biuro z VLAN-ami.', 'Enter a network name, e.g. Office with VLANs.'));
    if (!ctrl.net.devices.length) return setError(tx('Plansza jest pusta. Dodaj urządzenia, zanim zapiszesz sieć.', 'The canvas is empty. Add devices before saving the network.'));
    if (!exists && saved.length >= SAVED_LIMIT) return setError(tx(`Możesz mieć najwyżej ${SAVED_LIMIT} zapisanych sieci. Usuń jedną z listy poniżej.`, `You can keep up to ${SAVED_LIMIT} saved networks. Delete one from the list below.`));
    storeNetwork({ id: exists?.id ?? `s${Date.now().toString(36)}`, name: clean, savedAt: new Date().toISOString(), devices: ctrl.net.devices.length, data: await encodeNetwork(ctrl.net) });
    setName('');
    setError('');
    toast(exists ? tx(`Nadpisano sieć „${clean}”.`, `Network "${clean}" overwritten.`) : tx(`Zapisano sieć „${clean}”.`, `Network "${clean}" saved.`), 'ok');
  };

  const open = async (id: string) => {
    const entry = saved.find((n) => n.id === id);
    if (!entry) return;
    const net = await decodeNetwork(entry.data);
    if (!net) return toast(tx('Nie udało się odczytać tej sieci. Zapis mógł się uszkodzić.', 'This network could not be read. The save may be damaged.'), 'danger');
    ctrl.load(net);
    ctrl.sim.autoDhcp();
    ctrl.bump();
    onOpened();
    onClose();
    toast(tx(`Otwarto sieć „${entry.name}”. Poprzednią możesz przywrócić skrótem Ctrl+Z.`, `Opened "${entry.name}". Restore the previous one with Ctrl+Z.`), 'ok', 5000);
  };

  const remove = (id: string, label: string) => {
    if (!window.confirm(tx(`Usunąć zapisaną sieć „${label}”? Tego nie da się cofnąć.`, `Delete the saved network "${label}"? This cannot be undone.`))) return;
    removeSavedNetwork(id);
  };

  return (
    <Dialog title={tx('Moje sieci', 'My networks')} onClose={onClose}>
      <form class="library-form" onSubmit={(event) => void save(event)}>
        <div class="field">
          <label for="net-name">{tx('Zapisz bieżącą sieć pod nazwą', 'Save the current network as')}</label>
          <input
            id="net-name"
            class="input"
            value={name}
            maxLength={60}
            data-autofocus
            placeholder={tx('Np. Biuro z VLAN-ami', 'E.g. Office with VLANs')}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'net-name-error' : undefined}
            onInput={(event) => {
              setName((event.currentTarget as HTMLInputElement).value);
              setError('');
            }}
          />
          {error && (
            <span id="net-name-error" class="field-error">
              {error}
            </span>
          )}
        </div>
        <button type="submit" class="btn btn-primary">
          <Save aria-hidden="true" />
          {exists ? tx('Nadpisz', 'Overwrite') : tx('Zapisz', 'Save')}
        </button>
      </form>
      {saved.length === 0 ? (
        <p class="small dim">{tx('Nie masz jeszcze zapisanych sieci. Zbuduj coś na planszy i zapisz pod nazwą, żeby wrócić do tego później.', 'You have no saved networks yet. Build something on the canvas and save it under a name to come back to it later.')}</p>
      ) : (
        <ul class="library-list">
          {saved.map((entry) => (
            <li key={entry.id}>
              <span class="library-meta">
                <strong>{entry.name}</strong>
                <span class="small dim">
                  {plural(entry.devices, DEVICES)} · {new Date(entry.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </span>
              <button type="button" class="btn btn-ghost btn-icon" onClick={() => remove(entry.id, entry.name)} aria-label={tx(`Usuń sieć ${entry.name}`, `Delete network ${entry.name}`)} title={tx('Usuń', 'Delete')}>
                <Trash2 aria-hidden="true" />
              </button>
              <button type="button" class="btn btn-sm" onClick={() => void open(entry.id)}>
                <FolderOpen aria-hidden="true" />
                {tx('Otwórz', 'Open')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
