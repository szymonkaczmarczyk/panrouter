import type { Lang } from '../../i18n/l10n';
import type { EchoResult, Simulator } from '../engine';
import { formatMacWindows, ipToStr, parseIp, prefixToMask } from '../ip';
import type { Device, Port } from '../types';
import { cliExecute, cliPrompt, newSession, type CliSession } from './ios';
import { fakeHash } from './show';

export interface HostSession {
  deviceId: string;
  history: string[];
  remote: null | {
    targetId: string;
    kind: 'ssh' | 'telnet';
    user: string;
    stage: 'password' | 'cli';
    cli: CliSession;
  };
}

export interface HostResult {
  lines: string[];
  changed: boolean;
  clear: boolean;
  secret: boolean;
}

export function newHostSession(deviceId: string): HostSession {
  return { deviceId, history: [], remote: null };
}

type Text = { pl: string; en: string };
const t = (lang: Lang, text: Text) => text[lang];

export function hostPrompt(sim: Simulator, session: HostSession): string {
  if (session.remote) {
    if (session.remote.stage === 'password') return '';
    const target = sim.topo.device(session.remote.targetId);
    return target ? cliPrompt(target, session.remote.cli) : '';
  }
  const device = sim.topo.device(session.deviceId);
  return `C:\\Users\\${device?.name ?? 'PC'}>`;
}

function adapterTitle(port: Port, lang: Lang): string {
  if (port.media === 'wireless') return t(lang, { pl: `Karta bezprzewodowej sieci LAN ${port.name}:`, en: `Wireless LAN adapter ${port.name}:` });
  return t(lang, { pl: `Karta Ethernet ${port.name}:`, en: `Ethernet adapter ${port.name}:` });
}

function dots(label: string): string {
  const base = `   ${label}`;
  let line = base;
  let dot = true;
  while (line.length < 39) {
    line += dot ? '.' : ' ';
    dot = !dot;
  }
  return `${line}: `;
}

function ipconfig(sim: Simulator, device: Device, lang: Lang, all: boolean): string[] {
  const out = ['', t(lang, { pl: 'Konfiguracja IP', en: 'IP Configuration' }), ''];
  if (all) {
    out.push(`${dots(t(lang, { pl: 'Nazwa hosta', en: 'Host Name' }))}${device.name}`, '');
  }
  for (const port of device.ports) {
    out.push(adapterTitle(port, lang), '');
    const up = sim.topo.portUp(device, port.name);
    if (!up) {
      out.push(`${dots(t(lang, { pl: 'Stan nośnika', en: 'Media State' }))}${t(lang, { pl: 'Nośnik odłączony', en: 'Media disconnected' })}`);
      if (all) out.push(`${dots(t(lang, { pl: 'Adres fizyczny', en: 'Physical Address' }))}${formatMacWindows(port.mac)}`);
      out.push('');
      continue;
    }
    if (all) {
      out.push(`${dots(t(lang, { pl: 'Adres fizyczny', en: 'Physical Address' }))}${formatMacWindows(port.mac)}`);
      out.push(`${dots(t(lang, { pl: 'DHCP włączone', en: 'DHCP Enabled' }))}${port.dhcp ? t(lang, { pl: 'Tak', en: 'Yes' }) : t(lang, { pl: 'Nie', en: 'No' })}`);
    }
    if (port.ip) {
      const auto = port.ip.startsWith('169.254.');
      const label = auto
        ? t(lang, { pl: 'Autokonfiguracja adresu IPv4', en: 'Autoconfiguration IPv4 Address' })
        : t(lang, { pl: 'Adres IPv4', en: 'IPv4 Address' });
      out.push(`${dots(label)}${port.ip}`);
      out.push(`${dots(t(lang, { pl: 'Maska podsieci', en: 'Subnet Mask' }))}${ipToStr(prefixToMask(port.prefix))}`);
    }
    out.push(`${dots(t(lang, { pl: 'Brama domyślna', en: 'Default Gateway' }))}${port.gateway}`);
    if (all) {
      if (port.dhcp && port.ip && !port.ip.startsWith('169.254.')) {
        out.push(`${dots(t(lang, { pl: 'Serwer DHCP', en: 'DHCP Server' }))}${port.gateway || '-'}`);
      }
      out.push(`${dots(t(lang, { pl: 'Serwery DNS', en: 'DNS Servers' }))}${port.dns || '-'}`);
    }
    out.push('');
  }
  return out;
}

function resolveTarget(sim: Simulator, device: Device, target: string, lang: Lang, out: string[], verb: Text): number | null {
  const direct = parseIp(target);
  if (direct !== null) return direct;
  const result = sim.resolve(device.id, target);
  if (result.status === 'ok' && result.ip !== null) return result.ip;
  out.push(
    t(lang, {
      pl: `${verb.pl} nie może odnaleźć hosta ${target}. Sprawdź nazwę i spróbuj ponownie.`,
      en: `${verb.en} could not find host ${target}. Please check the name and try again.`,
    }),
  );
  return null;
}

function echoLine(result: EchoResult, target: number, lang: Lang): string {
  const from = result.from !== null ? ipToStr(result.from) : ipToStr(target);
  switch (result.outcome) {
    case 'reply': {
      const time = result.rtt < 1 ? '<1' : `=${Math.round(result.rtt)}`;
      return t(lang, {
        pl: `Odpowiedź z ${from}: bajtów=32 czas${time} ms TTL=${result.ttl}`,
        en: `Reply from ${from}: bytes=32 time${time}ms TTL=${result.ttl}`,
      });
    }
    case 'timeout':
      return t(lang, { pl: 'Upłynął limit czasu żądania.', en: 'Request timed out.' });
    case 'host-unreachable':
      return t(lang, { pl: `Odpowiedź z ${from}: Host docelowy jest nieosiągalny.`, en: `Reply from ${from}: Destination host unreachable.` });
    case 'net-unreachable':
      return t(lang, { pl: `Odpowiedź z ${from}: Sieć docelowa jest nieosiągalna.`, en: `Reply from ${from}: Destination net unreachable.` });
    case 'admin-prohibited':
      return t(lang, { pl: `Odpowiedź z ${from}: Komunikacja zablokowana administracyjnie (ACL).`, en: `Reply from ${from}: Communication administratively prohibited.` });
    case 'ttl-expired':
      return t(lang, { pl: `Odpowiedź z ${from}: Upłynął czas wygaśnięcia TTL podczas przesyłania.`, en: `Reply from ${from}: TTL expired in transit.` });
    case 'no-route':
    case 'no-ip':
      return t(lang, { pl: 'Badanie ping nie powiodło się. Błąd ogólny.', en: 'PING: transmit failed. General failure.' });
  }
}

function ping(sim: Simulator, device: Device, args: string[], lang: Lang): string[] {
  const out: string[] = [];
  let count = 4;
  const targetText = args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '-n');
  const nIndex = args.indexOf('-n');
  if (nIndex >= 0) count = Math.min(20, Math.max(1, Number(args[nIndex + 1]) || 4));
  if (!targetText) return [t(lang, { pl: 'Użycie: ping [-n liczba] cel', en: 'Usage: ping [-n count] target' })];
  const target = resolveTarget(sim, device, targetText, lang, out, { pl: 'Żądanie ping', en: 'Ping request' });
  if (target === null) return out;
  const label = parseIp(targetText) === null ? `${targetText} [${ipToStr(target)}]` : targetText;
  out.push('', t(lang, { pl: `Badanie ${label} z 32 bajtami danych:`, en: `Pinging ${label} with 32 bytes of data:` }));
  let received = 0;
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const result = sim.echo(device.id, target);
    out.push(echoLine(result, target, lang));
    if (result.outcome === 'no-route' || result.outcome === 'no-ip') return out;
    if (result.outcome !== 'timeout') received++;
    if (result.outcome === 'reply') times.push(Math.round(result.rtt));
  }
  const lost = count - received;
  const percent = Math.round((lost / count) * 100);
  out.push(
    '',
    t(lang, { pl: `Statystyka badania ping dla ${ipToStr(target)}:`, en: `Ping statistics for ${ipToStr(target)}:` }),
    t(lang, {
      pl: `    Pakiety: Wysłane = ${count}, Odebrane = ${received}, Utracone = ${lost} (${percent}% straty),`,
      en: `    Packets: Sent = ${count}, Received = ${received}, Lost = ${lost} (${percent}% loss),`,
    }),
  );
  if (times.length) {
    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    out.push(
      t(lang, { pl: 'Szacunkowy czas błądzenia pakietów w milisekundach:', en: 'Approximate round trip times in milli-seconds:' }),
      t(lang, {
        pl: `    Minimum = ${min} ms, Maksimum = ${max} ms, Czas średni = ${avg} ms`,
        en: `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`,
      }),
    );
  }
  return out;
}

function tracert(sim: Simulator, device: Device, targetText: string | undefined, lang: Lang): string[] {
  if (!targetText) return [t(lang, { pl: 'Użycie: tracert cel', en: 'Usage: tracert target' })];
  const out: string[] = [];
  const target = resolveTarget(sim, device, targetText, lang, out, { pl: 'Polecenie tracert', en: 'Tracert' });
  if (target === null) return out;
  out.push('', t(lang, { pl: `Śledzenie trasy do ${ipToStr(target)} przez maksymalnie 30 przeskoków`, en: `Tracing route to ${ipToStr(target)} over a maximum of 30 hops` }), '');
  const hops = sim.traceroute(device.id, target);
  hops.forEach((hop, index) => {
    const n = String(index + 1).padStart(3);
    if (hop.outcome === 'no-route' || hop.outcome === 'no-ip') {
      out.push(t(lang, { pl: 'Błąd ogólny.', en: 'General failure.' }));
      return;
    }
    if (hop.from === null) {
      out.push(`${n}     *        *        *     ${t(lang, { pl: 'Upłynął limit czasu żądania.', en: 'Request timed out.' })}`);
      return;
    }
    const ms = hop.rtt < 1 ? '<1 ms' : `${Math.round(hop.rtt)} ms`;
    const cell = ms.padStart(6);
    let suffix = '';
    if (hop.outcome === 'host-unreachable' || hop.outcome === 'net-unreachable') suffix = t(lang, { pl: ' zgłasza: Sieć docelowa jest nieosiągalna.', en: ' reports: Destination net unreachable.' });
    if (hop.outcome === 'admin-prohibited') suffix = t(lang, { pl: ' zgłasza: Komunikacja zablokowana administracyjnie.', en: ' reports: Communication administratively prohibited.' });
    out.push(`${n}  ${cell}   ${cell}   ${cell}  ${ipToStr(hop.from)}${suffix}`);
  });
  out.push('', t(lang, { pl: 'Śledzenie zakończone.', en: 'Trace complete.' }));
  return out;
}

function nslookup(sim: Simulator, device: Device, name: string | undefined, lang: Lang): string[] {
  const server = sim.dnsServerOf(device);
  const header = [
    `${t(lang, { pl: 'Serwer:', en: 'Server:' })}  UnKnown`,
    `Address:  ${server !== null ? ipToStr(server) : '-'}`,
    '',
  ];
  if (!name) return [...header, t(lang, { pl: 'Użycie: nslookup nazwa', en: 'Usage: nslookup name' })];
  if (server === null) return [t(lang, { pl: 'Brak skonfigurowanego serwera DNS.', en: 'No DNS server configured.' })];
  const result = sim.resolve(device.id, name);
  if (result.status === 'ok' && result.ip !== null) {
    return [...header, t(lang, { pl: 'Odpowiedź niemiarodajna:', en: 'Non-authoritative answer:' }), `${t(lang, { pl: 'Nazwa:', en: 'Name:' })}    ${name}`, `Address:  ${ipToStr(result.ip)}`];
  }
  if (result.status === 'nxdomain') return [...header, `*** UnKnown ${t(lang, { pl: 'nie może odnaleźć', en: "can't find" })} ${name}: Non-existent domain`];
  return [`DNS request timed out.`, '    timeout was 2 seconds.', `*** ${t(lang, { pl: 'Upłynął limit czasu żądania do serwera', en: 'Request to server timed-out' })}`];
}

function arp(sim: Simulator, device: Device, args: string[], lang: Lang): string[] {
  if (args[0] === '-d') {
    sim.clearArp(device);
    return [];
  }
  const entries = sim.arpTable(device);
  const out: string[] = [];
  for (const port of device.ports) {
    if (!port.ip) continue;
    const mine = entries.filter((e) => e.ifName === port.name);
    out.push('', `${t(lang, { pl: 'Interfejs', en: 'Interface' })}: ${port.ip} --- 0x${(device.ports.indexOf(port) + 3).toString(16)}`);
    out.push(`  ${t(lang, { pl: 'Adres internetowy', en: 'Internet Address' }).padEnd(22)}${t(lang, { pl: 'Adres fizyczny', en: 'Physical Address' }).padEnd(22)}${t(lang, { pl: 'Typ', en: 'Type' })}`);
    for (const entry of mine) {
      out.push(`  ${ipToStr(entry.ip).padEnd(22)}${formatMacWindows(entry.mac).toLowerCase().padEnd(22)}${t(lang, { pl: 'dynamiczne', en: 'dynamic' })}`);
    }
  }
  if (!out.length) return [t(lang, { pl: 'Nie znaleziono wpisów ARP.', en: 'No ARP Entries Found.' })];
  return out;
}

function curl(sim: Simulator, device: Device, url: string | undefined, lang: Lang): string[] {
  if (!url) return ['curl: try \'curl --help\' for more information'];
  const result = sim.http(device.id, url);
  if (result.status === 'dns-failed') return [`curl: (6) Could not resolve host: ${url.replace(/^https?:\/\//, '').split('/')[0]}`];
  if (result.status === 'refused') return [`curl: (7) Failed to connect: ${t(lang, { pl: 'połączenie odrzucone', en: 'Connection refused' })}`];
  if (result.status === 'timeout') return ['curl: (28) Connection timed out after 10000 milliseconds'];
  return ['<!doctype html>', `<html><head><title>${result.title}</title></head>`, `<body><h1>${result.title}</h1><p>${result.body}</p></body></html>`];
}

function ipAddr(device: Device): string[] {
  const out = ['1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536', '    inet 127.0.0.1/8 scope host lo'];
  device.ports.forEach((port, index) => {
    out.push(`${index + 2}: ${port.name}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500`);
    out.push(`    link/ether ${port.mac.match(/.{2}/g)!.join(':')} brd ff:ff:ff:ff:ff:ff`);
    if (port.ip) out.push(`    inet ${port.ip}/${port.prefix} scope global ${port.dhcp ? 'dynamic ' : ''}${port.name}`);
  });
  return out;
}

function ipRoute(sim: Simulator, device: Device): string[] {
  return sim.topo.routes(device).map((route) => {
    if (route.isDefault && route.via !== null) return `default via ${ipToStr(route.via)} dev ${route.ifName}`;
    return `${ipToStr(route.net)}/${route.prefix} dev ${route.ifName} scope link`;
  });
}

const HELP: Text[] = [
  { pl: 'ipconfig [/all | /renew | /release]  ustawienia IP karty sieciowej', en: 'ipconfig [/all | /renew | /release]  network adapter IP settings' },
  { pl: 'ping [-n liczba] cel                  test łączności (ICMP)', en: 'ping [-n count] target                connectivity test (ICMP)' },
  { pl: 'tracert cel                           trasa pakietów do celu', en: 'tracert target                        route packets take to the target' },
  { pl: 'nslookup nazwa                        zapytanie do serwera DNS', en: 'nslookup name                         query the DNS server' },
  { pl: 'arp -a | -d                           tablica ARP (IP do MAC)', en: 'arp -a | -d                           ARP table (IP to MAC)' },
  { pl: 'curl adres                            pobranie strony WWW', en: 'curl url                              fetch a web page' },
  { pl: 'ssh -l użytkownik adres               zdalne logowanie SSH', en: 'ssh -l user address                   remote SSH login' },
  { pl: 'telnet adres                          zdalne logowanie Telnet (nieszyfrowane)', en: 'telnet address                        remote Telnet login (unencrypted)' },
  { pl: 'ip a | ip r                           adresy i trasy w stylu Linuksa', en: 'ip a | ip r                           Linux-style addresses and routes' },
  { pl: 'getmac, hostname, cls                 adres MAC, nazwa, czyszczenie ekranu', en: 'getmac, hostname, cls                 MAC address, name, clear screen' },
];

function startRemote(sim: Simulator, session: HostSession, device: Device, kind: 'ssh' | 'telnet', user: string, targetText: string, lang: Lang): string[] {
  const out: string[] = [];
  const target = resolveTarget(sim, device, targetText, lang, out, { pl: kind === 'ssh' ? 'Polecenie ssh' : 'Polecenie telnet', en: kind });
  if (target === null) return out;
  out.push(t(lang, { pl: `Łączenie z ${ipToStr(target)}...`, en: `Trying ${ipToStr(target)} ...` }));
  const port = kind === 'ssh' ? 22 : 23;
  const result = sim.connect(device.id, target, port);
  if (result !== 'open') {
    out.push(
      result === 'refused'
        ? t(lang, { pl: `% Połączenie odrzucone przez zdalny host (port ${port})`, en: `% Connection refused by remote host (port ${port})` })
        : t(lang, { pl: '% Przekroczono czas połączenia', en: '% Connection timed out; remote host not responding' }),
    );
    return out;
  }
  const remote = sim.net.devices.find((d) => sim.topo.l3Ifs(d).some((e) => e.ip === target && e.up));
  if (!remote) return [...out, '% Connection closed'];
  const m = remote.mgmt;
  if (kind === 'ssh' && (m.vtyLogin !== 'local' || !m.users.length)) {
    out.push(t(lang, { pl: '% Uwierzytelnianie nie powiodło się: router nie ma kont lokalnych (login local).', en: '% Authentication failed: no local accounts configured (login local).' }), '[Connection closed]');
    return out;
  }
  if (kind === 'telnet' && !m.vtyLogin) {
    out.push('', 'Password required, but none set', '', `[${t(lang, { pl: 'Połączenie zamknięte przez zdalny host', en: 'Connection to remote host closed by foreign host' })}]`);
    return out;
  }
  if (kind === 'ssh' && !m.users.some((u) => u.name === user)) {
    out.push(t(lang, { pl: `Brak użytkownika ${user}. Dostęp zabroniony.`, en: `Unknown user ${user}. Permission denied.` }), '[Connection closed]');
    return out;
  }
  session.remote = { targetId: remote.id, kind, user, stage: 'password', cli: newSession(remote.id) };
  if (remote.banner) out.push('', remote.banner, '');
  out.push(kind === 'ssh' ? `${user}@${ipToStr(target)}'s password: ` : 'Password: ');
  return out;
}

function remoteInput(sim: Simulator, session: HostSession, input: string, lang: Lang): HostResult {
  const remote = session.remote!;
  const target = sim.topo.device(remote.targetId);
  if (!target) {
    session.remote = null;
    return { lines: ['[Connection closed]'], changed: false, clear: false, secret: false };
  }
  if (remote.stage === 'password') {
    const m = target.mgmt;
    const ok = remote.kind === 'ssh' ? m.users.some((u) => u.name === remote.user && u.secret === fakeHash(input)) : input === m.vtyPassword || (m.vtyLogin === 'local' && m.users.some((u) => u.secret === fakeHash(input)));
    if (!ok) {
      session.remote = null;
      return { lines: ['% Authentication failed', `[${t(lang, { pl: 'Połączenie zamknięte', en: 'Connection closed' })}]`], changed: false, clear: false, secret: false };
    }
    remote.stage = 'cli';
    return { lines: [''], changed: false, clear: false, secret: false };
  }
  const trimmed = input.trim().toLowerCase();
  if ((trimmed === 'exit' || trimmed === 'logout') && (remote.cli.mode === 'user' || remote.cli.mode === 'priv')) {
    session.remote = null;
    return { lines: [`[${t(lang, { pl: 'Połączenie z hostem zamknięte', en: 'Connection to host closed by foreign host' })}]`], changed: false, clear: false, secret: false };
  }
  const result = cliExecute(sim, remote.cli, input);
  return { lines: result.lines, changed: result.changed, clear: false, secret: result.secret };
}

export function hostExecute(sim: Simulator, session: HostSession, input: string, lang: Lang): HostResult {
  if (session.remote) return remoteInput(sim, session, input, lang);
  const device = sim.topo.device(session.deviceId)!;
  const line = input.trim();
  const done = (lines: string[], changed = false): HostResult => ({ lines, changed, clear: false, secret: Boolean(session.remote && session.remote.stage === 'password') });
  if (!line) return done([]);
  session.history.push(line);
  const [command, ...args] = line.split(/\s+/);
  const lower = command.toLowerCase();
  switch (lower) {
    case 'help':
    case '?':
      return done(HELP.map((h) => t(lang, h)));
    case 'ipconfig': {
      const flag = (args[0] ?? '').toLowerCase();
      if (flag === '/release') {
        sim.dhcpRelease(device.id);
        return done(ipconfig(sim, device, lang, false), true);
      }
      if (flag === '/renew') {
        const port = device.ports.find((p) => p.dhcp && sim.topo.portUp(device, p.name));
        if (!port) return done([t(lang, { pl: 'Żadna karta z włączonym DHCP nie jest podłączona.', en: 'No connected adapter has DHCP enabled.' })]);
        const result = sim.dhcpRenew(device.id, port.name);
        const lines = result.ok
          ? ipconfig(sim, device, lang, false)
          : [t(lang, { pl: 'Podczas odnawiania interfejsu wystąpił błąd: nie można skontaktować się z serwerem DHCP. Upłynął limit czasu żądania.', en: 'An error occurred while renewing interface: unable to contact your DHCP server. Request has timed out.' }), ...ipconfig(sim, device, lang, false)];
        return done(lines, true);
      }
      return done(ipconfig(sim, device, lang, flag === '/all'));
    }
    case 'ping':
      return done(ping(sim, device, args, lang));
    case 'tracert':
    case 'traceroute':
      return done(tracert(sim, device, args.find((a) => !a.startsWith('-')), lang));
    case 'nslookup':
      return done(nslookup(sim, device, args[0], lang));
    case 'arp':
      return done(arp(sim, device, args, lang));
    case 'curl':
      return done(curl(sim, device, args.find((a) => !a.startsWith('-')), lang));
    case 'getmac':
      return done(device.ports.map((p) => `${formatMacWindows(p.mac)}   ${p.name}`));
    case 'hostname':
      return done([device.name]);
    case 'cls':
    case 'clear':
      return { lines: [], changed: false, clear: true, secret: false };
    case 'ip': {
      const sub = (args[0] ?? '').toLowerCase();
      if (sub.startsWith('a')) return done(ipAddr(device));
      if (sub.startsWith('r')) return done(ipRoute(sim, device));
      return done(['Usage: ip [ addr | route ]']);
    }
    case 'ssh': {
      let user = '';
      let target = '';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-l') user = args[++i] ?? '';
        else if (args[i].includes('@')) [user, target] = args[i].split('@');
        else target = args[i];
      }
      if (!user || !target) return done([t(lang, { pl: 'Użycie: ssh -l użytkownik adres  albo  ssh użytkownik@adres', en: 'Usage: ssh -l user address  or  ssh user@address' })]);
      const lines = startRemote(sim, session, device, 'ssh', user, target, lang);
      return { lines, changed: false, clear: false, secret: Boolean(session.remote) };
    }
    case 'telnet': {
      if (!args[0]) return done([t(lang, { pl: 'Użycie: telnet adres', en: 'Usage: telnet address' })]);
      const lines = startRemote(sim, session, device, 'telnet', '', args[0], lang);
      return { lines, changed: false, clear: false, secret: Boolean(session.remote) };
    }
    default:
      return done([
        t(lang, {
          pl: `„${command}” nie jest rozpoznawane jako polecenie. Wpisz help, aby zobaczyć listę.`,
          en: `'${command}' is not recognized as a command. Type help to see the list.`,
        }),
      ]);
  }
}
