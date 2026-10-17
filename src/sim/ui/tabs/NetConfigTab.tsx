import { Plus, Terminal as TermIcon, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { tx } from '../../../i18n';
import { Field } from '../../../ui/Field';
import { ipToStr, parseIp, prefixToMask } from '../../ip';
import type { Device, Port, VirtualIf } from '../../types';
import type { SimController } from '../controller';
import { ipError, parsePrefix, prefixError } from '../forms';

function maskOf(prefix: number): string {
  return ipToStr(prefixToMask(prefix));
}

function useConfigRunner(ctrl: SimController, device: Device) {
  const [log, setLog] = useState<{ commands: string[]; errors: string[] } | null>(null);
  const run = (commands: string[]) => {
    const result = ctrl.runConfig(device.id, commands);
    setLog(result);
    return result.errors.length === 0;
  };
  return { log, run };
}

function CliEcho({ log }: { log: { commands: string[]; errors: string[] } | null }) {
  if (!log) return null;
  return (
    <div class={`cli-echo ${log.errors.length ? 'cli-echo-error' : ''}`} aria-live="polite">
      <div class="cli-echo-head">
        <TermIcon aria-hidden="true" />
        {tx('Odpowiednik w CLI', 'Equivalent CLI commands')}
      </div>
      <pre class="mono">{log.commands.join('\n')}</pre>
      {log.errors.map((error) => (
        <p key={error} class="field-error">
          {error}
        </p>
      ))}
    </div>
  );
}

function InterfaceEditor({ device, name, run }: { device: Device; name: string; run: (commands: string[]) => boolean }) {
  const port = device.ports.find((p) => p.name === name);
  const vif = device.vifs.find((v) => v.name === name);
  const target = (port ?? vif) as Port | VirtualIf;
  const [ip, setIp] = useState(target.ip);
  const [mask, setMask] = useState(target.ip ? maskOf(target.prefix) : '255.255.255.0');
  const [description, setDescription] = useState(target.description);
  const [touched, setTouched] = useState(false);
  const isSwitchport = Boolean(port?.switchport);
  const [mode, setMode] = useState(port?.mode ?? 'access');
  const [vlan, setVlan] = useState(String(port?.accessVlan ?? 1));
  const [allowed, setAllowed] = useState(port?.allowedVlans ?? 'all');
  const [native, setNative] = useState(String(port?.nativeVlan ?? 1));
  const ipErr = ip ? ipError(ip) : null;
  const maskErr = ip ? prefixError(mask) : null;
  const vlanErr = !/^\d+$/.test(vlan) || Number(vlan) < 1 || Number(vlan) > 4094 ? tx('VLAN 1-4094', 'VLAN 1-4094') : null;
  const allowedErr = allowed !== 'all' && !/^[\d,-]+$/.test(allowed) ? tx('Podaj listę, np. 10,20,30-40 albo all', 'Enter a list, e.g. 10,20,30-40 or all') : null;
  const nativeErr = !/^\d+$/.test(native) ? tx('VLAN 1-4094', 'VLAN 1-4094') : null;
  const up = !target.shutdown;

  const save = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    const cmds = [`interface ${name}`];
    if (description !== target.description) cmds.push(description ? `description ${description}` : 'no description');
    if (isSwitchport) {
      if (vlanErr || allowedErr || nativeErr) return;
      cmds.push(`switchport mode ${mode}`);
      if (mode === 'access') cmds.push(`switchport access vlan ${vlan}`);
      else {
        cmds.push(allowed === 'all' ? 'switchport trunk allowed vlan all' : `switchport trunk allowed vlan ${allowed}`);
        cmds.push(`switchport trunk native vlan ${native}`);
      }
    } else {
      if (ipErr || maskErr) return;
      if (ip) cmds.push(`ip address ${ip} ${parseIp(mask) !== null ? mask : maskOf(parsePrefix(mask) ?? 24)}`);
      else if (target.ip) cmds.push('no ip address');
    }
    run(cmds);
  };

  const toggle = () => run([`interface ${name}`, up ? 'shutdown' : 'no shutdown']);

  return (
    <form class="stack if-editor" onSubmit={save} noValidate>
      <div class="row-wrap" style={{ justifyContent: 'space-between' }}>
        <strong class="mono">{name}</strong>
        <label class="check">
          <input type="checkbox" checked={up} onChange={toggle} />
          <span>{up ? tx('Włączony', 'Enabled') : tx('Wyłączony (shutdown)', 'Disabled (shutdown)')}</span>
        </label>
      </div>
      <Field id={`desc-${name}`} label={tx('Opis', 'Description')} value={description} onInput={setDescription} placeholder={tx('np. Łącze do SW1', 'e.g. Link to SW1')} />
      {isSwitchport ? (
        <>
          <div class="segmented" role="radiogroup" aria-label={tx('Tryb portu', 'Port mode')}>
            <button type="button" role="radio" aria-checked={mode === 'access'} aria-pressed={mode === 'access'} onClick={() => setMode('access')}>
              {tx('Dostępowy (access)', 'Access')}
            </button>
            <button type="button" role="radio" aria-checked={mode === 'trunk'} aria-pressed={mode === 'trunk'} onClick={() => setMode('trunk')}>
              Trunk 802.1Q
            </button>
          </div>
          {mode === 'access' ? (
            <div class="field">
              <label for={`vlan-${name}`}>VLAN</label>
              <select id={`vlan-${name}`} class="select" value={vlan} onChange={(e) => setVlan((e.currentTarget as HTMLSelectElement).value)}>
                {device.vlans.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.id} · {v.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div class="form-grid">
              <Field id={`allowed-${name}`} label={tx('Dozwolone VLAN-y', 'Allowed VLANs')} value={allowed} onInput={setAllowed} error={touched ? allowedErr : null} mono />
              <Field id={`native-${name}`} label={tx('VLAN natywny', 'Native VLAN')} value={native} onInput={setNative} error={touched ? nativeErr : null} mono />
            </div>
          )}
        </>
      ) : (
        <div class="form-grid">
          <Field id={`ip-${name}`} label={tx('Adres IPv4', 'IPv4 address')} value={ip} onInput={setIp} error={touched ? ipErr : null} placeholder="192.168.1.1" mono />
          <Field id={`mask-${name}`} label={tx('Maska', 'Mask')} value={mask} onInput={setMask} error={touched ? maskErr : null} mono />
        </div>
      )}
      <div>
        <button type="submit" class="btn btn-primary">
          {tx('Zapisz interfejs', 'Save interface')}
        </button>
      </div>
      {device.kind === 'l3switch' && port && (
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => run([`interface ${name}`, port.switchport ? 'no switchport' : 'switchport'])}>
          {port.switchport ? tx('Zamień na port routowany (no switchport)', 'Make it a routed port (no switchport)') : tx('Przywróć port przełączany (switchport)', 'Restore switched port (switchport)')}
        </button>
      )}
    </form>
  );
}

function VlanSection({ device, run }: { device: Device; run: (commands: string[]) => boolean }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const idErr = id && (!/^\d+$/.test(id) || Number(id) < 2 || Number(id) > 4094) ? tx('Numer VLAN 2-4094', 'VLAN number 2-4094') : null;
  const nameErr = name && !/^[A-Za-z0-9_-]{1,32}$/.test(name) ? tx('Litery, cyfry, _ lub -, bez spacji', 'Letters, digits, _ or -, no spaces') : null;
  return (
    <section class="stack">
      <h4>{tx('VLAN-y', 'VLANs')}</h4>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>VLAN</th>
              <th>{tx('Nazwa', 'Name')}</th>
              <th>{tx('Porty dostępowe', 'Access ports')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {device.vlans.map((v) => (
              <tr key={v.id}>
                <td class="mono">{v.id}</td>
                <td>{v.name}</td>
                <td class="dim small">{device.ports.filter((p) => p.switchport && p.mode === 'access' && p.accessVlan === v.id).map((p) => p.short).join(', ') || '-'}</td>
                <td>
                  {v.id !== 1 && (
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label={tx(`Usuń VLAN ${v.id}`, `Delete VLAN ${v.id}`)} onClick={() => run([`no vlan ${v.id}`])}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        class="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!id || idErr || nameErr) return;
          if (run([`vlan ${id}`, ...(name ? [`name ${name}`] : [])])) {
            setId('');
            setName('');
          }
        }}
      >
        <Field id={`vlan-new-${device.id}`} label={tx('Numer VLAN', 'VLAN number')} value={id} onInput={setId} error={idErr} placeholder="10" mono />
        <Field id={`vlan-name-${device.id}`} label={tx('Nazwa', 'Name')} value={name} onInput={setName} error={nameErr} placeholder="BIURO" mono />
        <div>
          <button type="submit" class="btn">
            <Plus aria-hidden="true" />
            {tx('Dodaj VLAN', 'Add VLAN')}
          </button>
        </div>
      </form>
    </section>
  );
}

function RoutesSection({ device, run }: { device: Device; run: (commands: string[]) => boolean }) {
  const [net, setNet] = useState('');
  const [mask, setMask] = useState('255.255.255.0');
  const [via, setVia] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = { net: ipError(net), mask: prefixError(mask), via: ipError(via) };
  return (
    <section class="stack">
      <h4>{tx('Trasy statyczne', 'Static routes')}</h4>
      {device.routes.length ? (
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{tx('Sieć docelowa', 'Destination')}</th>
                <th>{tx('Następny skok', 'Next hop')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {device.routes.map((r) => (
                <tr key={`${r.net}/${r.prefix}-${r.via}-${r.iface}`}>
                  <td class="mono">
                    {r.net}/{r.prefix}
                  </td>
                  <td class="mono">{r.via || r.iface}</td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-ghost btn-icon btn-sm"
                      aria-label={tx('Usuń trasę', 'Delete route')}
                      onClick={() => run([`no ip route ${r.net} ${maskOf(r.prefix)} ${r.via || r.iface}`])}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p class="muted small">{tx('Brak tras statycznych. Trasa 0.0.0.0/0 to trasa domyślna.', 'No static routes. Route 0.0.0.0/0 is the default route.')}</p>
      )}
      <form
        class="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (Object.values(errors).some(Boolean)) return;
          const maskText = parseIp(mask) !== null ? mask : maskOf(parsePrefix(mask)!);
          if (run([`ip route ${net} ${maskText} ${via}`])) {
            setNet('');
            setVia('');
            setTouched(false);
          }
        }}
        noValidate
      >
        <Field id={`rnet-${device.id}`} label={tx('Sieć', 'Network')} value={net} onInput={setNet} error={touched ? errors.net : null} placeholder="10.0.2.0" mono />
        <Field id={`rmask-${device.id}`} label={tx('Maska', 'Mask')} value={mask} onInput={setMask} error={touched ? errors.mask : null} mono />
        <Field id={`rvia-${device.id}`} label={tx('Następny skok', 'Next hop')} value={via} onInput={setVia} error={touched ? errors.via : null} placeholder="10.0.12.2" mono />
        <div>
          <button type="submit" class="btn">
            <Plus aria-hidden="true" />
            {tx('Dodaj trasę', 'Add route')}
          </button>
        </div>
      </form>
    </section>
  );
}

export function NetConfigTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const { log, run } = useConfigRunner(ctrl, device);
  const names = [...device.ports.map((p) => p.name), ...device.vifs.map((v) => v.name)];
  const [selected, setSelected] = useState(names[0]);
  const current = names.includes(selected) ? selected : names[0];
  const isSwitch = device.kind === 'switch' || device.kind === 'l3switch';
  const routing = device.kind === 'router' || device.kind === 'l3switch';
  return (
    <div class="tab-body stack">
      <p class="muted small">
        {tx(
          'Zmiany z tego panelu wykonują prawdziwe polecenia CLI. Pod formularzem zobaczysz, co trzeba by wpisać w terminalu.',
          'Changes in this panel run real CLI commands. Below the form you will see what you would type in the terminal.',
        )}
      </p>
      <CliEcho log={log} />
      <section class="stack">
        <h4>{tx('Interfejsy', 'Interfaces')}</h4>
        <div class="field">
          <label for={`ifsel-${device.id}`}>{tx('Wybierz interfejs', 'Choose an interface')}</label>
          <select id={`ifsel-${device.id}`} class="select mono" value={current} onChange={(e) => setSelected((e.currentTarget as HTMLSelectElement).value)}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <InterfaceEditor key={`${current}-${ctrl.rev.value}`} device={device} name={current} run={run} />
      </section>
      {isSwitch && <VlanSection device={device} run={run} />}
      {device.kind === 'l3switch' && (
        <section class="stack">
          <h4>{tx('Routing IP', 'IP routing')}</h4>
          <label class="check">
            <input type="checkbox" checked={device.ipRouting} onChange={() => run([device.ipRouting ? 'no ip routing' : 'ip routing'])} />
            <span>{tx('Routing między VLAN-ami (ip routing)', 'Routing between VLANs (ip routing)')}</span>
          </label>
        </section>
      )}
      {routing && <RoutesSection device={device} run={run} />}
    </div>
  );
}
