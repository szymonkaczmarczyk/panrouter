import { Plus, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { tx } from '../../../i18n';
import { Field } from '../../../ui/Field';
import { toast } from '../../../ui/toast';
import { ipToStr, networkOf, parseIp } from '../../ip';
import type { Device } from '../../types';
import type { SimController } from '../controller';
import { ipError, parsePrefix, prefixError } from '../forms';

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
      <span>{label}</span>
    </label>
  );
}

function DhcpService({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const [name, setName] = useState('LAN');
  const [net, setNet] = useState('');
  const [mask, setMask] = useState('255.255.255.0');
  const [gw, setGw] = useState('');
  const [dns, setDns] = useState('');
  const [exFrom, setExFrom] = useState('');
  const [exTo, setExTo] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = {
    name: /^[A-Za-z0-9_-]{1,24}$/.test(name) ? (device.dhcpPools.some((p) => p.name === name) ? tx('Taka pula już istnieje.', 'This pool already exists.') : null) : tx('Litery, cyfry, _ lub -', 'Letters, digits, _ or -'),
    net: ipError(net),
    mask: prefixError(mask),
    gw: ipError(gw, false),
    dns: ipError(dns, false),
  };
  const addPool = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    const prefix = parsePrefix(mask)!;
    device.dhcpPools.push({ name, network: ipToStr(networkOf(parseIp(net)!, prefix)), prefix, router: gw, dns, domain: '' });
    ctrl.changed();
    setTouched(false);
    setNet('');
    toast(tx(`Dodano pulę ${name}.`, `Pool ${name} added.`), 'ok');
  };
  const exErr = exFrom ? ipError(exFrom) ?? (exTo ? ipError(exTo) : null) : null;
  return (
    <section class="stack">
      <h4>DHCP</h4>
      <Toggle label={tx('Usługa DHCP włączona', 'DHCP service enabled')} checked={device.services.dhcp} onChange={(v) => { device.services.dhcp = v; ctrl.changed(); }} />
      {device.dhcpPools.length > 0 && (
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{tx('Pula', 'Pool')}</th>
                <th>{tx('Sieć', 'Network')}</th>
                <th>{tx('Brama', 'Gateway')}</th>
                <th>DNS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {device.dhcpPools.map((pool) => (
                <tr key={pool.name}>
                  <td>{pool.name}</td>
                  <td class="mono">
                    {pool.network}/{pool.prefix}
                  </td>
                  <td class="mono">{pool.router || '-'}</td>
                  <td class="mono">{pool.dns || '-'}</td>
                  <td>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label={tx('Usuń pulę', 'Delete pool')} onClick={() => { device.dhcpPools = device.dhcpPools.filter((p) => p !== pool); ctrl.changed(); }}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form class="form-grid" onSubmit={addPool} noValidate>
        <Field id={`pool-name-${device.id}`} label={tx('Nazwa puli', 'Pool name')} value={name} onInput={setName} error={touched ? errors.name : null} mono />
        <Field id={`pool-net-${device.id}`} label={tx('Sieć', 'Network')} value={net} onInput={setNet} error={touched ? errors.net : null} placeholder="192.168.10.0" mono />
        <Field id={`pool-mask-${device.id}`} label={tx('Maska', 'Mask')} value={mask} onInput={setMask} error={touched ? errors.mask : null} mono />
        <Field id={`pool-gw-${device.id}`} label={tx('Brama dla klientów', 'Client gateway')} value={gw} onInput={setGw} error={touched ? errors.gw : null} placeholder="192.168.10.1" mono />
        <Field id={`pool-dns-${device.id}`} label={tx('DNS dla klientów', 'Client DNS')} value={dns} onInput={setDns} error={touched ? errors.dns : null} mono />
        <div>
          <button type="submit" class="btn">
            <Plus aria-hidden="true" />
            {tx('Dodaj pulę', 'Add pool')}
          </button>
        </div>
      </form>
      <h4 class="small">{tx('Adresy wyłączone z przydziału', 'Excluded addresses')}</h4>
      {device.dhcpExcluded.length > 0 && (
        <ul class="chip-list">
          {device.dhcpExcluded.map((range) => (
            <li key={`${range.from}-${range.to}`} class="badge">
              <span class="mono">
                {range.from}
                {range.to !== range.from ? ` - ${range.to}` : ''}
              </span>
              <button type="button" class="chip-x" aria-label={tx('Usuń zakres', 'Remove range')} onClick={() => { device.dhcpExcluded = device.dhcpExcluded.filter((r) => r !== range); ctrl.changed(); }}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        class="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!exFrom || exErr) return;
          device.dhcpExcluded.push({ from: exFrom, to: exTo || exFrom });
          setExFrom('');
          setExTo('');
          ctrl.changed();
        }}
      >
        <Field id={`ex-from-${device.id}`} label={tx('Od', 'From')} value={exFrom} onInput={setExFrom} error={exErr} mono />
        <Field id={`ex-to-${device.id}`} label={tx('Do', 'To')} value={exTo} onInput={setExTo} mono />
        <div>
          <button type="submit" class="btn">
            <Plus aria-hidden="true" />
            {tx('Wyłącz zakres', 'Exclude range')}
          </button>
        </div>
      </form>
    </section>
  );
}

function DnsService({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'A' | 'CNAME'>('A');
  const [value, setValue] = useState('');
  const nameErr = name && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(name) ? tx('Pełna nazwa, np. intranet.firma.lan', 'Full name, e.g. intranet.company.lan') : null;
  const valueErr = value && type === 'A' ? ipError(value) : null;
  return (
    <section class="stack">
      <h4>DNS</h4>
      <Toggle label={tx('Usługa DNS włączona', 'DNS service enabled')} checked={device.services.dns} onChange={(v) => { device.services.dns = v; ctrl.changed(); }} />
      {device.dnsRecords.length > 0 && (
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{tx('Nazwa', 'Name')}</th>
                <th>{tx('Typ', 'Type')}</th>
                <th>{tx('Wartość', 'Value')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {device.dnsRecords.map((r) => (
                <tr key={`${r.name}-${r.type}`}>
                  <td class="mono">{r.name}</td>
                  <td>{r.type}</td>
                  <td class="mono">{r.value}</td>
                  <td>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label={tx('Usuń rekord', 'Delete record')} onClick={() => { device.dnsRecords = device.dnsRecords.filter((x) => x !== r); ctrl.changed(); }}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form
        class="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name || !value || nameErr || valueErr) return;
          device.dnsRecords.push({ name: name.toLowerCase(), type, value: value.toLowerCase() });
          setName('');
          setValue('');
          ctrl.changed();
        }}
      >
        <Field id={`dns-name-${device.id}`} label={tx('Nazwa', 'Name')} value={name} onInput={setName} error={nameErr} placeholder="intranet.firma.lan" mono />
        <div class="field">
          <label for={`dns-type-${device.id}`}>{tx('Typ', 'Type')}</label>
          <select id={`dns-type-${device.id}`} class="select" value={type} onChange={(e) => setType((e.currentTarget as HTMLSelectElement).value as 'A' | 'CNAME')}>
            <option value="A">{tx('A (nazwa na adres IPv4)', 'A (name to IPv4 address)')}</option>
            <option value="CNAME">{tx('CNAME (alias innej nazwy)', 'CNAME (alias of another name)')}</option>
          </select>
        </div>
        <Field id={`dns-val-${device.id}`} label={type === 'A' ? tx('Adres IP', 'IP address') : tx('Nazwa docelowa', 'Target name')} value={value} onInput={setValue} error={valueErr} mono />
        <div>
          <button type="submit" class="btn">
            <Plus aria-hidden="true" />
            {tx('Dodaj rekord', 'Add record')}
          </button>
        </div>
      </form>
    </section>
  );
}

function WebService({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const [title, setTitle] = useState(device.web.title);
  const [body, setBody] = useState(device.web.body);
  return (
    <section class="stack">
      <h4>{tx('Serwer WWW (HTTP i HTTPS)', 'Web server (HTTP and HTTPS)')}</h4>
      <Toggle label={tx('Usługa WWW włączona (porty 80 i 443)', 'Web service enabled (ports 80 and 443)')} checked={device.services.http} onChange={(v) => { device.services.http = v; ctrl.changed(); }} />
      <form
        class="stack"
        onSubmit={(e) => {
          e.preventDefault();
          device.web = { title: title.slice(0, 80), body: body.slice(0, 500) };
          ctrl.saveOnly();
          toast(tx('Zapisano stronę.', 'Page saved.'), 'ok');
        }}
      >
        <Field id={`web-title-${device.id}`} label={tx('Tytuł strony', 'Page title')} value={title} onInput={setTitle} />
        <div class="field">
          <label for={`web-body-${device.id}`}>{tx('Treść strony', 'Page content')}</label>
          <textarea id={`web-body-${device.id}`} class="textarea" value={body} onInput={(e) => setBody((e.currentTarget as HTMLTextAreaElement).value)} maxLength={500} />
        </div>
        <div>
          <button type="submit" class="btn">
            {tx('Zapisz stronę', 'Save page')}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ServicesTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  return (
    <div class="tab-body stack services">
      <DhcpService ctrl={ctrl} device={device} />
      <DnsService ctrl={ctrl} device={device} />
      <WebService ctrl={ctrl} device={device} />
    </div>
  );
}
