import { ArrowLeft, Globe, Lock, Settings2, SquareTerminal, Wifi, WifiOff } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { lang, tx } from '../../../i18n';
import { Field } from '../../../ui/Field';
import { toast } from '../../../ui/toast';
import { modelOf } from '../../catalog';
import { hostExecute, hostPrompt } from '../../cli/host';
import { ipToStr, prefixToMask } from '../../ip';
import { formatIpv6, isLinkLocal, parseCidr6, parseIpv6 } from '../../ip6';
import type { Device, Port } from '../../types';
import type { SimController } from '../controller';
import { gatewayError, hostAddressError, ipError, parsePrefix, prefixError } from '../forms';
import { Terminal } from '../Terminal';

type App = 'ip' | 'cmd' | 'web' | 'wifi';

export function hasDesktop(device: Device): boolean {
  return device.kind === 'pc' || device.kind === 'laptop' || device.kind === 'phone' || device.kind === 'server';
}

export function DesktopTab({ ctrl, device, app, onApp }: { ctrl: SimController; device: Device; app: string | undefined; onApp: (app: string | undefined) => void }) {
  const apps: { id: App; icon: typeof Globe; label: string }[] = [
    { id: 'ip', icon: Settings2, label: tx('Konfiguracja IP', 'IP configuration') },
    { id: 'cmd', icon: SquareTerminal, label: tx('Wiersz poleceń', 'Command prompt') },
    { id: 'web', icon: Globe, label: tx('Przeglądarka', 'Web browser') },
  ];
  if (device.ports.some((p) => p.media === 'wireless')) apps.push({ id: 'wifi', icon: Wifi, label: 'Wi-Fi' });
  if (!hasDesktop(device)) return <IpConfigApp ctrl={ctrl} device={device} />;
  if (!app) {
    return (
      <div class="tab-body">
        <div class="desktop-grid">
          {apps.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" class="desktop-app" onClick={() => onApp(item.id)}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  const current = apps.find((a) => a.id === app);
  return (
    <div class={`tab-body app-view ${app === 'cmd' ? 'tab-terminal' : ''}`}>
      <div class="app-bar">
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => onApp(undefined)}>
          <ArrowLeft aria-hidden="true" />
          {tx('Pulpit', 'Desktop')}
        </button>
        <strong>{current?.label}</strong>
      </div>
      {app === 'ip' && <IpConfigApp ctrl={ctrl} device={device} />}
      {app === 'cmd' && <CmdApp ctrl={ctrl} device={device} />}
      {app === 'web' && <BrowserApp ctrl={ctrl} device={device} />}
      {app === 'wifi' && <WifiApp ctrl={ctrl} device={device} />}
    </div>
  );
}

function AdapterForm({ ctrl, device, port }: { ctrl: SimController; device: Device; port: Port }) {
  const [dhcp, setDhcp] = useState(port.dhcp);
  const [ip, setIp] = useState(port.dhcp ? '' : port.ip);
  const [mask, setMask] = useState(port.dhcp || !port.ip ? '255.255.255.0' : ipToStr(prefixToMask(port.prefix)));
  const [gateway, setGateway] = useState(port.dhcp ? '' : port.gateway);
  const [dns, setDns] = useState(port.dhcp ? '' : port.dns);
  const [touched, setTouched] = useState(false);
  const errors = {
    ip: dhcp ? null : ipError(ip) ?? hostAddressError(ip, mask),
    mask: dhcp ? null : prefixError(mask),
    gateway: dhcp ? null : gatewayError(gateway, ip, mask),
    dns: dhcp ? null : ipError(dns, false),
  };
  const invalid = Object.values(errors).some(Boolean);
  const apply = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;
    if (dhcp) {
      port.dhcp = true;
      port.ip = '';
      port.gateway = '';
      port.dns = '';
      ctrl.changed();
      const now = device.ports.find((p) => p.name === port.name)!;
      if (now.ip && !now.ip.startsWith('169.254.')) toast(tx(`DHCP przydzielił adres ${now.ip}.`, `DHCP assigned ${now.ip}.`), 'ok');
      else if (now.ip.startsWith('169.254.')) toast(tx('Serwer DHCP nie odpowiedział. Komputer nadał sobie adres APIPA 169.254.x.x.', 'No DHCP server answered. The computer assigned itself an APIPA address 169.254.x.x.'), 'warn', 6000);
      else toast(tx('Karta nie jest podłączona. Adres zostanie pobrany po podłączeniu kabla.', 'The adapter is not connected. It will get an address once a cable is connected.'), 'info');
      return;
    }
    port.dhcp = false;
    port.ip = ip.trim();
    port.prefix = parsePrefix(mask)!;
    port.gateway = gateway.trim();
    port.dns = dns.trim();
    ctrl.changed();
    toast(tx('Zapisano ustawienia IP.', 'IP settings saved.'), 'ok');
  };
  const live = device.ports.find((p) => p.name === port.name)!;
  const apipa = live.ip.startsWith('169.254.');
  return (
    <form class="stack" onSubmit={apply} noValidate>
      <div class="segmented" role="radiogroup" aria-label={tx('Sposób konfiguracji', 'Configuration method')}>
        <button type="button" role="radio" aria-checked={dhcp} aria-pressed={dhcp} onClick={() => setDhcp(true)}>
          {tx('Automatycznie (DHCP)', 'Automatic (DHCP)')}
        </button>
        <button type="button" role="radio" aria-checked={!dhcp} aria-pressed={!dhcp} onClick={() => setDhcp(false)}>
          {tx('Statycznie', 'Static')}
        </button>
      </div>
      {dhcp ? (
        <div class={`callout ${apipa ? 'callout-warn' : 'callout-info'}`}>
          <Settings2 aria-hidden="true" />
          <div class="small">
            {live.dhcp && live.ip ? (
              <>
                <div>
                  {tx('Adres', 'Address')}: <span class="mono">{live.ip}/{live.prefix}</span>
                </div>
                <div>
                  {tx('Brama', 'Gateway')}: <span class="mono">{live.gateway || '-'}</span> · DNS: <span class="mono">{live.dns || '-'}</span>
                </div>
                {apipa && <div>{tx('To adres APIPA: serwer DHCP nie odpowiedział.', 'This is an APIPA address: no DHCP server answered.')}</div>}
              </>
            ) : (
              tx('Adres, maskę, bramę i DNS przydzieli serwer DHCP w sieci.', 'A DHCP server on the network will assign the address, mask, gateway and DNS.')
            )}
          </div>
        </div>
      ) : (
        <div class="form-grid">
          <Field id={`ip-${port.name}`} label={tx('Adres IPv4', 'IPv4 address')} value={ip} onInput={setIp} error={touched ? errors.ip : null} placeholder="192.168.1.10" mono />
          <Field id={`mask-${port.name}`} label={tx('Maska podsieci', 'Subnet mask')} value={mask} onInput={setMask} error={touched ? errors.mask : null} help={tx('np. 255.255.255.0 albo /24', 'e.g. 255.255.255.0 or /24')} mono />
          <Field id={`gw-${port.name}`} label={tx('Brama domyślna', 'Default gateway')} value={gateway} onInput={setGateway} error={touched ? errors.gateway : null} placeholder="192.168.1.1" mono />
          <Field id={`dns-${port.name}`} label={tx('Serwer DNS', 'DNS server')} value={dns} onInput={setDns} error={touched ? errors.dns : null} placeholder="192.168.1.1" mono />
        </div>
      )}
      <div class="row-wrap">
        <button type="submit" class="btn btn-primary">
          {dhcp ? tx('Pobierz adres z DHCP', 'Get address from DHCP') : tx('Zapisz ustawienia', 'Save settings')}
        </button>
      </div>
    </form>
  );
}

type Ipv6Mode = 'auto' | 'static' | 'off';

function Ipv6Form({ ctrl, device, port }: { ctrl: SimController; device: Device; port: Port }) {
  const initial: Ipv6Mode = port.ipv6.length ? 'static' : port.ipv6Slaac ? 'auto' : 'off';
  const [mode, setMode] = useState<Ipv6Mode>(initial);
  const [address, setAddress] = useState(port.ipv6[0] ?? '');
  const [gateway, setGateway] = useState(port.gateway6);
  const [touched, setTouched] = useState(false);
  const parsed = parseCidr6(address);
  const errors = {
    address: mode !== 'static' ? null : !address.trim() ? tx('Wpisz adres z prefiksem, np. 2001:db8:1::10/64.', 'Enter an address with a prefix, e.g. 2001:db8:1::10/64.') : !parsed ? tx('To nie jest poprawny adres IPv6 z prefiksem. Przykład: 2001:db8:1::10/64.', 'This is not a valid IPv6 address with a prefix. Example: 2001:db8:1::10/64.') : isLinkLocal(parsed.addr) ? tx('Adres fe80:: powstaje sam. Wpisz adres globalny, np. 2001:db8:1::10/64.', 'The fe80:: address is created automatically. Enter a global address, e.g. 2001:db8:1::10/64.') : null,
    gateway: mode !== 'static' || !gateway.trim() ? null : parseIpv6(gateway) === null ? tx('Brama musi być adresem IPv6, np. 2001:db8:1::1 albo fe80::1.', 'The gateway must be an IPv6 address, e.g. 2001:db8:1::1 or fe80::1.') : null,
  };
  const live = ctrl.sim.topo.ip6If(device, port.name);
  const save = (event: Event) => {
    event.preventDefault();
    setTouched(true);
    if (errors.address || errors.gateway) return;
    port.ipv6Slaac = mode === 'auto';
    port.ipv6 = mode === 'static' && parsed ? [`${formatIpv6(parsed.addr)}/${parsed.prefix}`] : [];
    port.gateway6 = mode === 'static' ? gateway.trim().toLowerCase() : '';
    ctrl.changed();
    toast(mode === 'off' ? tx('IPv6 wyłączone na tej karcie.', 'IPv6 disabled on this adapter.') : tx('Zapisano ustawienia IPv6.', 'IPv6 settings saved.'), 'ok');
  };
  return (
    <form class="stack" onSubmit={save} noValidate>
      <h4 class="ipv6-title">IPv6</h4>
      <div class="segmented" role="radiogroup" aria-label={tx('Konfiguracja IPv6', 'IPv6 configuration')}>
        {(
          [
            ['auto', 'Automatycznie (SLAAC)', 'Automatic (SLAAC)'],
            ['static', 'Statycznie', 'Static'],
            ['off', 'Wyłączone', 'Off'],
          ] as [Ipv6Mode, string, string][]
        ).map(([id, pl, en]) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} aria-pressed={mode === id} onClick={() => setMode(id)}>
            {tx(pl, en)}
          </button>
        ))}
      </div>
      {mode === 'static' && (
        <div class="form-grid">
          <Field id={`ip6-${port.name}`} label={tx('Adres IPv6 z prefiksem', 'IPv6 address with prefix')} value={address} onInput={setAddress} error={touched ? errors.address : null} placeholder="2001:db8:1::10/64" mono />
          <Field id={`gw6-${port.name}`} label={tx('Brama IPv6 (opcjonalnie)', 'IPv6 gateway (optional)')} value={gateway} onInput={setGateway} error={touched ? errors.gateway : null} help={tx('Puste pole: brama z ogłoszenia routera (RA).', 'Empty: gateway from the router advertisement (RA).')} placeholder="2001:db8:1::1" mono />
        </div>
      )}
      {mode === 'auto' && <p class="small muted">{tx('Komputer sam zbuduje adres z prefiksu ogłaszanego przez router i swojego adresu MAC (EUI-64). Router musi mieć ipv6 unicast-routing i adres /64 na interfejsie.', 'The computer builds its address from the router-advertised prefix and its MAC (EUI-64). The router needs ipv6 unicast-routing and a /64 address on the interface.')}</p>}
      {live && (
        <ul class="mono small ipv6-list">
          {live.addrs.map((a) => (
            <li key={String(a.addr)}>
              {formatIpv6(a.addr)}/{a.prefix} <span class="dim">({a.origin === 'link-local' ? 'link-local' : a.origin === 'slaac' ? 'SLAAC' : tx('statyczny', 'static')})</span>
            </li>
          ))}
        </ul>
      )}
      <div class="row-wrap">
        <button type="submit" class="btn btn-primary">
          {tx('Zapisz IPv6', 'Save IPv6')}
        </button>
      </div>
    </form>
  );
}

function IpConfigApp({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const ports = device.ports;
  const [active, setActive] = useState(ports[0].name);
  const port = ports.find((p) => p.name === active) ?? ports[0];
  return (
    <div class="tab-body stack">
      {ports.length > 1 && (
        <div class="segmented" role="tablist" aria-label={tx('Karta sieciowa', 'Network adapter')}>
          {ports.map((p) => (
            <button key={p.name} type="button" role="tab" aria-selected={p.name === active} onClick={() => setActive(p.name)}>
              {p.media === 'wireless' ? `Wi-Fi (${p.name})` : `Ethernet (${p.name})`}
            </button>
          ))}
        </div>
      )}
      <AdapterForm key={`${device.id}-${port.name}`} ctrl={ctrl} device={device} port={port} />
      <Ipv6Form key={`v6-${device.id}-${port.name}`} ctrl={ctrl} device={device} port={port} />
    </div>
  );
}

function CmdApp({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const session = ctrl.hostSession(device.id);
  const state = ctrl.terminal(`host-${device.id}`);
  return (
    <Terminal
      key={device.id}
      state={state}
      prompt={() => hostPrompt(ctrl.sim, session)}
      history={session.history}
      label={tx(`Wiersz poleceń ${device.name}`, `Command prompt ${device.name}`)}
      greeting={[tx('Wiersz poleceń symulatora PanRouter. Wpisz help, aby zobaczyć polecenia.', 'PanRouter simulator command prompt. Type help to see the commands.'), '']}
      onCommand={(line) => {
        const result = hostExecute(ctrl.sim, session, line, lang.value);
        if (result.changed) ctrl.changed();
        else ctrl.bump();
        return result;
      }}
    />
  );
}

function BrowserApp({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const [url, setUrl] = useState('https://www.przyklad.pl');
  const [result, setResult] = useState<ReturnType<SimController['sim']['http']> | null>(null);
  const [loading, setLoading] = useState(false);
  const go = (event: Event) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setResult(ctrl.sim.http(device.id, url));
      ctrl.bump();
      setLoading(false);
    }, 250);
  };
  return (
    <div class="browser">
      <form class="browser-bar" onSubmit={go}>
        <Lock aria-hidden="true" />
        <input class="input mono" value={url} onInput={(e) => setUrl((e.currentTarget as HTMLInputElement).value)} aria-label={tx('Adres strony', 'Page address')} />
        <button type="submit" class="btn btn-primary">
          {tx('Otwórz', 'Go')}
        </button>
      </form>
      <div class="browser-page">
        {loading && <div class="spinner" aria-label={tx('Ładowanie', 'Loading')} />}
        {!loading && !result && <p class="muted">{tx('Wpisz adres, np. https://www.przyklad.pl albo adres IP serwera.', 'Type an address, e.g. https://www.przyklad.pl or a server IP.')}</p>}
        {!loading && result?.status === 'ok' && (
          <article class="web-page">
            <h3>{result.title}</h3>
            <p>{result.body || tx('Strona działa. Serwer odpowiedział kodem HTTP 200.', 'The page works. The server answered HTTP 200.')}</p>
            <span class="dim small mono">HTTP {result.code} · {result.ip !== null ? ipToStr(result.ip) : ''}</span>
          </article>
        )}
        {!loading && result && result.status !== 'ok' && (
          <div class="web-error">
            <h4>
              {result.status === 'dns-failed'
                ? tx('Nie można znaleźć adresu IP serwera', 'Server IP address could not be found')
                : result.status === 'refused'
                  ? tx('Serwer odrzucił połączenie', 'The server refused the connection')
                  : tx('Przekroczono limit czasu połączenia', 'The connection timed out')}
            </h4>
            <p class="muted small">
              {result.status === 'dns-failed'
                ? tx('Sprawdź, czy komputer ma ustawiony serwer DNS i czy nazwa jest poprawna. Spróbuj też wpisać adres IP.', 'Check that the computer has a DNS server set and the name is correct. Also try typing the IP address.')
                : result.status === 'refused'
                  ? tx('Pod tym adresem działa urządzenie, ale usługa WWW nie jest włączona.', 'A device answers at this address, but the web service is not enabled.')
                  : tx('Pakiety nie dotarły do serwera albo odpowiedź nie wróciła. Sprawdź bramę, trasy, NAT i reguły zapory.', 'Packets did not reach the server or the reply did not come back. Check the gateway, routes, NAT and firewall rules.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WifiApp({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const status = ctrl.sim.topo.wifiStatus(device.id);
  const networks = ctrl.net.devices
    .filter((d) => d.wifi && (d.kind === 'ap' || d.kind === 'homeRouter'))
    .map((ap) => {
      const distance = Math.hypot(ap.x - device.x, ap.y - device.y);
      const range = modelOf(ap.kind).wifiRange;
      return { ap, distance, inRange: distance <= range && ctrl.sim.topo.isPowered(ap), bars: Math.max(1, Math.min(4, Math.ceil(4 * (1 - distance / range)))) };
    })
    .sort((a, b) => a.distance - b.distance);
  const unique = new Map<string, (typeof networks)[number]>();
  for (const n of networks) if (!unique.has(n.ap.wifi!.ssid) || (n.inRange && !unique.get(n.ap.wifi!.ssid)!.inRange)) unique.set(n.ap.wifi!.ssid, n);
  const connectTo = (ssid: string) => {
    device.wifiClient = { ssid, key };
    ctrl.changed();
    const next = ctrl.sim.topo.wifiStatus(device.id);
    if (next === 'connected') toast(tx(`Połączono z siecią ${ssid}.`, `Connected to ${ssid}.`), 'ok');
    else if (next === 'bad-key') toast(tx('Nieprawidłowe hasło sieci Wi-Fi.', 'Wrong Wi-Fi password.'), 'danger');
    else if (next === 'out-of-range') toast(tx('Sieć jest poza zasięgiem. Przesuń urządzenie bliżej punktu dostępowego.', 'The network is out of range. Move the device closer to the access point.'), 'warn');
    setSelected(null);
    setKey('');
  };
  const statusText: Record<string, string> = {
    connected: tx(`Połączono: ${device.wifiClient?.ssid ?? ''}`, `Connected: ${device.wifiClient?.ssid ?? ''}`),
    'no-ssid': tx('Zapisana sieć jest niedostępna.', 'The saved network is not available.'),
    'bad-key': tx('Błędne hasło do sieci.', 'Wrong network password.'),
    'out-of-range': tx('Sieć poza zasięgiem.', 'Network out of range.'),
    off: tx('Nie połączono z żadną siecią.', 'Not connected to any network.'),
  };
  return (
    <div class="tab-body stack">
      <div class={`callout ${status === 'connected' ? 'callout-ok' : 'callout-info'}`}>
        {status === 'connected' ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
        <div class="row-wrap" style={{ justifyContent: 'space-between', width: '100%' }}>
          <span>{statusText[status]}</span>
          {device.wifiClient && (
            <button
              type="button"
              class="btn btn-sm"
              onClick={() => {
                device.wifiClient = null;
                ctrl.changed();
              }}
            >
              {tx('Rozłącz', 'Disconnect')}
            </button>
          )}
        </div>
      </div>
      {unique.size === 0 && <p class="muted">{tx('W pobliżu nie ma sieci Wi-Fi. Dodaj router domowy albo punkt dostępowy.', 'No Wi-Fi networks nearby. Add a home router or an access point.')}</p>}
      <ul class="wifi-list">
        {[...unique.values()].map(({ ap, inRange, bars }) => (
          <li key={ap.id}>
            <button type="button" class="wifi-item" disabled={!inRange} onClick={() => setSelected(ap.wifi!.ssid)} aria-expanded={selected === ap.wifi!.ssid}>
              <span class="wifi-bars" aria-hidden="true">
                {[1, 2, 3, 4].map((b) => (
                  <i key={b} class={inRange && b <= bars ? 'on' : ''} />
                ))}
              </span>
              <span>
                <strong>{ap.wifi!.ssid}</strong>
                <span class="dim small">
                  {' '}
                  · {ap.wifi!.security === 'open' ? tx('otwarta', 'open') : ap.wifi!.security.toUpperCase()} · {ap.wifi!.band} GHz
                </span>
              </span>
              {!inRange && <span class="badge">{tx('poza zasięgiem', 'out of range')}</span>}
            </button>
            {selected === ap.wifi!.ssid && (
              <form
                class="row-wrap wifi-connect"
                onSubmit={(e) => {
                  e.preventDefault();
                  connectTo(ap.wifi!.ssid);
                }}
              >
                {ap.wifi!.security !== 'open' && <Field id={`key-${ap.id}`} label={tx('Hasło sieci', 'Network password')} value={key} onInput={setKey} type="password" />}
                <button type="submit" class="btn btn-primary">
                  {tx('Połącz', 'Connect')}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
