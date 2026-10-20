import type { Lang } from '../i18n/l10n';
import { formatMacColon } from './ip';
import type { Explain } from './types';

const TEXT: Record<string, { pl: string; en: string }> = {
  'acl.deny': {
    pl: 'Lista ACL {acl} ({dir}) na {iface} odrzuca ten pakiet. Router odsyła informację, że komunikacja jest zablokowana.',
    en: 'ACL {acl} ({dir}) on {iface} denies this packet. The router reports that communication is administratively prohibited.',
  },
  'arp.notForMe': { pl: 'Zapytanie ARP dotyczy adresu {ip}, który nie należy do tego urządzenia, więc je ignoruje.', en: 'The ARP request asks for {ip}, which is not this device, so it is ignored.' },
  'arp.proxy': { pl: 'Router zna trasę do {ip} przez inny interfejs, więc odpowiada własnym MAC (proxy ARP).', en: 'The router knows a route to {ip} through another interface, so it answers with its own MAC (proxy ARP).' },
  'arp.queueAndAsk': {
    pl: 'Urządzenie nie zna adresu MAC dla {ip}. Wstrzymuje pakiet i wysyła rozgłoszeniowe zapytanie ARP: „kto ma {ip}?”.',
    en: 'The device does not know the MAC address of {ip}. It holds the packet and broadcasts an ARP request: "who has {ip}?".',
  },
  'arp.replyLearned': { pl: 'Odpowiedź ARP: {ip} ma adres MAC {mac}. Wpis trafia do tablicy ARP.', en: 'ARP reply: {ip} is at {mac}. The entry goes into the ARP table.' },
  'arp.requestForMe': { pl: 'Zapytanie ARP dotyczy mojego adresu {ip}. Odpowiadam swoim adresem MAC {mac}.', en: 'The ARP request is for my address {ip}. I reply with my MAC {mac}.' },
  'arp.routerDrop': {
    pl: 'Router nie zna adresu MAC następnego skoku {ip}. Wysyła zapytanie ARP i odrzuca ten pakiet, dlatego pierwszy ping często ginie.',
    en: 'The router does not know the MAC of next hop {ip}. It sends an ARP request and drops this packet, which is why the first ping often fails.',
  },
  'dev.unpowered': { pl: 'Urządzenie nie ma zasilania. Wymaga PoE, a port po drugiej stronie go nie dostarcza.', en: 'The device has no power. It needs PoE and the port on the other end does not provide it.' },
  'dhcp.ack': { pl: 'Serwer DHCP potwierdza dzierżawę adresu {ip} (DHCPACK).', en: 'The DHCP server confirms the lease of {ip} (DHCPACK).' },
  'dhcp.bound': { pl: 'Klient konfiguruje kartę: adres {ip}/{prefix}, brama i DNS z serwera.', en: 'The client configures its adapter: address {ip}/{prefix}, gateway and DNS from the server.' },
  'dhcp.discover': { pl: 'Klient nie ma adresu, więc rozgłasza DHCPDISCOVER: „czy jest tu serwer DHCP?”.', en: 'The client has no address, so it broadcasts DHCPDISCOVER: "is there a DHCP server here?".' },
  'dhcp.exhausted': { pl: 'Pula {pool} nie ma wolnych adresów.', en: 'Pool {pool} has no free addresses.' },
  'dhcp.extraOffer': { pl: 'Klient przyjął już inną ofertę i ignoruje tę.', en: 'The client already accepted another offer and ignores this one.' },
  'dhcp.gotOffer': { pl: 'Klient dostaje ofertę adresu {ip} i rozgłasza DHCPREQUEST, żeby ją przyjąć.', en: 'The client receives an offer of {ip} and broadcasts DHCPREQUEST to accept it.' },
  'dhcp.noPool': { pl: 'Serwer DHCP nie ma puli pasującej do tej sieci.', en: 'The DHCP server has no pool that matches this network.' },
  'dhcp.noServer': { pl: 'To urządzenie nie jest serwerem DHCP, więc ignoruje zapytanie.', en: 'This device is not a DHCP server, so it ignores the request.' },
  'dhcp.notForMe': { pl: 'Komunikat DHCP nie jest skierowany do tego urządzenia.', en: 'The DHCP message is not addressed to this device.' },
  'dhcp.notMine': { pl: 'Odpowiedź DHCP jest dla innego klienta, więc ją ignoruję.', en: 'The DHCP reply is for another client, so I ignore it.' },
  'dhcp.offer': { pl: 'Serwer DHCP proponuje adres {ip} z puli {pool} (DHCPOFFER).', en: 'The DHCP server offers {ip} from pool {pool} (DHCPOFFER).' },
  'dhcp.otherServer': { pl: 'Klient wybrał ofertę innego serwera.', en: 'The client chose another server’s offer.' },
  'dhcp.relay': {
    pl: 'Interfejs ma ustawiony przekaźnik DHCP (ip helper-address). Router przesyła zapytanie do serwera {server} i wpisuje swój adres {giaddr}, żeby serwer wiedział, z jakiej sieci przyszło.',
    en: 'The interface has a DHCP relay (ip helper-address). The router forwards the request to server {server} and adds its address {giaddr} so the server knows which network it came from.',
  },
  'dhcp.relayToClient': { pl: 'Router przekazuje odpowiedź serwera DHCP do klienta przez {iface}.', en: 'The router forwards the DHCP server reply to the client via {iface}.' },
  'dhcp.relayUnknown': { pl: 'Router nie pamięta, dla kogo przekazywał to zapytanie.', en: 'The router does not remember who this relayed request was for.' },
  'dns.answer': { pl: 'Serwer DNS zna nazwę {name}: to adres {ip}.', en: 'The DNS server knows {name}: it is {ip}.' },
  'dns.delivered': { pl: 'Klient dostaje odpowiedź DNS dla {name}.', en: 'The client receives the DNS answer for {name}.' },
  'dns.forward': { pl: 'Serwer DNS nie zna nazwy {name}, więc pyta swój serwer nadrzędny {server} (przekazywanie zapytań).', en: 'The DNS server does not know {name}, so it asks its upstream server {server} (forwarding).' },
  'dns.forwardReply': { pl: 'Serwer DNS dostał odpowiedź z góry dla {name} i odsyła ją klientowi.', en: 'The DNS server got the upstream answer for {name} and passes it to the client.' },
  'dns.noService': { pl: 'Usługa DNS nie jest włączona na tym urządzeniu.', en: 'The DNS service is not enabled on this device.' },
  'dns.nxdomain': { pl: 'Serwer DNS nie zna nazwy {name} (NXDOMAIN).', en: 'The DNS server does not know {name} (NXDOMAIN).' },
  'dns.query': { pl: 'Klient pyta serwer DNS {server} o adres nazwy {name}.', en: 'The client asks DNS server {server} for the address of {name}.' },
  'fw.allow': { pl: 'Reguła zapory „{rule}” zezwala na ruch. Zapora zapamiętuje sesję, żeby wpuścić odpowiedź.', en: 'Firewall rule "{rule}" allows the traffic. The firewall remembers the session to let the reply back in.' },
  'fw.default': { pl: 'Żadna reguła nie pasuje. Zapora domyślnie blokuje ruch między strefami.', en: 'No rule matches. By default the firewall blocks traffic between zones.' },
  'fw.deny': { pl: 'Zapora blokuje ruch ze strefy {from} do strefy {to}.', en: 'The firewall blocks traffic from zone {from} to zone {to}.' },
  'fw.intrazone': { pl: 'Ruch w obrębie strefy {zone} jest dozwolony.', en: 'Traffic within zone {zone} is allowed.' },
  'fw.related': { pl: 'Komunikat błędu ICMP związany z istniejącym ruchem jest przepuszczany.', en: 'An ICMP error related to existing traffic is allowed.' },
  'fw.ruleDeny': { pl: 'Reguła zapory „{rule}” blokuje ten ruch.', en: 'Firewall rule "{rule}" blocks this traffic.' },
  'fw.session': { pl: 'To odpowiedź w ramach znanej sesji, więc zapora stanowa ją przepuszcza.', en: 'This is a reply within a known session, so the stateful firewall lets it through.' },
  'host.notForMe': { pl: 'Pakiet jest dla {ip}, a host nie przekazuje cudzych pakietów, więc go odrzuca.', en: 'The packet is for {ip} and a host does not forward other people’s packets, so it drops it.' },
  'http.received': { pl: 'Przeglądarka dostaje odpowiedź HTTP {code} ze stroną.', en: 'The browser receives HTTP {code} with the page.' },
  'http.respond': { pl: 'Serwer WWW odsyła stronę {host} (HTTP {code}).', en: 'The web server sends back the page {host} (HTTP {code}).' },
  'icmp.create': { pl: 'Tworzę żądanie echa ICMP do {dst}.', en: 'Creating an ICMP echo request to {dst}.' },
  'icmp.delivered': { pl: 'Odpowiedź ICMP ({type}) trafia do programu, który wysłał zapytanie.', en: 'The ICMP reply ({type}) reaches the program that sent the request.' },
  'icmp.echoReply': { pl: 'Żądanie echa dotarło do celu. Odsyłam odpowiedź echa do {ip}.', en: 'The echo request reached its destination. Sending an echo reply to {ip}.' },
  'icmp.ignoreBroadcast': { pl: 'Urządzenie nie odpowiada na ping wysłany rozgłoszeniowo.', en: 'The device does not answer a broadcast ping.' },
  'ip.forwardConnected': { pl: 'Cel jest w sieci bezpośrednio podłączonej {net}. Wysyłam przez {iface}.', en: 'The destination is in directly connected network {net}. Sending out {iface}.' },
  'ip.forwardVia': {
    pl: 'Tablica routingu: najlepsze dopasowanie to {net} (trasa {code}). Następny skok {via}, interfejs {iface}. TTL zmniejszony o 1.',
    en: 'Routing table: best match is {net} ({code} route). Next hop {via}, interface {iface}. TTL decreased by 1.',
  },
  'ip.noAddress': { pl: 'Urządzenie nie ma adresu IP na żadnym aktywnym interfejsie.', en: 'The device has no IP address on any active interface.' },
  'ip.noApp': { pl: 'Na urządzeniu nie działa usługa, do której skierowano pakiet.', en: 'No service on this device handles this packet.' },
  'ip.noRoute': { pl: 'Brak trasy do {ip}. Router odrzuca pakiet i odsyła informację, że sieć jest nieosiągalna.', en: 'No route to {ip}. The router drops the packet and reports that the network is unreachable.' },
  'ip.noRouteLocal': { pl: 'Brak trasy do {ip}: cel nie jest w mojej sieci, a brama domyślna nie jest ustawiona.', en: 'No route to {ip}: the target is not in my network and no default gateway is set.' },
  'ip.notRouting': { pl: 'To urządzenie nie ma włączonego routingu, więc nie przekazuje pakietów do innych sieci.', en: 'This device has routing disabled, so it does not forward packets to other networks.' },
  'ip.originate': { pl: 'Cel {dst} jest w mojej sieci. Wysyłam bezpośrednio przez {iface}.', en: 'Target {dst} is in my network. Sending directly out {iface}.' },
  'ip.originateGateway': { pl: 'Cel {dst} jest w innej sieci, więc wysyłam pakiet do bramy domyślnej {via}.', en: 'Target {dst} is in another network, so I send the packet to the default gateway {via}.' },
  'ip.replyNoRoute': { pl: 'Nie umiem odesłać odpowiedzi do {ip}: brak trasy powrotnej.', en: 'I cannot send the reply to {ip}: there is no return route.' },
  'ip.sendQueued': { pl: 'Znam już MAC, więc wysyłam wstrzymany pakiet do {ip}.', en: 'Now I know the MAC, so I send the held packet to {ip}.' },
  'ip.ttlExpired': { pl: 'TTL spadł do zera. Router odrzuca pakiet i odsyła komunikat „czas przekroczony” (tak działa traceroute).', en: 'TTL reached zero. The router drops the packet and returns "time exceeded" (this is how traceroute works).' },
  'l2.filter': { pl: 'Adres {mac} jest za portem, z którego ramka przyszła, więc przełącznik jej nie przesyła dalej.', en: 'Address {mac} is behind the port the frame came from, so the switch does not forward it.' },
  'l2.floodBroadcast': { pl: 'Ramka rozgłoszeniowa: przełącznik wysyła ją do wszystkich portów w VLAN {vlan} poza wejściowym ({count}).', en: 'Broadcast frame: the switch sends it out every port in VLAN {vlan} except the incoming one ({count}).' },
  'l2.floodUnknown': { pl: 'Przełącznik nie zna {mac} w VLAN {vlan}, więc zalewa ramką pozostałe porty ({count}).', en: 'The switch does not know {mac} in VLAN {vlan}, so it floods the frame to the other ports ({count}).' },
  'l2.forwardKnown': { pl: 'Tablica MAC: {mac} jest za portem {port}. Przełącznik wysyła ramkę tylko tam.', en: 'MAC table: {mac} is behind port {port}. The switch sends the frame only there.' },
  'l2.learn': { pl: 'Przełącznik uczy się: {mac} jest za portem {port} (VLAN {vlan}).', en: 'The switch learns: {mac} is behind port {port} (VLAN {vlan}).' },
  'l2.noPorts': { pl: 'W VLAN {vlan} nie ma innych aktywnych portów.', en: 'There are no other active ports in VLAN {vlan}.' },
  'l2.noSvi': { pl: 'Ramka jest do przełącznika, ale nie ma on interfejsu VLAN {vlan}.', en: 'The frame is for the switch, but it has no VLAN {vlan} interface.' },
  'l2.taggedOnAccess': {
    pl: 'Port {port} jest dostępowy, a ramka ma tag VLAN {vlan}. Ramka zostaje odrzucona. Sprawdź, czy obie strony łącza są trunkiem.',
    en: 'Port {port} is an access port, but the frame carries VLAN tag {vlan}. The frame is dropped. Check that both ends of the link are trunks.',
  },
  'l2.vlanMissing': { pl: 'VLAN {vlan} nie istnieje na tym przełączniku, więc ramka jest odrzucana.', en: 'VLAN {vlan} does not exist on this switch, so the frame is dropped.' },
  'l2.vlanNotAllowed': { pl: 'VLAN {vlan} nie jest dozwolony na trunku {port}.', en: 'VLAN {vlan} is not allowed on trunk {port}.' },
  'l3.ifDown': { pl: 'Interfejs {iface} jest wyłączony lub nieaktywny.', en: 'Interface {iface} is down.' },
  'l3.noIf': { pl: 'Port nie ma konfiguracji IP.', en: 'The port has no IP configuration.' },
  'l3.noSubif': { pl: 'Router dostał ramkę z tagiem VLAN {vlan} na {port}, ale nie ma podinterfejsu dla tego VLAN-u.', en: 'The router got a frame tagged VLAN {vlan} on {port} but has no subinterface for that VLAN.' },
  'l3.notMyMac': { pl: 'Ramka jest zaadresowana do {mac}, nie do mnie, więc ją odrzucam.', en: 'The frame is addressed to {mac}, not to me, so I drop it.' },
  'nat.pat': { pl: 'NAT (PAT): zamieniam adres źródłowy {from} na publiczny {to}.', en: 'NAT (PAT): translating source {from} to public {to}.' },
  'nat.patIn': { pl: 'NAT: odpowiedź na {from} należy do {to}. Zamieniam adres docelowy z powrotem.', en: 'NAT: the reply to {from} belongs to {to}. Translating the destination back.' },
  'nat.static': { pl: 'Statyczny NAT: adres {from} wychodzi jako {to}.', en: 'Static NAT: {from} goes out as {to}.' },
  'nat.staticIn': { pl: 'Statyczny NAT: ruch do {from} kieruję do serwera {to}.', en: 'Static NAT: traffic to {from} goes to server {to}.' },
  'port.down': { pl: 'Port {port} jest wyłączony albo druga strona łącza nie działa. Nic nie zostaje wysłane.', en: 'Port {port} is down or the other end is not working. Nothing is sent.' },
  'port.noCable': { pl: 'Do portu {port} nie podłączono kabla.', en: 'No cable is connected to port {port}.' },
  'port.unknown': { pl: 'Nieznany port.', en: 'Unknown port.' },
  'fhrp.arpReply': {
    pl: 'Ten router jest aktywną bramą {proto} w grupie {group}. Odpowiada na ARP o wirtualny adres {ip} wirtualnym MAC {mac}.',
    en: 'This router is the active {proto} gateway in group {group}. It answers ARP for virtual address {ip} with virtual MAC {mac}.',
  },
  'lacp.inactive': {
    pl: 'Port {port} należy do kanału EtherChannel, ale nie przenosi teraz ruchu, więc ramka jest odrzucana.',
    en: 'Port {port} belongs to an EtherChannel but does not carry traffic right now, so the frame is dropped.',
  },
  'psec.learn': { pl: 'Port security: {mac} zostaje zapamiętany jako bezpieczny adres portu {port}.', en: 'Port security: {mac} is remembered as a secure address on port {port}.' },
  'psec.sticky': {
    pl: 'Port security (sticky): {mac} trafia do konfiguracji portu {port} i zostanie tam także po restarcie.',
    en: 'Port security (sticky): {mac} is written into the configuration of port {port} and survives a restart.',
  },
  'psec.shutdown': {
    pl: 'Naruszenie port security: {mac} przekracza limit {max} adresów na {port}. Port przechodzi w stan err-disabled i przestaje działać.',
    en: 'Port security violation: {mac} exceeds the limit of {max} addresses on {port}. The port goes err-disabled and stops working.',
  },
  'psec.restrict': {
    pl: 'Naruszenie port security na {port}: ramka od {mac} jest odrzucana, a licznik naruszeń rośnie. Port działa dalej.',
    en: 'Port security violation on {port}: the frame from {mac} is dropped and the violation counter grows. The port keeps working.',
  },
  'psec.protect': { pl: 'Port security na {port}: ramka od nieznanego {mac} jest po cichu odrzucana.', en: 'Port security on {port}: the frame from unknown {mac} is silently dropped.' },
  'snoop.binding': { pl: 'DHCP snooping zapisuje powiązanie: {mac} dostał adres {ip}.', en: 'DHCP snooping records a binding: {mac} received address {ip}.' },
  'snoop.untrusted': {
    pl: 'DHCP snooping: {op} przyszedł z niezaufanego portu {port}. Za tym portem nie powinno być serwera DHCP, więc przełącznik odrzuca odpowiedź.',
    en: 'DHCP snooping: {op} arrived on untrusted port {port}. No DHCP server should be behind this port, so the switch drops the reply.',
  },
  'stp.blocked': { pl: 'Port {port} jest zablokowany przez STP, żeby nie powstała pętla. Ramka zostaje odrzucona.', en: 'Port {port} is blocked by STP to prevent a loop. The frame is dropped.' },
  'tcp.connected': { pl: 'Połączenie TCP nawiązane (port {port}).', en: 'TCP connection established (port {port}).' },
  'tcp.noSocket': { pl: 'Brak programu czekającego na ten segment TCP.', en: 'No program is waiting for this TCP segment.' },
  'tcp.refused': { pl: 'Na porcie {port} nic nie nasłuchuje. Serwer odpowiada RST (połączenie odrzucone).', en: 'Nothing listens on port {port}. The server answers with RST (connection refused).' },
  'tcp.rstReceived': { pl: 'Klient dostaje RST: połączenie odrzucone.', en: 'The client receives RST: connection refused.' },
  'tcp.sendRequest': { pl: 'Uzgadnianie TCP zakończone (SYN, SYN-ACK, ACK). Przeglądarka wysyła żądanie HTTP do {host}.', en: 'TCP handshake complete (SYN, SYN-ACK, ACK). The browser sends an HTTP request to {host}.' },
  'tcp.syn': { pl: 'Otwieram połączenie TCP z {host}:{port} (SYN).', en: 'Opening a TCP connection to {host}:{port} (SYN).' },
  'tcp.synAck': { pl: 'Serwer nasłuchuje na porcie {port} i odpowiada SYN-ACK.', en: 'The server listens on port {port} and answers SYN-ACK.' },
};

export function explain(entry: Explain, lang: Lang): string {
  const template = TEXT[entry.key]?.[lang] ?? entry.key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = entry.params?.[name];
    if (value === undefined) return '';
    if (name === 'mac' && typeof value === 'string' && /^[0-9a-f]{12}$/.test(value)) return formatMacColon(value);
    if (name === 'dir') return lang === 'pl' ? (value === 'in' ? 'wejście' : 'wyjście') : String(value);
    return String(value);
  });
}

export function hasExplanation(key: string): boolean {
  return key in TEXT;
}
