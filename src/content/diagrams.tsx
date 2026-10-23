import type { ComponentChildren } from 'preact';
import { tx } from '../i18n';
import type { DeviceKind } from '../sim/types';
import { DeviceShape, categoryColor } from '../sim/ui/DeviceGlyph';
import type { DiagramId } from './types';

type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'info' | 'muted';

function Node({ kind, x, y, label, sub }: { kind: DeviceKind; x: number; y: number; label?: string; sub?: string }) {
  return (
    <g transform={`translate(${x - 22} ${y - 22})`} style={{ color: categoryColor(kind) }}>
      <g transform="scale(0.92)">
        <rect x="1.5" y="1.5" width="45" height="45" rx="11" class="dg-tile" />
        <DeviceShape kind={kind} />
      </g>
      {label && (
        <text x="22" y="60" class="dg-label" text-anchor="middle">
          {label}
        </text>
      )}
      {sub && (
        <text x="22" y="74" class="dg-sub" text-anchor="middle">
          {sub}
        </text>
      )}
    </g>
  );
}

function Box({ x, y, w, h, label, sub, tone = 'muted', mono }: { x: number; y: number; w: number; h: number; label: string; sub?: string; tone?: Tone; mono?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" class={`dg-box dg-${tone}`} />
      <text x={x + w / 2} y={sub ? y + h / 2 - 3 : y + h / 2 + 4} class={`dg-box-label ${mono ? 'dg-mono' : ''}`} text-anchor="middle">
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 13} class="dg-sub" text-anchor="middle">
          {sub}
        </text>
      )}
    </g>
  );
}

function Line({ x1, y1, x2, y2, tone = 'muted', dashed, arrow }: { x1: number; y1: number; x2: number; y2: number; tone?: Tone; dashed?: boolean; arrow?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} class={`dg-line dg-stroke-${tone} ${dashed ? 'dg-dashed' : ''}`} marker-end={arrow ? `url(#dg-arrow-${tone})` : undefined} />;
}

function Text({ x, y, children, cls = 'dg-label', anchor = 'middle' }: { x: number; y: number; children: ComponentChildren; cls?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} class={cls} text-anchor={anchor}>
      {children}
    </text>
  );
}

function Frame({ w, h, title, children }: { w: number; h: number; title: string; children: ComponentChildren }) {
  const tones: Tone[] = ['accent', 'ok', 'warn', 'danger', 'info', 'muted'];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} class="dg" role="img" aria-label={title}>
      <defs>
        {tones.map((tone) => (
          <marker key={tone} id={`dg-arrow-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" class={`dg-fill-${tone}`} />
          </marker>
        ))}
      </defs>
      {children}
    </svg>
  );
}

function Seq({ w, left, right, messages, title }: { w: number; left: string; right: string; messages: { label: string; dir: 'r' | 'l'; tone: Tone; note?: string }[]; title: string }) {
  const h = 70 + messages.length * 46;
  const lx = 120;
  const rx = w - 120;
  return (
    <Frame w={w} h={h} title={title}>
      <Box x={lx - 80} y={10} w={160} h={34} label={left} tone="info" />
      <Box x={rx - 80} y={10} w={160} h={34} label={right} tone="accent" />
      <Line x1={lx} y1={44} x2={lx} y2={h - 8} dashed />
      <Line x1={rx} y1={44} x2={rx} y2={h - 8} dashed />
      {messages.map((m, i) => {
        const y = 72 + i * 46;
        return (
          <g key={i}>
            <Line x1={m.dir === 'r' ? lx : rx} y1={y} x2={m.dir === 'r' ? rx : lx} y2={y} tone={m.tone} arrow />
            <Text x={(lx + rx) / 2} y={y - 8} cls="dg-label dg-strong">
              {m.label}
            </Text>
            {m.note && (
              <Text x={(lx + rx) / 2} y={y + 16} cls="dg-sub">
                {m.note}
              </Text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

const DIAGRAMS: Record<DiagramId, () => preact.JSX.Element> = {
  'lan-wan': () => (
    <Frame w={640} h={250} title={tx('Dwie sieci LAN połączone przez WAN', 'Two LANs connected through a WAN')}>
      <rect x="12" y="20" width="220" height="210" rx="18" class="dg-zone dg-info" />
      <rect x="408" y="20" width="220" height="210" rx="18" class="dg-zone dg-ok" />
      <Text x={122} y={44} cls="dg-label dg-strong">
        {tx('LAN: mieszkanie', 'LAN: apartment')}
      </Text>
      <Text x={518} y={44} cls="dg-label dg-strong">
        {tx('LAN: biuro', 'LAN: office')}
      </Text>
      <Node kind="laptop" x={60} y={110} label="LAPTOP" />
      <Node kind="phone" x={60} y={180} label="TEL" />
      <Node kind="homeRouter" x={170} y={140} label={tx('router', 'router')} />
      <Node kind="router" x={460} y={140} label="R1" />
      <Node kind="pc" x={580} y={100} label="PC1" />
      <Node kind="server" x={580} y={185} label="SRV" />
      <Node kind="internet" x={320} y={140} label="WAN" sub={tx('internet, łącza operatorów', 'internet, carrier links')} />
      <Line x1={82} y1={110} x2={148} y2={135} dashed tone="accent" />
      <Line x1={82} y1={180} x2={148} y2={148} dashed tone="accent" />
      <Line x1={192} y1={140} x2={298} y2={140} tone="warn" />
      <Line x1={342} y1={140} x2={438} y2={140} tone="warn" />
      <Line x1={482} y1={135} x2={558} y2={102} />
      <Line x1={482} y1={146} x2={558} y2={182} />
    </Frame>
  ),
  'home-network': () => (
    <Frame w={640} h={262} title={tx('Typowa sieć domowa', 'A typical home network')}>
      <Node kind="internet" x={60} y={110} label={tx('dostawca', 'provider')} />
      <Box x={130} y={92} w={110} h={36} label="ONT" sub={tx('światłowód', 'fiber')} tone="warn" />
      <Node kind="homeRouter" x={330} y={110} label={tx('router Wi-Fi 7', 'Wi-Fi 7 router')} sub="192.168.1.1" />
      <Node kind="laptop" x={520} y={40} label="192.168.1.100" />
      <Node kind="phone" x={580} y={120} label="192.168.1.101" />
      <Node kind="pc" x={500} y={190} label="192.168.1.102" />
      <Line x1={82} y1={110} x2={130} y2={110} tone="warn" />
      <Line x1={240} y1={110} x2={308} y2={110} tone="info" />
      <Line x1={352} y1={102} x2={498} y2={44} dashed tone="accent" />
      <Line x1={352} y1={110} x2={558} y2={120} dashed tone="accent" />
      <Line x1={352} y1={120} x2={478} y2={186} tone="info" />
      <Text x={320} y={254} cls="dg-sub">
        {tx('NAT: wszyscy wychodzą do internetu pod jednym adresem publicznym', 'NAT: everyone reaches the internet behind one public address')}
      </Text>
    </Frame>
  ),
  'client-server': () => (
    <Seq
      w={640}
      left={tx('Klient (przeglądarka)', 'Client (browser)')}
      right={tx('Serwer WWW', 'Web server')}
      title={tx('Model klient-serwer', 'Client-server model')}
      messages={[
        { label: 'GET / HTTP/1.1', dir: 'r', tone: 'info', note: tx('żądanie strony', 'page request') },
        { label: 'HTTP/1.1 200 OK', dir: 'l', tone: 'ok', note: tx('odpowiedź ze stroną', 'response with the page') },
      ]}
    />
  ),
  'osi-stack': () => {
    const osi = [
      ['7', tx('Aplikacji', 'Application'), 'HTTP, DNS, DHCP', tx('dane', 'data')],
      ['6', tx('Prezentacji', 'Presentation'), 'TLS, JPEG', tx('dane', 'data')],
      ['5', tx('Sesji', 'Session'), tx('sesje, RPC', 'sessions, RPC'), tx('dane', 'data')],
      ['4', tx('Transportowa', 'Transport'), 'TCP, UDP, QUIC', tx('segment', 'segment')],
      ['3', tx('Sieciowa', 'Network'), 'IPv4, IPv6, ICMP', tx('pakiet', 'packet')],
      ['2', tx('Łącza danych', 'Data link'), 'Ethernet, Wi-Fi, ARP', tx('ramka', 'frame')],
      ['1', tx('Fizyczna', 'Physical'), tx('kabel, światło, radio', 'cable, light, radio'), tx('bity', 'bits')],
    ];
    const tcpip = [
      [tx('Aplikacji', 'Application'), 0, 3],
      [tx('Transportowa', 'Transport'), 3, 1],
      [tx('Internetowa', 'Internet'), 4, 1],
      [tx('Dostępu do sieci', 'Network access'), 5, 2],
    ] as const;
    return (
      <Frame w={640} h={330} title={tx('Model OSI i TCP/IP', 'OSI and TCP/IP models')}>
        <Text x={150} y={20} cls="dg-label dg-strong">
          OSI
        </Text>
        <Text x={530} y={20} cls="dg-label dg-strong">
          TCP/IP
        </Text>
        {osi.map(([n, name, examples, pdu], i) => (
          <g key={n}>
            <rect x={20} y={30 + i * 42} width={260} height={36} rx="7" class={`dg-box ${i < 3 ? 'dg-info' : i === 3 ? 'dg-accent' : i === 4 ? 'dg-ok' : i === 5 ? 'dg-warn' : 'dg-muted'}`} />
            <text x={36} y={53 + i * 42} class="dg-label dg-strong">
              {n}. {name}
            </text>
            <text x={290} y={46 + i * 42} class="dg-sub">
              {examples}
            </text>
            <text x={290} y={60 + i * 42} class="dg-sub dg-mono">
              PDU: {pdu}
            </text>
          </g>
        ))}
        {tcpip.map(([name, start, span]) => (
          <g key={name}>
            <rect x={450} y={30 + start * 42} width={170} height={span * 42 - 6} rx="7" class="dg-box dg-muted" />
            <text x={535} y={30 + start * 42 + (span * 42 - 6) / 2 + 4} class="dg-label" text-anchor="middle">
              {name}
            </text>
          </g>
        ))}
      </Frame>
    );
  },
  encapsulation: () => {
    const rows = [
      { label: tx('Dane (np. strona WWW)', 'Data (e.g. a web page)'), parts: [{ t: tx('dane', 'data'), w: 200, tone: 'info' as Tone }], pdu: tx('dane', 'data') },
      { label: 'TCP', parts: [{ t: 'TCP', w: 70, tone: 'accent' as Tone }, { t: tx('dane', 'data'), w: 200, tone: 'info' as Tone }], pdu: 'segment' },
      { label: 'IP', parts: [{ t: 'IP', w: 60, tone: 'ok' as Tone }, { t: 'TCP', w: 70, tone: 'accent' as Tone }, { t: tx('dane', 'data'), w: 200, tone: 'info' as Tone }], pdu: tx('pakiet', 'packet') },
      {
        label: 'Ethernet',
        parts: [
          { t: 'Eth', w: 60, tone: 'warn' as Tone },
          { t: 'IP', w: 60, tone: 'ok' as Tone },
          { t: 'TCP', w: 70, tone: 'accent' as Tone },
          { t: tx('dane', 'data'), w: 200, tone: 'info' as Tone },
          { t: 'FCS', w: 50, tone: 'warn' as Tone },
        ],
        pdu: tx('ramka', 'frame'),
      },
    ];
    return (
      <Frame w={640} h={240} title={tx('Enkapsulacja danych', 'Data encapsulation')}>
        {rows.map((row, i) => {
          let x = 140;
          return (
            <g key={i}>
              <text x={20} y={44 + i * 50} class="dg-label">
                {row.pdu}
              </text>
              {row.parts.map((part, j) => {
                const el = <Box key={j} x={x} y={24 + i * 50} w={part.w - 4} h={32} label={part.t} tone={part.tone} />;
                x += part.w;
                return el;
              })}
            </g>
          );
        })}
        <Text x={320} y={230} cls="dg-sub">
          {tx('Każda warstwa dokłada swój nagłówek. Odbiorca zdejmuje je w odwrotnej kolejności.', 'Each layer adds its header. The receiver removes them in reverse order.')}
        </Text>
      </Frame>
    );
  },
  'switch-learning': () => (
    <Frame w={640} h={270} title={tx('Przełącznik uczy się adresów MAC', 'A switch learns MAC addresses')}>
      <Node kind="switch" x={200} y={120} label="SW1" />
      <Node kind="pc" x={60} y={50} label="A" sub="aa:aa" />
      <Node kind="pc" x={60} y={200} label="B" sub="bb:bb" />
      <Node kind="pc" x={340} y={120} label="C" sub="cc:cc" />
      <Line x1={82} y1={56} x2={178} y2={112} tone="accent" arrow />
      <Line x1={82} y1={196} x2={178} y2={128} />
      <Line x1={222} y1={120} x2={318} y2={120} />
      <Text x={120} y={74} cls="dg-sub">
        Gi1
      </Text>
      <Text x={136} y={186} cls="dg-sub">
        Gi2
      </Text>
      <Text x={270} y={110} cls="dg-sub">
        Gi3
      </Text>
      <rect x={410} y={40} width={210} height={160} rx="10" class="dg-box dg-muted" />
      <Text x={515} y={64} cls="dg-label dg-strong">
        {tx('Tablica MAC', 'MAC table')}
      </Text>
      <Text x={440} y={92} cls="dg-sub dg-mono" anchor="start">
        VLAN  MAC     PORT
      </Text>
      <Text x={440} y={116} cls="dg-label dg-mono" anchor="start">
        1     aa:aa   Gi1
      </Text>
      <Text x={440} y={140} cls="dg-sub dg-mono" anchor="start">
        {tx('(reszta pusta)', '(rest empty)')}
      </Text>
      <Text x={515} y={180} cls="dg-sub">
        {tx('Nieznany cel: zalewanie', 'Unknown target: flooding')}
      </Text>
    </Frame>
  ),
  'vlan-trunk': () => (
    <Frame w={640} h={240} title={tx('VLAN-y i trunk 802.1Q', 'VLANs and an 802.1Q trunk')}>
      <Node kind="switch" x={190} y={110} label="SW1" />
      <Node kind="switch" x={450} y={110} label="SW2" />
      <Node kind="pc" x={60} y={50} label="VLAN 10" />
      <Node kind="pc" x={60} y={180} label="VLAN 20" />
      <Node kind="pc" x={580} y={50} label="VLAN 10" />
      <Node kind="voip" x={580} y={180} label="VLAN 20" />
      <Line x1={82} y1={54} x2={168} y2={104} tone="info" />
      <Line x1={82} y1={176} x2={168} y2={118} tone="warn" />
      <Line x1={472} y1={104} x2={558} y2={54} tone="info" />
      <Line x1={472} y1={118} x2={558} y2={176} tone="warn" />
      <line x1={212} y1={106} x2={428} y2={106} class="dg-line dg-stroke-info" />
      <line x1={212} y1={114} x2={428} y2={114} class="dg-line dg-stroke-warn" />
      <Text x={320} y={92} cls="dg-label dg-strong">
        trunk 802.1Q
      </Text>
      <Text x={320} y={140} cls="dg-sub">
        {tx('ramki niosą znacznik VLAN 10 albo 20', 'frames carry a VLAN 10 or 20 tag')}
      </Text>
      <Text x={320} y={220} cls="dg-sub">
        {tx('Porty dostępowe: bez znacznika, jeden VLAN', 'Access ports: untagged, one VLAN')}
      </Text>
    </Frame>
  ),
  'router-on-stick': () => (
    <Frame w={640} h={280} title={tx('Router na patyku', 'Router on a stick')}>
      <Node kind="router" x={320} y={50} />
      <Text x={290} y={46} anchor="end">
        R1
      </Text>
      <Text x={290} y={62} cls="dg-sub" anchor="end">
        Gi0/0/0.10, Gi0/0/0.20
      </Text>
      <Node kind="switch" x={320} y={160} label="SW1" />
      <Node kind="pc" x={140} y={210} label="192.168.10.10" sub="VLAN 10" />
      <Node kind="pc" x={500} y={210} label="192.168.20.10" sub="VLAN 20" />
      <line x1={316} y1={74} x2={316} y2={138} class="dg-line dg-stroke-info" />
      <line x1={324} y1={74} x2={324} y2={138} class="dg-line dg-stroke-warn" />
      <Text x={340} y={110} cls="dg-sub" anchor="start">
        {tx('jeden kabel, trunk', 'one cable, trunk')}
      </Text>
      <Line x1={298} y1={168} x2={162} y2={204} tone="info" />
      <Line x1={342} y1={168} x2={478} y2={204} tone="warn" />
    </Frame>
  ),
  'routing-table': () => (
    <Frame w={640} h={250} title={tx('Najdłuższe dopasowanie prefiksu', 'Longest prefix match')}>
      <Box x={20} y={30} w={170} h={50} label={tx('Pakiet do', 'Packet to')} sub="10.1.2.77" tone="info" />
      <rect x={230} y={20} width={390} height={210} rx="10" class="dg-box dg-muted" />
      <Text x={250} y={48} cls="dg-sub dg-mono" anchor="start">
        {tx('SIEĆ             NASTĘPNY SKOK', 'NETWORK          NEXT HOP')}
      </Text>
      {[
        ['0.0.0.0/0', '203.0.113.1', false],
        ['10.0.0.0/8', '10.255.0.2', false],
        ['10.1.0.0/16', '10.255.1.2', false],
        ['10.1.2.0/24', '10.255.2.2', true],
      ].map(([net, hop, best], i) => (
        <g key={String(net)}>
          {best && <rect x={240} y={62 + i * 38} width={370} height={30} rx="6" class="dg-box dg-ok" />}
          <text x={250} y={82 + i * 38} class={`dg-label dg-mono ${best ? 'dg-strong' : ''}`}>
            {String(net).padEnd(17)}
            {hop}
          </text>
        </g>
      ))}
      <Line x1={190} y1={55} x2={238} y2={190} tone="ok" arrow />
      <Text x={105} y={130} cls="dg-sub">
        {tx('pasują cztery,', 'four match,')}
      </Text>
      <Text x={105} y={146} cls="dg-sub">
        {tx('wygrywa /24', '/24 wins')}
      </Text>
    </Frame>
  ),
  'subnet-bar': () => (
    <Frame w={640} h={200} title={tx('Podział sieci /24 na cztery /26', 'Splitting a /24 into four /26 networks')}>
      <Box x={20} y={20} w={600} h={40} label="192.168.1.0/24" sub={tx('254 adresy hostów', '254 host addresses')} tone="muted" mono />
      {['0', '64', '128', '192'].map((start, i) => (
        <g key={start}>
          <Box x={20 + i * 150} y={90} w={146} h={44} label={`.${start}/26`} sub={tx('62 hosty', '62 hosts')} tone={(['info', 'ok', 'warn', 'accent'] as Tone[])[i]} mono />
          <Text x={93 + i * 150} y={156} cls="dg-sub dg-mono">
            .{Number(start) + 1} - .{Number(start) + 62}
          </Text>
          <Text x={93 + i * 150} y={172} cls="dg-sub dg-mono">
            bc .{Number(start) + 63}
          </Text>
        </g>
      ))}
    </Frame>
  ),
  'tcp-handshake': () => (
    <Seq
      w={640}
      left={tx('Klient', 'Client')}
      right={tx('Serwer :443', 'Server :443')}
      title={tx('Uzgadnianie trójetapowe TCP', 'TCP three-way handshake')}
      messages={[
        { label: 'SYN', dir: 'r', tone: 'info', note: 'seq=x' },
        { label: 'SYN-ACK', dir: 'l', tone: 'accent', note: 'seq=y, ack=x+1' },
        { label: 'ACK', dir: 'r', tone: 'info', note: 'ack=y+1' },
        { label: tx('Dane (TLS, HTTP)', 'Data (TLS, HTTP)'), dir: 'r', tone: 'ok' },
      ]}
    />
  ),
  'dhcp-dora': () => (
    <Seq
      w={640}
      left={tx('Klient bez adresu', 'Client without an address')}
      right={tx('Serwer DHCP', 'DHCP server')}
      title="DHCP DORA"
      messages={[
        { label: 'Discover', dir: 'r', tone: 'info', note: tx('rozgłoszenie 255.255.255.255', 'broadcast 255.255.255.255') },
        { label: 'Offer', dir: 'l', tone: 'accent', note: tx('propozycja: 192.168.1.100', 'offer: 192.168.1.100') },
        { label: 'Request', dir: 'r', tone: 'info', note: tx('„biorę ten adres”', '"I take this address"') },
        { label: 'Ack', dir: 'l', tone: 'ok', note: tx('potwierdzenie i czas dzierżawy', 'confirmation and lease time') },
      ]}
    />
  ),
  'dns-resolution': () => (
    <Frame w={640} h={260} title={tx('Rozwiązywanie nazwy DNS', 'DNS name resolution')}>
      <Node kind="laptop" x={60} y={130} label={tx('klient', 'client')} />
      <Node kind="server" x={230} y={130} label={tx('resolver', 'resolver')} sub={tx('np. dostawcy', 'e.g. provider')} />
      <Box x={410} y={20} w={200} h={40} label={tx('serwer główny  .', 'root server  .')} tone="muted" />
      <Box x={410} y={110} w={200} h={40} label={tx('serwer domeny .pl', '.pl TLD server')} tone="info" />
      <Box x={410} y={200} w={200} h={40} label={tx('serwer przyklad.pl', 'przyklad.pl server')} tone="ok" />
      <Line x1={82} y1={126} x2={208} y2={126} tone="accent" arrow />
      <Text x={145} y={116} cls="dg-sub">
        1
      </Text>
      <Line x1={252} y1={118} x2={408} y2={44} tone="muted" arrow />
      <Line x1={252} y1={128} x2={408} y2={128} tone="info" arrow />
      <Line x1={252} y1={140} x2={408} y2={216} tone="ok" arrow />
      <Text x={330} y={70} cls="dg-sub">
        2
      </Text>
      <Text x={330} y={120} cls="dg-sub">
        3
      </Text>
      <Text x={330} y={192} cls="dg-sub">
        4
      </Text>
      <Text x={145} y={150} cls="dg-sub">
        {tx('5: 198.51.100.80', '5: 198.51.100.80')}
      </Text>
    </Frame>
  ),
  'nat-pat': () => (
    <Frame w={640} h={250} title={tx('NAT z przeciążeniem (PAT)', 'NAT overload (PAT)')}>
      <Node kind="pc" x={50} y={60} label="192.168.1.10" sub=":51000" />
      <Node kind="laptop" x={50} y={180} label="192.168.1.11" sub=":51000" />
      <Node kind="homeRouter" x={240} y={120} label="NAT" />
      <Node kind="internet" x={580} y={120} label={tx('internet', 'internet')} />
      <Line x1={72} y1={64} x2={218} y2={114} />
      <Line x1={72} y1={176} x2={218} y2={126} />
      <Line x1={262} y1={120} x2={558} y2={120} tone="warn" />
      <rect x={300} y={150} width={240} height={86} rx="8" class="dg-box dg-muted" />
      <Text x={310} y={172} cls="dg-sub dg-mono" anchor="start">
        {tx('wewnątrz          na zewnątrz', 'inside            outside')}
      </Text>
      <Text x={310} y={196} cls="dg-label dg-mono" anchor="start">
        .10:51000 → 203.0.113.2:51000
      </Text>
      <Text x={310} y={220} cls="dg-label dg-mono" anchor="start">
        .11:51000 → 203.0.113.2:51001
      </Text>
      <Text x={410} y={108} cls="dg-sub">
        {tx('jeden adres publiczny', 'one public address')}
      </Text>
    </Frame>
  ),
  'stp-loop': () => (
    <Frame w={640} h={250} title={tx('STP blokuje pętlę', 'STP blocks the loop')}>
      <Node kind="switch" x={320} y={62} />
      <Text x={320} y={28}>
        {tx('SW1 (most główny)', 'SW1 (root bridge)')}
      </Text>
      <Node kind="switch" x={170} y={190} label="SW2" />
      <Node kind="switch" x={470} y={190} label="SW3" />
      <Line x1={302} y1={78} x2={188} y2={174} tone="ok" />
      <Line x1={338} y1={78} x2={452} y2={174} tone="ok" />
      <Line x1={192} y1={190} x2={448} y2={190} tone="warn" dashed />
      <circle cx={420} cy={190} r={9} class="dg-fill-warn" />
      <Text x={320} y={215} cls="dg-label">
        {tx('port zablokowany (alternatywny)', 'blocked (alternate) port')}
      </Text>
      <Text x={320} y={238} cls="dg-sub">
        {tx('Gdy łącze SW1-SW3 padnie, zapasowy port przejmie ruch w około sekundę (RSTP).', 'If the SW1-SW3 link fails, the backup port takes over in about a second (RSTP).')}
      </Text>
    </Frame>
  ),
  'ospf-areas': () => (
    <Frame w={640} h={240} title={tx('Obszary OSPF', 'OSPF areas')}>
      <rect x={200} y={20} width={240} height={110} rx="18" class="dg-zone dg-accent" />
      <rect x={20} y={130} width={240} height={95} rx="18" class="dg-zone dg-info" />
      <rect x={380} y={130} width={240} height={95} rx="18" class="dg-zone dg-ok" />
      <Text x={320} y={42} cls="dg-label dg-strong">
        {tx('Obszar 0 (szkielet)', 'Area 0 (backbone)')}
      </Text>
      <Text x={80} y={212} cls="dg-label">
        {tx('Obszar 1', 'Area 1')}
      </Text>
      <Text x={560} y={212} cls="dg-label">
        {tx('Obszar 2', 'Area 2')}
      </Text>
      <Node kind="router" x={250} y={100} label="ABR1" />
      <Node kind="router" x={390} y={100} label="ABR2" />
      <Node kind="router" x={150} y={165} label="R3" />
      <Node kind="router" x={500} y={165} label="R4" />
      <Line x1={272} y1={100} x2={368} y2={100} tone="accent" />
      <Line x1={236} y1={116} x2={168} y2={150} tone="info" />
      <Line x1={404} y1={116} x2={482} y2={150} tone="ok" />
    </Frame>
  ),
  'campus-hierarchy': () => (
    <Frame w={640} h={270} title={tx('Hierarchiczny projekt sieci kampusowej', 'Hierarchical campus design')}>
      <Text x={20} y={50} cls="dg-label dg-strong" anchor="start">
        {tx('Rdzeń', 'Core')}
      </Text>
      <Text x={20} y={140} cls="dg-label dg-strong" anchor="start">
        {tx('Dystrybucja', 'Distribution')}
      </Text>
      <Text x={20} y={225} cls="dg-label dg-strong" anchor="start">
        {tx('Dostęp', 'Access')}
      </Text>
      <Node kind="l3switch" x={260} y={45} />
      <Node kind="l3switch" x={420} y={45} />
      <Node kind="l3switch" x={260} y={130} />
      <Node kind="l3switch" x={420} y={130} />
      {[180, 290, 400, 510].map((x) => (
        <Node key={x} kind="switch" x={x} y={215} />
      ))}
      <Line x1={282} y1={45} x2={398} y2={45} tone="accent" />
      <Line x1={260} y1={67} x2={260} y2={108} tone="accent" />
      <Line x1={420} y1={67} x2={420} y2={108} tone="accent" />
      <Line x1={276} y1={62} x2={404} y2={113} tone="accent" />
      <Line x1={404} y1={62} x2={276} y2={113} tone="accent" />
      {[180, 290, 400, 510].map((x) => (
        <g key={`l-${x}`}>
          <Line x1={260} y1={152} x2={x} y2={193} />
          <Line x1={420} y1={152} x2={x} y2={193} />
        </g>
      ))}
    </Frame>
  ),
  'spine-leaf': () => (
    <Frame w={640} h={250} title={tx('Architektura spine-leaf w centrum danych', 'Spine-leaf data center architecture')}>
      {[220, 420].map((x, i) => (
        <g key={x}>
          <Node kind="l3switch" x={x} y={60} />
          <Text x={x} y={26}>
            {`SPINE${i + 1}`}
          </Text>
        </g>
      ))}
      {[100, 250, 390, 540].map((x, i) => (
        <g key={x}>
          <Node kind="l3switch" x={x} y={172} label={`LEAF${i + 1}`} />
          <Line x1={220} y1={82} x2={x} y2={150} tone="accent" />
          <Line x1={420} y1={82} x2={x} y2={150} tone="accent" />
        </g>
      ))}
      <Text x={320} y={240} cls="dg-sub">
        {tx('Każdy leaf łączy się z każdym spine: zawsze dwa skoki między serwerami.', 'Every leaf connects to every spine: always two hops between servers.')}
      </Text>
    </Frame>
  ),
  'zero-trust': () => (
    <Frame w={640} h={220} title="Zero Trust">
      <Node kind="laptop" x={60} y={100} label={tx('użytkownik', 'user')} />
      <Box x={150} y={70} w={150} h={60} label={tx('Tożsamość', 'Identity')} sub="MFA, FIDO2" tone="info" />
      <Box x={320} y={70} w={150} h={60} label={tx('Stan urządzenia', 'Device posture')} sub={tx('aktualizacje, EDR', 'updates, EDR')} tone="warn" />
      <Box x={490} y={70} w={130} h={60} label={tx('Aplikacja', 'Application')} sub={tx('minimalny dostęp', 'least privilege')} tone="ok" />
      <Line x1={82} y1={100} x2={148} y2={100} tone="accent" arrow />
      <Line x1={300} y1={100} x2={318} y2={100} tone="accent" arrow />
      <Line x1={470} y1={100} x2={488} y2={100} tone="accent" arrow />
      <Text x={320} y={180} cls="dg-label dg-strong">
        {tx('Nigdy nie ufaj z założenia, zawsze sprawdzaj każde połączenie.', 'Never trust by default, verify every connection.')}
      </Text>
    </Frame>
  ),
  'wifi-bands': () => (
    <Frame w={640} h={230} title={tx('Pasma Wi-Fi', 'Wi-Fi bands')}>
      {[
        ['2,4 GHz', tx('największy zasięg, tłok, kanały 20 MHz', 'longest range, crowded, 20 MHz channels'), 560, 'warn'],
        ['5 GHz', tx('szybciej, kanały do 160 MHz', 'faster, channels up to 160 MHz'), 400, 'info'],
        ['6 GHz', tx('Wi-Fi 6E/7, kanały 320 MHz, mały tłok', 'Wi-Fi 6E/7, 320 MHz channels, little congestion'), 280, 'ok'],
      ].map(([band, desc, width, tone], i) => (
        <g key={String(band)}>
          <rect x={20} y={30 + i * 62} width={Number(width)} height={40} rx="8" class={`dg-box dg-${tone}`} />
          <text x={36} y={56 + i * 62} class="dg-label dg-strong">
            {band}
          </text>
          <text x={120} y={56 + i * 62} class="dg-sub">
            {desc}
          </text>
        </g>
      ))}
      <Text x={320} y={222} cls="dg-sub">
        {tx('Długość paska pokazuje względny zasięg przez ściany.', 'Bar length shows relative range through walls.')}
      </Text>
    </Frame>
  ),
  'ipv6-address': () => (
    <Frame w={640} h={200} title={tx('Budowa adresu IPv6', 'IPv6 address structure')}>
      <Box x={20} y={30} w={190} h={50} label="2001:0db8:85a3" sub={tx('prefiks od dostawcy /48', 'provider prefix /48')} tone="info" mono />
      <Box x={214} y={30} w={90} h={50} label="0012" sub={tx('podsieć /64', 'subnet /64')} tone="accent" mono />
      <Box x={308} y={30} w={312} h={50} label="0000:8a2e:0370:7334" sub={tx('identyfikator interfejsu (64 bity)', 'interface ID (64 bits)')} tone="ok" mono />
      <Text x={320} y={120} cls="dg-label dg-mono">
        2001:db8:85a3:12::8a2e:370:7334
      </Text>
      <Text x={320} y={146} cls="dg-sub">
        {tx('Zera wiodące znikają, a jeden ciąg zerowych grup zastępuje „::”.', 'Leading zeros disappear and one run of zero groups becomes "::".')}
      </Text>
    </Frame>
  ),
  'fiber-copper': () => (
    <Frame w={640} h={240} title={tx('Miedź i światłowód', 'Copper and fiber')}>
      <rect x={20} y={20} width={290} height={200} rx="14" class="dg-zone dg-info" />
      <rect x={330} y={20} width={290} height={200} rx="14" class="dg-zone dg-warn" />
      <Text x={165} y={46} cls="dg-label dg-strong">
        {tx('Skrętka miedziana (RJ45)', 'Copper twisted pair (RJ45)')}
      </Text>
      <Text x={475} y={46} cls="dg-label dg-strong">
        {tx('Światłowód (SFP, LC)', 'Fiber (SFP, LC)')}
      </Text>
      {[
        ['Cat6A', tx('10 Gb/s do 100 m', '10 Gb/s up to 100 m')],
        ['Cat6', tx('1 Gb/s do 100 m, 10 Gb/s do 55 m', '1 Gb/s to 100 m, 10 Gb/s to 55 m')],
        ['PoE', tx('zasilanie do 90 W (802.3bt)', 'power up to 90 W (802.3bt)')],
      ].map(([a, b], i) => (
        <g key={String(a)}>
          <text x={40} y={84 + i * 44} class="dg-label dg-strong">
            {a}
          </text>
          <text x={40} y={102 + i * 44} class="dg-sub">
            {b}
          </text>
        </g>
      ))}
      {[
        [tx('Wielomodowy OM4', 'Multimode OM4'), tx('10-100 Gb/s, do 400 m w budynku', '10-100 Gb/s, up to 400 m in a building')],
        [tx('Jednomodowy OS2', 'Single-mode OS2'), tx('kilometry, kampus i operatorzy', 'kilometers, campus and carriers')],
        [tx('Odporność', 'Immunity'), tx('brak zakłóceń elektromagnetycznych', 'no electromagnetic interference')],
      ].map(([a, b], i) => (
        <g key={String(a)}>
          <text x={350} y={84 + i * 44} class="dg-label dg-strong">
            {a}
          </text>
          <text x={350} y={102 + i * 44} class="dg-sub">
            {b}
          </text>
        </g>
      ))}
    </Frame>
  ),
};

export function Diagram({ id }: { id: DiagramId }) {
  const render = DIAGRAMS[id];
  return render ? render() : null;
}
