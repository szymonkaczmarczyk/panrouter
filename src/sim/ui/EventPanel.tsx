import { CircleCheck, CircleX, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { lang, tx } from '../../i18n';
import { explain } from '../explain';
import { formatMacColon, ipToStr } from '../ip';
import type { Frame, TraceEvent } from '../types';
import { PROTO_COLOR, stepTimes } from './Canvas';
import type { SimController } from './controller';

const PROTOCOLS = ['ARP', 'ICMP', 'DHCP', 'DNS', 'TCP', 'HTTP', 'HTTPS'];

function macText(mac: string): string {
  if (mac === 'ffffffffffff') return `ff:ff:ff:ff:ff:ff (${tx('rozgłoszenie', 'broadcast')})`;
  return /^[0-9a-f]{12}$/.test(mac) ? formatMacColon(mac) : mac || '-';
}

function Layers({ frame }: { frame: Frame }) {
  const rows: { layer: string; title: string; fields: [string, string][] }[] = [];
  const l2: [string, string][] = [
    [tx('MAC docelowy', 'Destination MAC'), macText(frame.dst)],
    [tx('MAC źródłowy', 'Source MAC'), macText(frame.src)],
  ];
  if (frame.vlan !== null) l2.push(['802.1Q VLAN', String(frame.vlan)]);
  l2.push(['EtherType', frame.type === 'arp' ? '0x0806 (ARP)' : '0x0800 (IPv4)']);
  if (frame.src) rows.push({ layer: 'L2', title: 'Ethernet II', fields: l2 });
  if (frame.arp) {
    const a = frame.arp;
    rows.push({
      layer: 'L2.5',
      title: `ARP ${a.op === 'request' ? tx('zapytanie', 'request') : tx('odpowiedź', 'reply')}`,
      fields: [
        [tx('Nadawca IP', 'Sender IP'), ipToStr(a.senderIp)],
        [tx('Nadawca MAC', 'Sender MAC'), macText(a.senderMac)],
        [tx('Szukany IP', 'Target IP'), ipToStr(a.targetIp)],
        [tx('Szukany MAC', 'Target MAC'), a.op === 'request' ? tx('nieznany (00:00:00:00:00:00)', 'unknown (00:00:00:00:00:00)') : macText(a.targetMac)],
      ],
    });
  }
  const ip = frame.ip;
  if (ip) {
    rows.push({
      layer: 'L3',
      title: 'IPv4',
      fields: [
        [tx('Adres źródłowy', 'Source address'), ip.src ? ipToStr(ip.src) : '0.0.0.0'],
        [tx('Adres docelowy', 'Destination address'), ipToStr(ip.dst)],
        ['TTL', String(ip.ttl)],
        [tx('Protokół', 'Protocol'), ip.proto.toUpperCase()],
      ],
    });
    if (ip.icmp) {
      const names: Record<string, string> = {
        'echo-request': tx('żądanie echa (8)', 'echo request (8)'),
        'echo-reply': tx('odpowiedź echa (0)', 'echo reply (0)'),
        unreachable: tx('cel nieosiągalny (3)', 'destination unreachable (3)'),
        'time-exceeded': tx('czas przekroczony (11)', 'time exceeded (11)'),
      };
      rows.push({ layer: 'L3', title: 'ICMP', fields: [[tx('Typ', 'Type'), names[ip.icmp.type]], [tx('Kod', 'Code'), String(ip.icmp.code)], ['ID / seq', `${ip.icmp.id} / ${ip.icmp.seq}`]] });
    }
    if (ip.udp) rows.push({ layer: 'L4', title: 'UDP', fields: [[tx('Port źródłowy', 'Source port'), String(ip.udp.sport)], [tx('Port docelowy', 'Destination port'), String(ip.udp.dport)]] });
    if (ip.tcp) rows.push({ layer: 'L4', title: 'TCP', fields: [[tx('Port źródłowy', 'Source port'), String(ip.tcp.sport)], [tx('Port docelowy', 'Destination port'), String(ip.tcp.dport)], [tx('Flagi', 'Flags'), ip.tcp.flags.join(', ')]] });
    const dhcp = ip.udp?.dhcp;
    if (dhcp) {
      const fields: [string, string][] = [[tx('Komunikat', 'Message'), `DHCP${dhcp.op.toUpperCase()}`], ['xid', `0x${dhcp.xid.toString(16)}`], [tx('MAC klienta', 'Client MAC'), macText(dhcp.chaddr)]];
      if (dhcp.yiaddr) fields.push([tx('Proponowany adres', 'Offered address'), ipToStr(dhcp.yiaddr)]);
      if (dhcp.giaddr) fields.push([tx('Przekaźnik (giaddr)', 'Relay (giaddr)'), ipToStr(dhcp.giaddr)]);
      if (dhcp.router) fields.push([tx('Brama', 'Gateway'), ipToStr(dhcp.router)]);
      if (dhcp.dns) fields.push(['DNS', ipToStr(dhcp.dns)]);
      rows.push({ layer: 'L7', title: 'DHCP', fields });
    }
    const dns = ip.udp?.dns;
    if (dns) {
      rows.push({
        layer: 'L7',
        title: 'DNS',
        fields: [[tx('Rodzaj', 'Kind'), dns.response ? tx('odpowiedź', 'response') : tx('zapytanie', 'query')], [tx('Nazwa', 'Name'), dns.name], ...(dns.response ? ([[tx('Odpowiedź', 'Answer'), dns.rcode === 'ok' ? ipToStr(dns.answer) : 'NXDOMAIN']] as [string, string][]) : [])],
      });
    }
    const http = ip.tcp?.http;
    if (http) {
      rows.push({
        layer: 'L7',
        title: ip.tcp!.dport === 443 || ip.tcp!.sport === 443 ? tx('HTTPS (HTTP w TLS 1.3)', 'HTTPS (HTTP inside TLS 1.3)') : 'HTTP',
        fields: http.kind === 'request' ? [[tx('Żądanie', 'Request'), `${http.method} ${http.path}`], ['Host', http.host]] : [[tx('Odpowiedź', 'Response'), `${http.status} OK`], [tx('Tytuł', 'Title'), http.title]],
      });
    }
  }
  return (
    <div class="layers">
      {rows.map((row) => (
        <div class="layer" key={`${row.layer}-${row.title}`}>
          <div class="layer-head">
            <span class="badge">{row.layer}</span>
            <strong>{row.title}</strong>
          </div>
          <dl>
            {row.fields.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd class="mono">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function EventDetails({ ctrl, event }: { ctrl: SimController; event: TraceEvent }) {
  const name = (id: string) => ctrl.net.devices.find((d) => d.id === id)?.name ?? id;
  const notes = [...event.sent.map((n) => ({ who: name(event.from.dev), n })), ...event.received.map((n) => ({ who: event.to ? name(event.to.dev) : name(event.from.dev), n }))];
  return (
    <div class="event-details">
      <div class="row-wrap" style={{ justifyContent: 'space-between' }}>
        <strong>
          {name(event.from.dev)} → {event.to ? name(event.to.dev) : '-'}
        </strong>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" onClick={() => (ctrl.selectedEvent.value = null)} aria-label={tx('Zamknij szczegóły', 'Close details')}>
          <X aria-hidden="true" />
        </button>
      </div>
      <ol class="decisions">
        {notes.map(({ who, n }, index) => (
          <li key={index}>
            <span class="who">{who}</span>
            {explain(n, lang.value)}
          </li>
        ))}
      </ol>
      <Layers frame={event.frame} />
    </div>
  );
}

export function EventPanel({ ctrl }: { ctrl: SimController }) {
  const events = ctrl.events.value;
  const filters = ctrl.filters.value;
  const times = stepTimes(events, filters);
  const step = ctrl.step.value;
  const playing = ctrl.playing.value;
  const visible = events.map((event, index) => ({ event, index })).filter(({ event }) => filters.has(event.proto));
  const name = (id: string) => ctrl.net.devices.find((d) => d.id === id)?.name ?? id;
  const currentTime = times[step];
  const selected = ctrl.selectedEvent.value !== null ? events[ctrl.selectedEvent.value] : null;

  useEffect(() => {
    if (!playing) return;
    if (step >= times.length - 1) {
      ctrl.playing.value = false;
      return;
    }
    const timer = window.setTimeout(() => (ctrl.step.value = step + 1), 950 / ctrl.speed.value);
    return () => window.clearTimeout(timer);
  }, [playing, step, times.length, ctrl.speed.value]);

  useEffect(() => {
    const row = document.querySelector('.event-row[aria-current="step"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [step]);

  const toggleFilter = (proto: string) => {
    const next = new Set(filters);
    if (next.has(proto)) next.delete(proto);
    else next.add(proto);
    ctrl.filters.value = next;
    ctrl.step.value = Math.min(ctrl.step.value, stepTimes(events, next).length - 1);
  };

  return (
    <section class="event-panel" aria-label={tx('Panel symulacji', 'Simulation panel')}>
      <header class="panel-head">
        <div class="panel-title">
          <strong>{tx('Symulacja krok po kroku', 'Step-by-step simulation')}</strong>
          <span class="dim small">
            {times.length ? tx(`Krok ${Math.max(0, step + 1)} z ${times.length}`, `Step ${Math.max(0, step + 1)} of ${times.length}`) : tx('Brak zdarzeń', 'No events')}
          </span>
        </div>
      </header>
      <div class="sim-controls">
        <button type="button" class="btn btn-icon" onClick={() => (ctrl.step.value = Math.max(-1, step - 1))} disabled={step < 0} aria-label={tx('Krok wstecz', 'Step back')} title={tx('Krok wstecz (←)', 'Step back (←)')}>
          <SkipBack aria-hidden="true" />
        </button>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => {
            if (!playing && step >= times.length - 1) ctrl.step.value = -1;
            ctrl.playing.value = !playing;
          }}
          disabled={!times.length}
          title={tx('Odtwarzaj lub pauza (Spacja)', 'Play or pause (Space)')}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {playing ? tx('Pauza', 'Pause') : tx('Odtwarzaj', 'Play')}
        </button>
        <button type="button" class="btn btn-icon" onClick={() => (ctrl.step.value = Math.min(times.length - 1, step + 1))} disabled={step >= times.length - 1} aria-label={tx('Krok dalej', 'Step forward')} title={tx('Krok dalej (→)', 'Step forward (→)')}>
          <SkipForward aria-hidden="true" />
        </button>
        <button type="button" class="btn btn-icon btn-ghost" onClick={() => ctrl.clearEvents()} aria-label={tx('Wyczyść zdarzenia', 'Clear events')} title={tx('Wyczyść zdarzenia', 'Clear events')}>
          <RotateCcw aria-hidden="true" />
        </button>
        <label class="speed">
          <span class="dim small">{tx('Tempo', 'Speed')}</span>
          <input type="range" min="0.25" max="3" step="0.25" value={ctrl.speed.value} onInput={(e) => (ctrl.speed.value = Number((e.currentTarget as HTMLInputElement).value))} aria-label={tx('Tempo animacji', 'Animation speed')} />
        </label>
      </div>
      <div class="proto-filters" role="group" aria-label={tx('Filtr protokołów', 'Protocol filter')}>
        {PROTOCOLS.map((proto) => (
          <button key={proto} type="button" class="proto-chip" aria-pressed={filters.has(proto)} onClick={() => toggleFilter(proto)}>
            <span class="dot" style={{ background: PROTO_COLOR[proto] }} />
            {proto}
          </button>
        ))}
      </div>
      {!events.length && (
        <div class="empty small">
          <p>
            {tx(
              'Wyślij pakiet: wybierz narzędzie „Pakiet testowy” i kliknij nadawcę, a potem odbiorcę. Możesz też wpisać ping w wierszu poleceń komputera.',
              'Send a packet: pick the "Test packet" tool and click the sender, then the receiver. You can also type ping in a computer’s command prompt.',
            )}
          </p>
        </div>
      )}
      {selected ? (
        <EventDetails ctrl={ctrl} event={selected} />
      ) : (
        <ol class="event-list">
          {visible.map(({ event, index }) => (
            <li key={event.seq}>
              <button
                type="button"
                class="event-row"
                aria-current={event.time === currentTime ? 'step' : undefined}
                onClick={() => {
                  ctrl.playing.value = false;
                  ctrl.step.value = times.indexOf(event.time);
                  ctrl.selectedEvent.value = index;
                }}
              >
                <span class="dot" style={{ background: PROTO_COLOR[event.proto] }} />
                <span class="ev-proto">{event.proto}</span>
                <span class="ev-path">
                  {name(event.from.dev)} → {event.to ? name(event.to.dev) : '×'}
                </span>
                {event.outcome === 'drop' ? <CircleX aria-label={tx('odrzucony', 'dropped')} class="ev-drop" /> : <CircleCheck aria-hidden="true" class="ev-ok" />}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
