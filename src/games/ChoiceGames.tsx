import { useMemo } from 'preact/hooks';
import { lang, tx } from '../i18n';
import { ipToStr, parseIp, prefixToMask } from '../sim/ip';
import { ChoiceRounds, type Round } from './ChoiceRounds';
import { pick, rand, sample, shuffle } from './util';

type Props = { onFinish: (score: number) => void };

function optionsWith(correct: string, wrong: string[], count = 4): { options: string[]; answer: number } {
  const options = shuffle([correct, ...sample(wrong.filter((w) => w !== correct), count - 1)]);
  return { options, answer: options.indexOf(correct) };
}

const OSI_ITEMS: [string, string, number][] = [
  ['HTTP', 'HTTP', 7],
  ['DNS', 'DNS', 7],
  ['DHCP', 'DHCP', 7],
  ['SSH', 'SSH', 7],
  ['TLS', 'TLS', 6],
  ['TCP', 'TCP', 4],
  ['UDP', 'UDP', 4],
  ['QUIC', 'QUIC', 4],
  ['Segment TCP', 'TCP segment', 4],
  ['IPv4', 'IPv4', 3],
  ['IPv6', 'IPv6', 3],
  ['ICMP (ping)', 'ICMP (ping)', 3],
  ['OSPF', 'OSPF', 3],
  ['Router', 'Router', 3],
  ['Pakiet', 'Packet', 3],
  ['Ethernet', 'Ethernet', 2],
  ['Adres MAC', 'MAC address', 2],
  ['Przełącznik L2', 'L2 switch', 2],
  ['Ramka', 'Frame', 2],
  ['ARP', 'ARP', 2],
  ['VLAN 802.1Q', 'VLAN 802.1Q', 2],
  ['Kabel Cat6A', 'Cat6A cable', 1],
  ['Wkładka SFP+', 'SFP+ optic', 1],
  ['Bity w medium', 'Bits on the medium', 1],
  ['Sesja aplikacji', 'Application session', 5],
];

const LAYER_NAMES = (): string[] => [
  tx('1 fizyczna', '1 physical'),
  tx('2 łącza danych', '2 data link'),
  tx('3 sieciowa', '3 network'),
  tx('4 transportowa', '4 transport'),
  tx('5 sesji', '5 session'),
  tx('6 prezentacji', '6 presentation'),
  tx('7 aplikacji', '7 application'),
];

export function OsiLayers({ onFinish }: Props) {
  const rounds = useMemo<Round[]>(() => {
    const names = LAYER_NAMES();
    return sample(OSI_ITEMS, 12).map(([pl, en, layer]) => {
      const nearby = names.filter((_, i) => i !== layer - 1);
      const { options, answer } = optionsWith(names[layer - 1], nearby);
      const sorted = [...options].sort();
      return {
        prompt: (
          <div class="stack" style={{ gap: 'var(--space-2)' }}>
            <span class="muted small">{tx('Do której warstwy OSI należy:', 'Which OSI layer does this belong to:')}</span>
            <strong class="game-big">{tx(pl, en)}</strong>
          </div>
        ),
        options: sorted,
        answer: sorted.indexOf(options[answer]),
        explain: tx(`${pl} to warstwa ${names[layer - 1]}.`, `${en} is layer ${names[layer - 1]}.`),
      };
    });
  }, [lang.value]);
  return <ChoiceRounds rounds={rounds} onFinish={onFinish} />;
}

const PORTS: [string, string, string][] = [
  ['SSH', 'TCP 22', 'szyfrowane zdalne zarządzanie'],
  ['Telnet', 'TCP 23', 'nieszyfrowane zdalne logowanie, unikać'],
  ['SMTP (wysyłka poczty)', 'TCP 587', 'przesyłanie poczty od klienta, z uwierzytelnieniem'],
  ['DNS', 'UDP 53', 'zapytania o nazwy (duże odpowiedzi po TCP 53)'],
  ['DHCP (serwer)', 'UDP 67', 'serwer nasłuchuje na 67, klient na 68'],
  ['HTTP', 'TCP 80', 'strony bez szyfrowania'],
  ['NTP', 'UDP 123', 'synchronizacja czasu'],
  ['SNMP', 'UDP 161', 'monitoring urządzeń'],
  ['HTTPS', 'TCP 443', 'strony szyfrowane TLS'],
  ['HTTP/3 (QUIC)', 'UDP 443', 'QUIC działa na UDP'],
  ['syslog', 'UDP 514', 'zbieranie logów'],
  ['IMAPS', 'TCP 993', 'odbiór poczty po TLS'],
  ['DNS over TLS', 'TCP 853', 'szyfrowane zapytania DNS'],
  ['RDP', 'TCP 3389', 'pulpit zdalny Windows'],
  ['WireGuard', 'UDP 51820', 'nowoczesny VPN'],
  ['IPsec IKE', 'UDP 500', 'negocjacja tuneli IPsec (z NAT także 4500)'],
  ['RADIUS', 'UDP 1812', 'uwierzytelnianie 802.1X'],
  ['LDAPS', 'TCP 636', 'katalog użytkowników po TLS'],
];

const PORTS_EN: Record<string, string> = {
  'szyfrowane zdalne zarządzanie': 'encrypted remote management',
  'nieszyfrowane zdalne logowanie, unikać': 'unencrypted remote login, avoid',
  'przesyłanie poczty od klienta, z uwierzytelnieniem': 'mail submission from clients, authenticated',
  'zapytania o nazwy (duże odpowiedzi po TCP 53)': 'name queries (large answers over TCP 53)',
  'serwer nasłuchuje na 67, klient na 68': 'the server listens on 67, the client on 68',
  'strony bez szyfrowania': 'unencrypted web pages',
  'synchronizacja czasu': 'time synchronization',
  'monitoring urządzeń': 'device monitoring',
  'strony szyfrowane TLS': 'TLS-encrypted web pages',
  'QUIC działa na UDP': 'QUIC runs over UDP',
  'zbieranie logów': 'log collection',
  'odbiór poczty po TLS': 'mail retrieval over TLS',
  'szyfrowane zapytania DNS': 'encrypted DNS queries',
  'pulpit zdalny Windows': 'Windows remote desktop',
  'nowoczesny VPN': 'a modern VPN',
  'negocjacja tuneli IPsec (z NAT także 4500)': 'IPsec tunnel negotiation (with NAT also 4500)',
  'uwierzytelnianie 802.1X': '802.1X authentication',
  'katalog użytkowników po TLS': 'user directory over TLS',
};

export function PortsServices({ onFinish }: Props) {
  const rounds = useMemo<Round[]>(() => {
    return sample(PORTS, 12).map(([service, port, note], i) => {
      const explain = `${service}: ${port}, ${tx(note, PORTS_EN[note])}.`;
      if (i % 2 === 0) {
        const { options, answer } = optionsWith(port, PORTS.map((p) => p[1]));
        return { prompt: <PromptBig label={tx('Jaki port i protokół ma usługa:', 'Which port and protocol does this service use:')} value={service} />, options, answer, explain };
      }
      const { options, answer } = optionsWith(service, PORTS.map((p) => p[0]));
      return { prompt: <PromptBig label={tx('Która usługa używa:', 'Which service uses:')} value={port} mono />, options, answer, explain };
    });
  }, [lang.value]);
  return <ChoiceRounds rounds={rounds} onFinish={onFinish} />;
}

function PromptBig({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div class="stack" style={{ gap: 'var(--space-2)' }}>
      <span class="muted small">{label}</span>
      <strong class={`game-big ${mono ? 'mono' : ''}`}>{value}</strong>
    </div>
  );
}

const CABLE_SCENARIOS = (): { q: string; correct: string; wrong: string[]; why: string }[] => [
  { q: tx('Punkt Wi-Fi 7 na suficie, 70 m od szafy, potrzebuje 2,5 Gb/s i 45 W.', 'A ceiling Wi-Fi 7 AP 70 m from the rack needs 2.5 Gb/s and 45 W.'), correct: tx('Cat6A do portu multigigabit z PoE++ (802.3bt)', 'Cat6A to a multigigabit PoE++ (802.3bt) port'), wrong: [tx('Cat5e do portu 1 Gb/s z PoE (802.3af)', 'Cat5e to a 1 Gb/s PoE (802.3af) port'), tx('Światłowód OM4 bez zasilania', 'OM4 fiber with no power'), tx('Kabel DAC 3 m', 'A 3 m DAC cable')], why: tx('45 W wymaga 802.3bt, a 2,5 Gb/s na 70 m pewnie zapewni Cat6A.', '45 W needs 802.3bt and Cat6A reliably carries 2.5 Gb/s over 70 m.') },
  { q: tx('Połączenie 10 Gb/s między szafami w budynku, 250 m.', 'A 10 Gb/s link between racks in a building, 250 m.'), correct: tx('Światłowód wielomodowy OM4 i wkładki SFP+ SR', 'OM4 multimode fiber with SFP+ SR optics'), wrong: [tx('Skrętka Cat6A', 'Cat6A twisted pair'), tx('Skrętka Cat8', 'Cat8 twisted pair'), tx('Wi-Fi 6E', 'Wi-Fi 6E')], why: tx('Miedź kończy się na 100 m. OM4 z SFP+ SR obsłuży 10 Gb/s na 300-400 m.', 'Copper stops at 100 m. OM4 with SFP+ SR handles 10 Gb/s over 300-400 m.') },
  { q: tx('Dwa budynki kampusu oddalone o 5 km.', 'Two campus buildings 5 km apart.'), correct: tx('Światłowód jednomodowy OS2 i wkładki LR', 'OS2 single-mode fiber with LR optics'), wrong: [tx('Światłowód OM3', 'OM3 fiber'), tx('Skrętka Cat6A ze wzmacniaczem', 'Cat6A with a repeater'), tx('Kabel DAC', 'A DAC cable')], why: tx('Kilometry to domena jednomodowego włókna.', 'Kilometers are single-mode territory.') },
  { q: tx('Serwer i przełącznik w tej samej szafie, 25 Gb/s, 2 m.', 'A server and a switch in the same rack, 25 Gb/s, 2 m.'), correct: tx('Kabel DAC SFP28', 'An SFP28 DAC cable'), wrong: [tx('Światłowód OS2 z wkładkami LR', 'OS2 fiber with LR optics'), tx('Skrętka Cat5e', 'Cat5e twisted pair'), tx('Wi-Fi 7', 'Wi-Fi 7')], why: tx('Na krótkich odcinkach DAC jest najtańszy i najprostszy.', 'For short runs DAC is cheapest and simplest.') },
  { q: tx('Kamera IP na elewacji, 40 m od przełącznika, bez gniazdka w pobliżu.', 'An IP camera on the facade, 40 m from the switch, no outlet nearby.'), correct: tx('Skrętka do portu PoE+ przełącznika', 'Twisted pair to a PoE+ switch port'), wrong: [tx('Skrętka do portu routera bez PoE', 'Twisted pair to a non-PoE router port'), tx('Światłowód bez zasilania', 'Fiber with no power'), tx('Bluetooth', 'Bluetooth')], why: tx('PoE dostarcza zasilanie tym samym kablem.', 'PoE delivers power over the same cable.') },
  { q: tx('Hala z dużymi silnikami, połączenie 1 Gb/s, 80 m.', 'A hall with large motors, a 1 Gb/s link, 80 m.'), correct: tx('Skrętka ekranowana (np. S/FTP) albo światłowód', 'Shielded twisted pair (e.g. S/FTP) or fiber'), wrong: [tx('Najtańsza skrętka U/UTP przy kablach zasilających', 'The cheapest U/UTP next to power cables'), tx('Wi-Fi 2,4 GHz', '2.4 GHz Wi-Fi'), tx('Kabel koncentryczny', 'Coaxial cable')], why: tx('Zakłócenia elektromagnetyczne wymagają ekranu albo światłowodu.', 'Electromagnetic interference calls for shielding or fiber.') },
  { q: tx('Rdzeń centrum danych, łącza 400 Gb/s między przełącznikami.', 'Data center core, 400 Gb/s links between switches.'), correct: tx('Moduły QSFP-DD lub OSFP', 'QSFP-DD or OSFP modules'), wrong: [tx('SFP 1 Gb/s', 'SFP 1 Gb/s'), tx('Skrętka Cat6A', 'Cat6A twisted pair'), tx('SFP+', 'SFP+')], why: tx('400 Gb/s to gniazda QSFP-DD i OSFP.', '400 Gb/s uses QSFP-DD and OSFP slots.') },
  { q: tx('Mieszkanie na wsi bez światłowodu, potrzebny internet.', 'A countryside apartment with no fiber needs internet.'), correct: tx('Router 5G (FWA) od operatora komórkowego', 'A 5G router (FWA) from a mobile operator'), wrong: [tx('Modem ISDN', 'An ISDN modem'), tx('Modem telefoniczny', 'A dial-up modem'), tx('Koncentrator', 'A hub')], why: tx('5G FWA to dziś typowa alternatywa dla światłowodu.', '5G FWA is today’s typical alternative to fiber.') },
];

export function CableToPort({ onFinish }: Props) {
  const rounds = useMemo<Round[]>(
    () =>
      shuffle(CABLE_SCENARIOS()).map((s) => {
        const options = shuffle([s.correct, ...s.wrong]);
        return { prompt: <p class="game-scenario">{s.q}</p>, options, answer: options.indexOf(s.correct), explain: s.why };
      }),
    [lang.value],
  );
  return <ChoiceRounds rounds={rounds} onFinish={onFinish} />;
}

export function PacketPath({ onFinish }: Props) {
  const rounds = useMemo<Round[]>(() => {
    const list: Round[] = [];
    for (let r = 0; r < 8; r++) {
      const a = 10;
      const b = rand(200) + 20;
      const c = rand(200) + 10;
      const table = [
        { net: '0.0.0.0', prefix: 0, hop: '203.0.113.1' },
        { net: `${a}.0.0.0`, prefix: 8, hop: '10.255.0.2' },
        { net: `${a}.${b}.0.0`, prefix: 16, hop: '10.255.1.2' },
        { net: `${a}.${b}.${c}.0`, prefix: 24, hop: '10.255.2.2' },
        { net: `${a}.${b}.${c}.128`, prefix: 25, hop: '10.255.3.2' },
      ];
      const variant = rand(5);
      const hosts = [
        `198.51.${rand(200)}.${rand(250) + 1}`,
        `${a}.${(b + 7) % 250}.${rand(250)}.${rand(250) + 1}`,
        `${a}.${b}.${(c + 3) % 250}.${rand(250) + 1}`,
        `${a}.${b}.${c}.${rand(120) + 2}`,
        `${a}.${b}.${c}.${rand(120) + 130}`,
      ];
      const dst = hosts[variant];
      const dstIp = parseIp(dst)!;
      const best = table.reduce<(typeof table)[number] | null>((acc, route) => {
        const net = parseIp(route.net)!;
        const mask = prefixToMask(route.prefix);
        if (((dstIp & mask) >>> 0) !== net) return acc;
        return !acc || route.prefix > acc.prefix ? route : acc;
      }, null)!;
      const options = table.map((t) => `${t.net}/${t.prefix} → ${t.hop}`);
      list.push({
        prompt: (
          <div class="stack" style={{ gap: 'var(--space-3)' }}>
            <span class="muted small">{tx('Pakiet do adresu:', 'A packet to:')}</span>
            <strong class="game-big mono">{dst}</strong>
            <span class="muted small">{tx('Którą trasę wybierze router?', 'Which route will the router pick?')}</span>
          </div>
        ),
        options,
        answer: table.indexOf(best),
        explain: tx(`Pasujące trasy wybiera się po najdłuższym prefiksie: /${best.prefix}. Maska ${ipToStr(prefixToMask(best.prefix))}.`, `Among matching routes the longest prefix wins: /${best.prefix}. Mask ${ipToStr(prefixToMask(best.prefix))}.`),
      });
    }
    return list;
  }, [lang.value]);
  return <ChoiceRounds rounds={rounds} onFinish={onFinish} mono />;
}

export function MacTableGame({ onFinish }: Props) {
  const rounds = useMemo<Round[]>(() => {
    const hosts = [
      { name: 'A', mac: 'aa:aa', port: 'Gi1' },
      { name: 'B', mac: 'bb:bb', port: 'Gi2' },
      { name: 'C', mac: 'cc:cc', port: 'Gi3' },
      { name: 'D', mac: 'dd:dd', port: 'Gi4' },
      { name: 'E', mac: 'ee:ee', port: 'Gi4' },
    ];
    const ports = ['Gi1', 'Gi2', 'Gi3', 'Gi4'];
    const table = new Map<string, string>();
    const flood = tx('Zalej porty poza wejściowym', 'Flood ports except the ingress');
    const filter = tx('Odfiltruj (nie wysyłaj)', 'Filter (do not send)');
    const sendTo = (port: string) => tx(`Wyślij tylko na ${port}`, `Send only to ${port}`);
    const list: Round[] = [];
    for (let r = 0; r < 9; r++) {
      const src = pick(hosts);
      const broadcast = r > 1 && rand(6) === 0;
      const dst = pick(hosts.filter((h) => h !== src));
      const snapshot = [...table.entries()];
      const known = table.get(dst.mac);
      let correct: string;
      let explain: string;
      if (broadcast) {
        correct = flood;
        explain = tx('Rozgłoszenie zawsze trafia do wszystkich portów w VLAN-ie poza wejściowym.', 'A broadcast always goes to every port in the VLAN except the ingress.');
      } else if (!known) {
        correct = flood;
        explain = tx(`${dst.mac} nie ma w tablicy, więc przełącznik zalewa ramkę.`, `${dst.mac} is not in the table, so the switch floods the frame.`);
      } else if (known === src.port) {
        correct = filter;
        explain = tx(`${dst.mac} jest za tym samym portem ${known}, z którego przyszła ramka.`, `${dst.mac} is behind the same port ${known} the frame came from.`);
      } else {
        correct = sendTo(known);
        explain = tx(`Tablica zna ${dst.mac} za portem ${known}.`, `The table knows ${dst.mac} is behind ${known}.`);
      }
      table.set(src.mac, src.port);
      const options = [flood, filter, ...ports.filter((p) => p !== src.port).map(sendTo)];
      list.push({
        prompt: (
          <div class="mac-game">
            <div class="stack" style={{ gap: 'var(--space-2)' }}>
              <span class="muted small">
                {tx('Ramka wchodzi na port', 'A frame arrives on port')} <strong class="mono">{src.port}</strong>
              </span>
              <span class="mono">
                {src.mac} → {broadcast ? 'ff:ff:ff:ff:ff:ff' : dst.mac}
              </span>
              <span class="muted small">{tx('Hosty D i E wiszą razem za portem Gi4 (mały przełącznik biurkowy).', 'Hosts D and E share port Gi4 (a small desk switch).')}</span>
              <span class="muted small">{tx('Co zrobi przełącznik?', 'What will the switch do?')}</span>
            </div>
            <table class="table mono small">
              <thead>
                <tr>
                  <th>MAC</th>
                  <th>Port</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.length ? (
                  snapshot.map(([mac, port]) => (
                    <tr key={mac}>
                      <td>{mac}</td>
                      <td>{port}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} class="dim">
                      {tx('pusta tablica', 'empty table')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ),
        options,
        answer: options.indexOf(correct),
        explain: `${explain} ${tx(`Przełącznik zapisuje też ${src.mac} za ${src.port}.`, `The switch also records ${src.mac} behind ${src.port}.`)}`,
      });
    }
    return list;
  }, [lang.value]);
  return <ChoiceRounds rounds={rounds} onFinish={onFinish} />;
}

const CASES = (): { symptom: string; output: string[]; correct: string; wrong: string[]; why: string }[] => [
  {
    symptom: tx('PC1 nie otwiera żadnej strony. Ping do 192.168.1.1 działa.', 'PC1 opens no websites. Ping to 192.168.1.1 works.'),
    output: ['C:\\> ipconfig /all', '   IPv4 Address . . : 192.168.1.20', '   Default Gateway  : 192.168.1.1', '   DNS Servers  . . : 192.168.1.250', 'C:\\> ping 198.51.100.80', 'Reply from 198.51.100.80: bytes=32 time=12ms'],
    correct: tx('Błędny serwer DNS', 'Wrong DNS server'),
    wrong: [tx('Brak bramy domyślnej', 'Missing default gateway'), tx('Uszkodzony kabel', 'Broken cable'), tx('Zła maska', 'Wrong mask')],
    why: tx('Ping po IP do internetu działa, więc routing jest dobry. Zawodzi rozwiązywanie nazw.', 'Pinging an internet IP works, so routing is fine. Name resolution fails.'),
  },
  {
    symptom: tx('Nowy komputer ma adres 169.254.33.7.', 'A new computer has address 169.254.33.7.'),
    output: ['SW1# show vlan brief', '10   BIURO    active    Gi1/0/1, Gi1/0/2', '99   PUSTY    active    Gi1/0/5', 'SW1# show interfaces status | Gi1/0/5 connected 99'],
    correct: tx('Port komputera jest w złym VLAN-ie, bez serwera DHCP', 'The PC port is in the wrong VLAN, with no DHCP server'),
    wrong: [tx('Serwer DNS nie działa', 'The DNS server is down'), tx('Za długi kabel', 'The cable is too long'), tx('Brak trasy domyślnej na routerze', 'No default route on the router')],
    why: tx('APIPA oznacza brak odpowiedzi DHCP. Port Gi1/0/5 jest w VLAN 99.', 'APIPA means no DHCP reply. Port Gi1/0/5 is in VLAN 99.'),
  },
  {
    symptom: tx('Oddział B nie dosięga serwerów w centrali. Traceroute urywa się na R2.', 'Branch B cannot reach HQ servers. Traceroute stops at R2.'),
    output: ['R2# show ip route', 'C   10.0.12.0/30 is directly connected, Gi0/0/0', 'C   10.2.0.0/24 is directly connected, Gi0/0/1', 'Gateway of last resort is not set'],
    correct: tx('R2 nie ma trasy do sieci centrali', 'R2 has no route to the HQ network'),
    wrong: [tx('Zły VLAN natywny', 'Native VLAN mismatch'), tx('Za słaby sygnał Wi-Fi', 'Weak Wi-Fi signal'), tx('Brak PoE', 'No PoE')],
    why: tx('R2 zna tylko sieci podłączone i nie ma trasy domyślnej.', 'R2 knows only connected networks and has no default route.'),
  },
  {
    symptom: tx('Router na patyku: VLAN 10 nie dosięga bramy 192.168.10.1.', 'Router on a stick: VLAN 10 cannot reach gateway 192.168.10.1.'),
    output: ['SW1# show interfaces trunk', tx('(brak wyników)', '(no output)'), 'SW1# show running-config interface g1/0/24', ' switchport access vlan 1', ' switchport mode access'],
    correct: tx('Port do routera nie jest trunkiem', 'The port to the router is not a trunk'),
    wrong: [tx('Zła maska na komputerze', 'Wrong mask on the PC'), tx('Brak OSPF', 'OSPF missing'), tx('Brak NAT', 'NAT missing')],
    why: tx('Ramki z tagiem VLAN 10 nie przejdą przez port dostępowy.', 'Frames tagged VLAN 10 do not pass an access port.'),
  },
  {
    symptom: tx('R1 i R2 nie tworzą sąsiedztwa OSPF.', 'R1 and R2 do not form an OSPF adjacency.'),
    output: ['R1# show ip protocols', '  10.0.12.0 0.0.0.3 area 0', 'R2# show ip protocols', '  10.0.12.0 0.0.0.3 area 1'],
    correct: tx('Różne numery obszarów na łączu', 'Different area numbers on the link'),
    wrong: [tx('Zły serwer DNS', 'Wrong DNS server'), tx('Brak ip routing', 'Missing ip routing'), tx('Za mało pamięci RAM', 'Not enough RAM')],
    why: tx('Obszar OSPF musi być zgodny po obu stronach łącza.', 'The OSPF area must match on both ends.'),
  },
  {
    symptom: tx('Biuro nie ma internetu. Router dostał adres od dostawcy.', 'The office has no internet. The router got a provider address.'),
    output: ['R1# show ip nat translations', tx('(brak wpisów)', '(no entries)'), 'R1# show running-config | include nat', ' ip nat outside   (Gi0/0/1)', ' ip nat inside source list 1 interface Gi0/0/1 overload'],
    correct: tx('Brak ip nat inside na interfejsie LAN', 'Missing ip nat inside on the LAN interface'),
    wrong: [tx('Zły kabel do ISP', 'Wrong cable to the ISP'), tx('VLAN natywny', 'Native VLAN'), tx('Brak STP', 'Missing STP')],
    why: tx('NAT tłumaczy tylko ruch z interfejsu inside na outside.', 'NAT translates only traffic from inside to outside interfaces.'),
  },
  {
    symptom: tx('Kamera IP na porcie routera nie odpowiada, dioda czerwona.', 'An IP camera on a router port does not answer, red LED.'),
    output: ['R1# show interfaces Gi0/0/2', 'GigabitEthernet0/0/2 is down, line protocol is down'],
    correct: tx('Kamera nie ma zasilania PoE', 'The camera has no PoE power'),
    wrong: [tx('Zły serwer DNS kamery', 'Wrong camera DNS server'), tx('Brak trasy domyślnej', 'No default route'), tx('Zła maska', 'Wrong mask')],
    why: tx('Port routera nie daje PoE. Kamerę trzeba podłączyć do przełącznika PoE.', 'Router ports provide no PoE. Plug the camera into a PoE switch.'),
  },
  {
    symptom: tx('Nowe łącze dodane między SW1 i SW2, a ruch się nie zmienił.', 'A new link was added between SW1 and SW2 and traffic did not change.'),
    output: ['SW2# show spanning-tree', 'Gi1/0/23   Root  FWD', 'Gi1/0/24   Altn  BLK'],
    correct: tx('STP zablokował drugie łącze, żeby nie było pętli', 'STP blocked the second link to prevent a loop'),
    wrong: [tx('Kabel jest uszkodzony', 'The cable is broken'), tx('Brak licencji', 'Missing license'), tx('Wi-Fi zakłóca łącze', 'Wi-Fi interferes')],
    why: tx('Do sumowania łączy potrzebne jest LACP. Bez tego STP blokuje zapas.', 'You need LACP to bundle links. Without it STP blocks the spare.'),
  },
];

export function NetworkDetective({ onFinish }: Props) {
  const rounds = useMemo<Round[]>(
    () =>
      sample(CASES(), 6).map((c) => {
        const options = shuffle([c.correct, ...c.wrong]);
        return {
          prompt: (
            <div class="stack" style={{ gap: 'var(--space-3)' }}>
              <p class="game-scenario">{c.symptom}</p>
              <pre class="code-mini mono">{c.output.join('\n')}</pre>
              <span class="muted small">{tx('Jaka jest najbardziej prawdopodobna przyczyna?', 'What is the most likely cause?')}</span>
            </div>
          ),
          options,
          answer: options.indexOf(c.correct),
          explain: c.why,
        };
      }),
    [lang.value],
  );
  return <ChoiceRounds rounds={rounds} onFinish={onFinish} />;
}
