import { ArrowDown, ArrowUp, Globe, Plus, RefreshCw, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { tx } from '../../../i18n';
import { Field } from '../../../ui/Field';
import { toast } from '../../../ui/toast';
import { modelOf } from '../../catalog';
import { INTERNET_HOSTS } from '../../network';
import { broadcastOf, ipToStr, networkOf, parseIp, prefixToMask } from '../../ip';
import type { Device, FwRule, WifiConfig } from '../../types';
import type { SimController } from '../controller';
import { ipError, parsePrefix, prefixError } from '../forms';

function WifiForm({ ctrl, device, withVlan }: { ctrl: SimController; device: Device; withVlan: boolean }) {
  const wifi = device.wifi!;
  const [ssid, setSsid] = useState(wifi.ssid);
  const [security, setSecurity] = useState<WifiConfig['security']>(wifi.security);
  const [key, setKey] = useState(wifi.key);
  const [band, setBand] = useState<WifiConfig['band']>(wifi.band);
  const [vlan, setVlan] = useState(String(wifi.vlan));
  const [touched, setTouched] = useState(false);
  const errors = {
    ssid: /^[\p{L}\p{N} _.-]{1,32}$/u.test(ssid) ? null : tx('SSID: 1-32 znaki (litery, cyfry, spacja, _ . -).', 'SSID: 1-32 characters (letters, digits, space, _ . -).'),
    key: security === 'open' || (key.length >= 8 && key.length <= 63) ? null : tx('Hasło Wi-Fi musi mieć 8-63 znaki.', 'The Wi-Fi password must be 8-63 characters.'),
    vlan: !withVlan || (/^\d+$/.test(vlan) && Number(vlan) >= 1 && Number(vlan) <= 4094) ? null : tx('VLAN 1-4094', 'VLAN 1-4094'),
  };
  const save = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    device.wifi = { ssid, security, key: security === 'open' ? '' : key, band, vlan: withVlan ? Number(vlan) : wifi.vlan };
    if (withVlan) {
      const uplink = device.ports[0];
      if (Number(vlan) === 1) uplink.mode = 'access';
      else {
        uplink.mode = 'trunk';
        uplink.nativeVlan = 1;
        uplink.allowedVlans = 'all';
      }
    }
    ctrl.changed();
    toast(tx('Zapisano ustawienia Wi-Fi.', 'Wi-Fi settings saved.'), 'ok');
  };
  return (
    <form class="stack" onSubmit={save} noValidate>
      <div class="form-grid">
        <Field id={`ssid-${device.id}`} label={tx('Nazwa sieci (SSID)', 'Network name (SSID)')} value={ssid} onInput={setSsid} error={touched ? errors.ssid : null} />
        <div class="field">
          <label for={`sec-${device.id}`}>{tx('Zabezpieczenia', 'Security')}</label>
          <select id={`sec-${device.id}`} class="select" value={security} onChange={(e) => setSecurity((e.currentTarget as HTMLSelectElement).value as WifiConfig['security'])}>
            <option value="wpa3">{tx('WPA3-Personal (zalecane)', 'WPA3-Personal (recommended)')}</option>
            <option value="wpa2">{tx('WPA2-Personal (starsze urządzenia)', 'WPA2-Personal (older devices)')}</option>
            <option value="open">{tx('Otwarta (bez szyfrowania)', 'Open (no encryption)')}</option>
          </select>
        </div>
        {security !== 'open' && <Field id={`key-${device.id}`} label={tx('Hasło sieci', 'Network password')} value={key} onInput={setKey} error={touched ? errors.key : null} help={tx('8-63 znaki', '8-63 characters')} />}
        <div class="field">
          <label for={`band-${device.id}`}>{tx('Pasmo', 'Band')}</label>
          <select id={`band-${device.id}`} class="select" value={band} onChange={(e) => setBand((e.currentTarget as HTMLSelectElement).value as WifiConfig['band'])}>
            <option value="2.4">{tx('2,4 GHz (zasięg, wolniej)', '2.4 GHz (range, slower)')}</option>
            <option value="5">{tx('5 GHz (szybciej)', '5 GHz (faster)')}</option>
            <option value="6">{tx('6 GHz (Wi-Fi 6E/7, najmniej zakłóceń)', '6 GHz (Wi-Fi 6E/7, least interference)')}</option>
          </select>
        </div>
        {withVlan && <Field id={`wvlan-${device.id}`} label={tx('VLAN dla tej sieci', 'VLAN for this network')} value={vlan} onInput={setVlan} error={touched ? errors.vlan : null} help={tx('Inny niż 1 przełącza port na trunk', 'Other than 1 switches the port to trunk')} mono />}
      </div>
      {security === 'open' && <div class="callout callout-warn small">{tx('Sieć otwarta przesyła dane bez szyfrowania. Używaj jej tylko w laboratorium.', 'An open network sends data unencrypted. Use it only in the lab.')}</div>}
      <div>
        <button type="submit" class="btn btn-primary">
          {tx('Zapisz Wi-Fi', 'Save Wi-Fi')}
        </button>
      </div>
    </form>
  );
}

function ClientsList({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const clients = ctrl.sim.topo.wifiAssociations().filter((w) => w.ap === device.id);
  if (!clients.length) return <p class="muted small">{tx('Brak połączonych urządzeń bezprzewodowych.', 'No wireless devices connected.')}</p>;
  return (
    <ul class="chip-list">
      {clients.map((w) => {
        const dev = ctrl.net.devices.find((d) => d.id === w.client);
        return (
          <li key={w.client} class="badge badge-ok">
            {dev?.name}
          </li>
        );
      })}
    </ul>
  );
}

export function HomeRouterTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const wan = device.ports[0];
  const lan = device.vifs.find((v) => v.name === 'LAN')!;
  const pool = device.dhcpPools[0];
  const [lanIp, setLanIp] = useState(lan.ip);
  const [lanMask, setLanMask] = useState(ipToStr(prefixToMask(lan.prefix)));
  const [poolStart, setPoolStart] = useState(() => {
    const ex = device.dhcpExcluded[0];
    const last = ex ? parseIp(ex.to) : null;
    return last !== null ? ipToStr(last + 1) : '';
  });
  const [touched, setTouched] = useState(false);
  const wanUp = ctrl.sim.topo.portUp(device, wan.name);
  const lanErr = ipError(lanIp);
  const maskErr = prefixError(lanMask);
  const prefix = parsePrefix(lanMask);
  const startErr =
    ipError(poolStart) ??
    (prefix !== null && parseIp(lanIp) !== null && parseIp(poolStart) !== null && networkOf(parseIp(poolStart)!, prefix) !== networkOf(parseIp(lanIp)!, prefix)
      ? tx('Początek puli musi być w sieci LAN.', 'The pool start must be inside the LAN.')
      : null);
  const saveLan = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    if (lanErr || maskErr || startErr || prefix === null) return;
    const ip = parseIp(lanIp)!;
    lan.ip = lanIp;
    lan.prefix = prefix;
    const network = networkOf(ip, prefix);
    device.dhcpPools = [{ ...(pool ?? { name: 'LAN', dns: '', domain: 'dom.lan' }), name: 'LAN', network: ipToStr(network), prefix, router: lanIp, dns: pool?.dns ?? '', domain: pool?.domain ?? 'dom.lan' }];
    const start = parseIp(poolStart)!;
    device.dhcpExcluded = start > network + 1 ? [{ from: ipToStr(network + 1), to: ipToStr(start - 1) }] : [];
    device.dhcpBindings = [];
    ctrl.changed();
    toast(tx('Zapisano ustawienia LAN. Urządzenia z DHCP pobiorą nowe adresy.', 'LAN settings saved. DHCP devices will get new addresses.'), 'ok');
  };
  const leases = device.dhcpBindings.map((b) => ({ ...b, name: ctrl.net.devices.find((d) => d.ports.some((p) => p.mac === b.mac))?.name ?? b.mac }));
  return (
    <div class="tab-body stack">
      <section class="stack">
        <h4>{tx('Internet (port WAN)', 'Internet (WAN port)')}</h4>
        <div class={`callout ${wanUp && wan.ip ? 'callout-ok' : 'callout-warn'}`}>
          <Globe aria-hidden="true" />
          <div class="small">
            {wanUp && wan.ip ? (
              <>
                {tx('Połączono. Adres publiczny od dostawcy', 'Connected. Public address from the provider')}: <span class="mono">{wan.ip}/{wan.prefix}</span>
                <br />
                {tx('Brama dostawcy', 'Provider gateway')}: <span class="mono">{wan.gateway || '-'}</span> · DNS: <span class="mono">{wan.dns || '-'}</span>
              </>
            ) : wanUp ? (
              tx('Kabel podłączony, ale dostawca nie przydzielił adresu.', 'Cable connected, but the provider has not assigned an address.')
            ) : (
              tx('Brak połączenia. Podłącz port WAN do chmury Internet (ONT lub modem dostawcy).', 'Not connected. Connect the WAN port to the Internet cloud (the provider ONT or modem).')
            )}
          </div>
        </div>
        <div>
          <button type="button" class="btn btn-sm" onClick={() => { ctrl.sim.dhcpRenew(device.id, wan.name); ctrl.changed(false); }} disabled={!wanUp}>
            <RefreshCw aria-hidden="true" />
            {tx('Odnów adres od dostawcy', 'Renew provider address')}
          </button>
        </div>
      </section>
      <section class="stack">
        <h4>{tx('Sieć domowa (LAN) i DHCP', 'Home network (LAN) and DHCP')}</h4>
        <form class="form-grid" onSubmit={saveLan} noValidate>
          <Field id={`lanip-${device.id}`} label={tx('Adres routera w LAN', 'Router LAN address')} value={lanIp} onInput={setLanIp} error={touched ? lanErr : null} mono />
          <Field id={`lanmask-${device.id}`} label={tx('Maska', 'Mask')} value={lanMask} onInput={setLanMask} error={touched ? maskErr : null} mono />
          <Field id={`pool-${device.id}`} label={tx('Pierwszy adres z puli DHCP', 'First DHCP pool address')} value={poolStart} onInput={setPoolStart} error={touched ? startErr : null} help={prefix !== null && parseIp(lanIp) !== null ? tx(`Pula kończy się na ${ipToStr(broadcastOf(parseIp(lanIp)!, prefix) - 1)}`, `The pool ends at ${ipToStr(broadcastOf(parseIp(lanIp)!, prefix) - 1)}`) : undefined} mono />
          <div>
            <button type="submit" class="btn btn-primary">
              {tx('Zapisz LAN', 'Save LAN')}
            </button>
          </div>
        </form>
        {leases.length > 0 && (
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{tx('Urządzenie', 'Device')}</th>
                  <th>{tx('Adres z DHCP', 'DHCP address')}</th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease) => (
                  <tr key={lease.mac}>
                    <td>{lease.name}</td>
                    <td class="mono">{lease.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section class="stack">
        <h4>Wi-Fi</h4>
        <WifiForm ctrl={ctrl} device={device} withVlan={false} />
        <ClientsList ctrl={ctrl} device={device} />
      </section>
    </div>
  );
}

export function ApTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const powered = ctrl.sim.topo.isPowered(device);
  return (
    <div class="tab-body stack">
      {!powered && (
        <div class="callout callout-warn small">
          {tx('Punkt dostępowy nie ma zasilania. Podłącz go kablem do portu przełącznika z PoE.', 'The access point has no power. Connect it with a cable to a PoE switch port.')}
        </div>
      )}
      <section class="stack">
        <h4>{tx('Sieć bezprzewodowa', 'Wireless network')}</h4>
        <p class="muted small">
          {tx(
            `Zasięg w symulatorze: ${modelOf(device.kind).wifiRange} jednostek planszy. Punkt dostępowy przenosi ruch Wi-Fi do sieci przewodowej w wybranym VLAN-ie.`,
            `Range in the simulator: ${modelOf(device.kind).wifiRange} canvas units. The access point bridges Wi-Fi traffic into the wired network in the chosen VLAN.`,
          )}
        </p>
        <WifiForm ctrl={ctrl} device={device} withVlan />
      </section>
      <section class="stack">
        <h4>{tx('Połączone urządzenia', 'Connected devices')}</h4>
        <ClientsList ctrl={ctrl} device={device} />
      </section>
    </div>
  );
}

const ZONES = ['inside', 'outside', 'dmz'];

function zoneLabel(zone: string): string {
  if (zone === 'inside') return tx('wewnętrzna (inside)', 'inside');
  if (zone === 'outside') return tx('internet (outside)', 'outside');
  if (zone === 'dmz') return 'DMZ';
  if (zone === 'any') return tx('dowolna', 'any');
  return tx('brak', 'none');
}

export function FirewallTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const [port, setPort] = useState(device.ports[0].name);
  const current = device.ports.find((p) => p.name === port)!;
  const [ip, setIp] = useState(current.ip);
  const [mask, setMask] = useState(current.ip ? ipToStr(prefixToMask(current.prefix)) : '255.255.255.0');
  const [zone, setZone] = useState(current.zone);
  const [touched, setTouched] = useState(false);
  const [rule, setRule] = useState<FwRule>({ name: '', from: 'outside', to: 'dmz', proto: 'tcp', port: 443, dst: '', action: 'allow' });
  const [gw, setGw] = useState(device.routes.find((r) => r.prefix === 0)?.via ?? '');
  const ipErr = ip ? ipError(ip) : null;
  const maskErr = ip ? prefixError(mask) : null;
  const choosePort = (name: string) => {
    const p = device.ports.find((x) => x.name === name)!;
    setPort(name);
    setIp(p.ip);
    setMask(p.ip ? ipToStr(prefixToMask(p.prefix)) : '255.255.255.0');
    setZone(p.zone);
    setTouched(false);
  };
  const saveIf = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    if (ipErr || maskErr) return;
    current.ip = ip;
    current.prefix = parsePrefix(mask) ?? 24;
    current.zone = zone;
    ctrl.changed();
    toast(tx('Zapisano interfejs zapory.', 'Firewall interface saved.'), 'ok');
  };
  const move = (index: number, delta: number) => {
    const rules = [...device.fwRules];
    const target = index + delta;
    if (target < 0 || target >= rules.length) return;
    [rules[index], rules[target]] = [rules[target], rules[index]];
    device.fwRules = rules;
    ctrl.changed();
  };
  const addRule = (event: Event) => {
    event.preventDefault();
    if (!rule.name.trim()) return toast(tx('Nadaj regule nazwę.', 'Give the rule a name.'), 'warn');
    if (rule.dst && !/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(rule.dst)) return toast(tx('Cel podaj jako adres lub sieć, np. 10.0.0.10 albo 10.0.0.0/24.', 'Enter the destination as an address or network, e.g. 10.0.0.10 or 10.0.0.0/24.'), 'warn');
    device.fwRules = [...device.fwRules, { ...rule, name: rule.name.trim() }];
    setRule({ ...rule, name: '' });
    ctrl.changed();
  };
  const gwErr = gw ? ipError(gw) : null;
  return (
    <div class="tab-body stack">
      <section class="stack">
        <h4>{tx('Interfejsy i strefy', 'Interfaces and zones')}</h4>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{tx('Port', 'Port')}</th>
                <th>{tx('Adres', 'Address')}</th>
                <th>{tx('Strefa', 'Zone')}</th>
              </tr>
            </thead>
            <tbody>
              {device.ports.map((p) => (
                <tr key={p.name} class={p.name === port ? 'row-selected' : ''} onClick={() => choosePort(p.name)}>
                  <td class="mono">{p.short}</td>
                  <td class="mono">{p.ip ? `${p.ip}/${p.prefix}` : '-'}</td>
                  <td>{zoneLabel(p.zone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form class="form-grid" onSubmit={saveIf} noValidate>
          <div class="field">
            <label for={`fwp-${device.id}`}>{tx('Port', 'Port')}</label>
            <select id={`fwp-${device.id}`} class="select mono" value={port} onChange={(e) => choosePort((e.currentTarget as HTMLSelectElement).value)}>
              {device.ports.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.short}
                </option>
              ))}
            </select>
          </div>
          <Field id={`fwip-${device.id}`} label={tx('Adres IPv4', 'IPv4 address')} value={ip} onInput={setIp} error={touched ? ipErr : null} mono />
          <Field id={`fwmask-${device.id}`} label={tx('Maska', 'Mask')} value={mask} onInput={setMask} error={touched ? maskErr : null} mono />
          <div class="field">
            <label for={`fwz-${device.id}`}>{tx('Strefa', 'Zone')}</label>
            <select id={`fwz-${device.id}`} class="select" value={zone} onChange={(e) => setZone((e.currentTarget as HTMLSelectElement).value)}>
              <option value="">{zoneLabel('')}</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {zoneLabel(z)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button type="submit" class="btn btn-primary">
              {tx('Zapisz interfejs', 'Save interface')}
            </button>
          </div>
        </form>
      </section>
      <section class="stack">
        <h4>{tx('Reguły (od góry do dołu)', 'Rules (top to bottom)')}</h4>
        <p class="muted small">{tx('Zapora sprawdza reguły po kolei i stosuje pierwszą pasującą. Na końcu jest niewidoczna reguła „blokuj wszystko”. Odpowiedzi na dozwolony ruch wracają automatycznie.', 'The firewall checks rules in order and applies the first match. At the end there is an invisible "block everything" rule. Replies to allowed traffic return automatically.')}</p>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{tx('Nazwa', 'Name')}</th>
                <th>{tx('Z', 'From')}</th>
                <th>{tx('Do', 'To')}</th>
                <th>{tx('Usługa', 'Service')}</th>
                <th>{tx('Akcja', 'Action')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {device.fwRules.map((r, index) => (
                <tr key={`${r.name}-${index}`}>
                  <td>{r.name}</td>
                  <td>{zoneLabel(r.from)}</td>
                  <td>{zoneLabel(r.to)}</td>
                  <td class="mono small">
                    {r.proto === 'any' ? tx('wszystko', 'any') : `${r.proto}${r.port ? `/${r.port}` : ''}`}
                    {r.dst ? ` → ${r.dst}` : ''}
                  </td>
                  <td>
                    <span class={`badge ${r.action === 'allow' ? 'badge-ok' : 'badge-danger'}`}>{r.action === 'allow' ? tx('zezwól', 'allow') : tx('blokuj', 'deny')}</span>
                  </td>
                  <td class="row" style={{ gap: '2px' }}>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label={tx('W górę', 'Move up')} onClick={() => move(index, -1)}>
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label={tx('W dół', 'Move down')} onClick={() => move(index, 1)}>
                      <ArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label={tx('Usuń regułę', 'Delete rule')} onClick={() => { device.fwRules = device.fwRules.filter((_, i) => i !== index); ctrl.changed(); }}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form class="form-grid" onSubmit={addRule}>
          <Field id={`rname-${device.id}`} label={tx('Nazwa reguły', 'Rule name')} value={rule.name} onInput={(v) => setRule({ ...rule, name: v })} placeholder={tx('np. WWW z internetu', 'e.g. Web from internet')} />
          {(['from', 'to'] as const).map((key) => (
            <div class="field" key={key}>
              <label for={`r${key}-${device.id}`}>{key === 'from' ? tx('Ze strefy', 'From zone') : tx('Do strefy', 'To zone')}</label>
              <select id={`r${key}-${device.id}`} class="select" value={rule[key]} onChange={(e) => setRule({ ...rule, [key]: (e.currentTarget as HTMLSelectElement).value })}>
                {['any', ...ZONES].map((z) => (
                  <option key={z} value={z}>
                    {zoneLabel(z)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div class="field">
            <label for={`rproto-${device.id}`}>{tx('Protokół', 'Protocol')}</label>
            <select id={`rproto-${device.id}`} class="select" value={rule.proto} onChange={(e) => setRule({ ...rule, proto: (e.currentTarget as HTMLSelectElement).value as FwRule['proto'] })}>
              <option value="any">{tx('dowolny', 'any')}</option>
              <option value="icmp">ICMP (ping)</option>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          </div>
          {(rule.proto === 'tcp' || rule.proto === 'udp') && (
            <Field id={`rport-${device.id}`} label={tx('Port docelowy', 'Destination port')} value={String(rule.port || '')} onInput={(v) => setRule({ ...rule, port: Number(v.replace(/\D/g, '')) || 0 })} mono />
          )}
          <Field id={`rdst-${device.id}`} label={tx('Cel (opcjonalnie)', 'Destination (optional)')} value={rule.dst} onInput={(v) => setRule({ ...rule, dst: v.trim() })} placeholder="10.0.0.10" mono />
          <div class="field">
            <label for={`ract-${device.id}`}>{tx('Akcja', 'Action')}</label>
            <select id={`ract-${device.id}`} class="select" value={rule.action} onChange={(e) => setRule({ ...rule, action: (e.currentTarget as HTMLSelectElement).value as FwRule['action'] })}>
              <option value="allow">{tx('zezwól', 'allow')}</option>
              <option value="deny">{tx('blokuj', 'deny')}</option>
            </select>
          </div>
          <div>
            <button type="submit" class="btn">
              <Plus aria-hidden="true" />
              {tx('Dodaj regułę', 'Add rule')}
            </button>
          </div>
        </form>
      </section>
      <section class="stack">
        <h4>{tx('NAT i trasa domyślna', 'NAT and default route')}</h4>
        <label class="check">
          <input
            type="checkbox"
            checked={device.nat.some((r) => r.kind === 'pat')}
            onChange={(e) => {
              device.nat = (e.currentTarget as HTMLInputElement).checked ? [{ kind: 'pat', acl: '*', iface: '*' }] : [];
              ctrl.changed();
            }}
          />
          <span>{tx('Ukrywaj adresy wewnętrzne za adresem portu outside (PAT)', 'Hide inside addresses behind the outside port address (PAT)')}</span>
        </label>
        <form
          class="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            if (gwErr) return;
            device.routes = device.routes.filter((r) => r.prefix !== 0);
            if (gw) device.routes.push({ net: '0.0.0.0', prefix: 0, via: gw, iface: '', ad: 1 });
            ctrl.changed();
            toast(tx('Zapisano trasę domyślną.', 'Default route saved.'), 'ok');
          }}
        >
          <Field id={`fwgw-${device.id}`} label={tx('Brama do internetu', 'Internet gateway')} value={gw} onInput={setGw} error={gwErr} placeholder="203.0.113.1" mono />
          <div>
            <button type="submit" class="btn">
              {tx('Zapisz trasę', 'Save route')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function InternetTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  return (
    <div class="tab-body stack">
      <p class="muted">
        {tx(
          'Chmura udaje internet i sieć dostawcy. Każdy port to osobny klient z publiczną podsiecią. Router podłączony do portu dostaje adres przez DHCP.',
          'The cloud stands in for the internet and the provider network. Each port is a separate customer with a public subnet. A router connected to a port gets an address via DHCP.',
        )}
      </p>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{tx('Port', 'Port')}</th>
              <th>{tx('Brama dostawcy', 'Provider gateway')}</th>
              <th>{tx('Klient', 'Customer')}</th>
            </tr>
          </thead>
          <tbody>
            {device.ports.map((port) => {
              const end = ctrl.sim.topo.peer(device.id, port.name);
              const peer = end ? ctrl.net.devices.find((d) => d.id === end.dev) : undefined;
              return (
                <tr key={port.name}>
                  <td class="mono">
                    {port.short} ({port.media === 'fiber' ? tx('światłowód', 'fiber') : tx('miedź', 'copper')})
                  </td>
                  <td class="mono">
                    {port.ip}/{port.prefix}
                  </td>
                  <td>{peer ? peer.name : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h4>{tx('Usługi w internecie', 'Services on the internet')}</h4>
      <ul class="spec-list">
        {INTERNET_HOSTS.map((host) => (
          <li key={host.ip}>
            <span class="mono">{host.name}</span> · <span class="mono">{host.ip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
