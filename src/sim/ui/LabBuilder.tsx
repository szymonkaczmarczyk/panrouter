import { CircleCheck, CircleX, Copy, ListChecks, Plus, Trash2, WandSparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { CHECK_LIMIT, customLabUrl, encodeCustomLab, runCustomChecks, TEXT_LIMIT, TITLE_LIMIT, type CheckKind, type CustomCheck } from '../../content/customLab';
import { tx } from '../../i18n';
import { Dialog } from '../../ui/Dialog';
import { toast } from '../../ui/toast';
import type { Network } from '../types';

const HOSTS = ['pc', 'laptop', 'phone', 'voip', 'server', 'printer', 'camera'];

const KIND_LABEL: Record<CheckKind, [string, string]> = {
  ping: ['pinguje', 'pings'],
  noping: ['nie pinguje', 'cannot ping'],
  http: ['otwiera stronę', 'opens a page'],
};

function suggestions(net: Network): CustomCheck[] {
  const clients = net.devices.filter((d) => ['pc', 'laptop'].includes(d.kind));
  const servers = net.devices.filter((d) => d.kind === 'server');
  const routers = net.devices.filter((d) => ['router', 'l3switch', 'firewall', 'homeRouter'].includes(d.kind));
  const checks: CustomCheck[] = [];
  for (const client of clients) {
    for (const server of servers) checks.push({ kind: 'ping', from: client.name, target: server.name });
    if (!servers.length && routers[0]) checks.push({ kind: 'ping', from: client.name, target: routers[0].name });
  }
  if (clients.length > 1) checks.push({ kind: 'ping', from: clients[0].name, target: clients[clients.length - 1].name });
  return checks.slice(0, 4);
}

interface Props {
  net: Network;
  onClose: () => void;
}

export function LabBuilder({ net, onClose }: Props) {
  const sources = useMemo(() => net.devices.filter((d) => HOSTS.includes(d.kind)).sort((a, b) => HOSTS.indexOf(a.kind) - HOSTS.indexOf(b.kind)).map((d) => d.name), [net]);
  const targets = useMemo(() => {
    const names = net.devices.filter((d) => d.kind !== 'internet').map((d) => d.name);
    const ips = net.devices.flatMap((d) => d.ports.map((p) => p.ip).filter(Boolean));
    return [...names, ...ips];
  }, [net]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [checks, setChecks] = useState<CustomCheck[]>(() => suggestions(net));
  const [results, setResults] = useState<boolean[] | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edit = (next: CustomCheck[]) => {
    setChecks(next);
    setResults(null);
    setLink(null);
  };

  const change = (index: number, patch: Partial<CustomCheck>) => edit(checks.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const valid = checks.filter((c) => c.from && c.target.trim());

  const verify = () => {
    if (!valid.length) return setError(tx('Dodaj co najmniej jedno sprawdzenie z urządzeniem i celem.', 'Add at least one check with a device and a target.'));
    setResults(runCustomChecks(net, valid));
  };

  const copy = async () => {
    if (!title.trim()) return setError(tx('Wpisz tytuł laboratorium. Osoba ucząca się zobaczy go na górze zadania.', 'Enter a lab title. The learner sees it at the top of the task.'));
    if (!valid.length) return setError(tx('Dodaj co najmniej jedno sprawdzenie z urządzeniem i celem.', 'Add at least one check with a device and a target.'));
    setError(null);
    const url = customLabUrl(await encodeCustomLab({ title: title.trim(), text: text.trim(), checks: valid.map((c) => ({ ...c, target: c.target.trim() })), net }));
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      toast(tx('Skopiowano link do laboratorium.', 'Lab link copied.'), 'ok');
    } catch {
      toast(tx('Zaznacz link w oknie i skopiuj go ręcznie.', 'Select the link in the window and copy it manually.'), 'warn');
    }
  };

  return (
    <Dialog
      wide
      title={tx('Laboratorium z linku', 'Lab from a link')}
      onClose={onClose}
      actions={
        <>
          <button type="button" class="btn" onClick={verify}>
            <ListChecks aria-hidden="true" />
            {tx('Sprawdź na tej sieci', 'Check on this network')}
          </button>
          <button type="button" class="btn btn-primary" onClick={() => void copy()}>
            <Copy aria-hidden="true" />
            {tx('Kopiuj link do laboratorium', 'Copy the lab link')}
          </button>
        </>
      }
    >
      <p class="small muted">
        {tx(
          'Link zapisuje sieć dokładnie taką, jak teraz na planszy. Najlepiej zbuduj gotową sieć, sprawdź, że wszystkie warunki przechodzą, a potem usuń to, co ma skonfigurować osoba ucząca się, i dopiero wtedy skopiuj link.',
          'The link stores the network exactly as it is on the canvas now. Build the finished network, check that all conditions pass, then remove what the learner should configure, and only then copy the link.',
        )}
      </p>
      <div class="field">
        <label for="lab-title">{tx('Tytuł', 'Title')}</label>
        <input id="lab-title" class="input" maxLength={TITLE_LIMIT} value={title} data-autofocus onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)} placeholder={tx('Np. Brama i DHCP w biurze', 'E.g. Gateway and DHCP in the office')} />
      </div>
      <div class="field">
        <label for="lab-text">{tx('Polecenie dla osoby uczącej się', 'Task for the learner')}</label>
        <textarea id="lab-text" class="input" rows={4} maxLength={TEXT_LIMIT} value={text} onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)} placeholder={tx('Np. Skonfiguruj na R1 adres bramy 192.168.10.1/24 i włącz interfejs. Komputery mają pobrać adresy z DHCP.', 'E.g. Configure the gateway 192.168.10.1/24 on R1 and enable the interface. The computers should get addresses from DHCP.')} />
      </div>
      <fieldset class="lab-checks">
        <legend>{tx(`Warunki zaliczenia (do ${CHECK_LIMIT})`, `Pass conditions (up to ${CHECK_LIMIT})`)}</legend>
        <datalist id="lab-targets">
          {targets.map((target) => (
            <option key={target} value={target} />
          ))}
        </datalist>
        {checks.length === 0 && <p class="small dim">{tx('Nie ma jeszcze warunków. Dodaj pierwszy albo wstaw propozycje dopasowane do tej sieci.', 'There are no conditions yet. Add the first one or insert suggestions for this network.')}</p>}
        <ol class="lab-check-list">
          {checks.map((check, index) => (
            <li key={index} class="lab-check-row">
              <select class="select" aria-label={tx(`Urządzenie w warunku ${index + 1}`, `Device in condition ${index + 1}`)} value={check.from} onChange={(e) => change(index, { from: (e.currentTarget as HTMLSelectElement).value })}>
                <option value="">{tx('urządzenie', 'device')}</option>
                {sources.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select class="select" aria-label={tx(`Rodzaj warunku ${index + 1}`, `Kind of condition ${index + 1}`)} value={check.kind} onChange={(e) => change(index, { kind: (e.currentTarget as HTMLSelectElement).value as CheckKind })}>
                {(Object.keys(KIND_LABEL) as CheckKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {tx(...KIND_LABEL[kind])}
                  </option>
                ))}
              </select>
              <input class="input mono" list="lab-targets" aria-label={tx(`Cel w warunku ${index + 1}`, `Target in condition ${index + 1}`)} value={check.target} onInput={(e) => change(index, { target: (e.currentTarget as HTMLInputElement).value })} placeholder={check.kind === 'http' ? 'http://192.168.10.10' : tx('SRV1 albo adres IP', 'SRV1 or an IP address')} />
              <span class="lab-check-state">
                {results && valid.includes(check) && (results[valid.indexOf(check)] ? <CircleCheck class="ok-icon" aria-label={tx('przechodzi', 'passes')} /> : <CircleX class="fail-icon" aria-label={tx('nie przechodzi', 'fails')} />)}
              </span>
              <button type="button" class="btn btn-ghost btn-icon" aria-label={tx(`Usuń warunek ${index + 1}`, `Remove condition ${index + 1}`)} onClick={() => edit(checks.filter((_, i) => i !== index))}>
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        <div class="row-wrap">
          <button type="button" class="btn btn-sm" disabled={checks.length >= CHECK_LIMIT} onClick={() => edit([...checks, { kind: 'ping', from: sources[0] ?? '', target: '' }])}>
            <Plus aria-hidden="true" />
            {tx('Dodaj warunek', 'Add a condition')}
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onClick={() => edit([...checks, ...suggestions(net)].slice(0, CHECK_LIMIT))}>
            <WandSparkles aria-hidden="true" />
            {tx('Wstaw propozycje', 'Insert suggestions')}
          </button>
        </div>
      </fieldset>
      {results && (
        <p class="small muted" role="status">
          {results.every(Boolean)
            ? tx(`Na tej sieci przechodzą wszystkie warunki (${results.length}). Jeśli to gotowe rozwiązanie, usuń teraz konfigurację, którą ma zrobić osoba ucząca się.`, `All ${results.length} conditions pass on this network. If this is the finished solution, now remove the configuration the learner should do.`)
            : tx(`Na tej sieci przechodzi ${results.filter(Boolean).length} z ${results.length}. Czerwone krzyżyki pokazują warunki, które jeszcze nie działają.`, `${results.filter(Boolean).length} of ${results.length} pass on this network. Red crosses mark conditions that do not work yet.`)}
        </p>
      )}
      {error && (
        <p class="field-error" role="alert">
          <CircleX aria-hidden="true" />
          {error}
        </p>
      )}
      {link && <input class="input mono" readOnly value={link} aria-label={tx('Link do laboratorium', 'Lab link')} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} />}
    </Dialog>
  );
}
