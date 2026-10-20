export type DeviceKind =
  | 'router'
  | 'homeRouter'
  | 'switch'
  | 'l3switch'
  | 'firewall'
  | 'ap'
  | 'internet'
  | 'pc'
  | 'laptop'
  | 'phone'
  | 'server'
  | 'printer'
  | 'camera'
  | 'voip';

export type PortMedia = 'copper' | 'fiber' | 'wireless';
export type CableType = 'copper' | 'fiber';
export type NatRole = '' | 'inside' | 'outside';

export type FhrpProto = 'vrrp' | 'hsrp';

export interface FhrpGroup {
  proto: FhrpProto;
  group: number;
  ip: string;
  priority: number;
  preempt: boolean;
}

export interface L3Config {
  ip: string;
  prefix: number;
  helper: string;
  nat: NatRole;
  aclIn: string;
  aclOut: string;
  ospfCost: number;
  fhrp: FhrpGroup | null;
}

export type ViolationMode = 'shutdown' | 'restrict' | 'protect';
export type ChannelMode = '' | 'active' | 'passive' | 'on';

export interface PortSecurity {
  enabled: boolean;
  maximum: number;
  violation: ViolationMode;
  sticky: boolean;
  macs: string[];
  stickyMacs: string[];
}

export interface Port extends L3Config {
  name: string;
  short: string;
  media: PortMedia;
  speed: number;
  poe: boolean;
  mac: string;
  shutdown: boolean;
  description: string;
  switchport: boolean;
  mode: 'access' | 'trunk';
  accessVlan: number;
  nativeVlan: number;
  allowedVlans: string;
  dhcp: boolean;
  gateway: string;
  dns: string;
  zone: string;
  portSecurity: PortSecurity;
  errDisabled: boolean;
  dhcpTrust: boolean;
  channelGroup: number;
  channelMode: ChannelMode;
}

export interface VirtualIf extends L3Config {
  name: string;
  kind: 'sub' | 'svi' | 'loop';
  parent: string;
  vlan: number;
  shutdown: boolean;
  description: string;
}

export interface StaticRoute {
  net: string;
  prefix: number;
  via: string;
  iface: string;
  ad: number;
}

export interface DhcpPool {
  name: string;
  network: string;
  prefix: number;
  router: string;
  dns: string;
  domain: string;
}

export interface DhcpBinding {
  mac: string;
  ip: string;
  pool: string;
}

export interface DnsRecord {
  name: string;
  type: 'A' | 'CNAME';
  value: string;
}

export interface AddrSpec {
  any: boolean;
  ip: string;
  wildcard: string;
}

export interface PortMatch {
  op: 'eq' | 'gt' | 'lt' | 'neq' | 'range';
  a: number;
  b: number;
}

export interface AclEntry {
  action: 'permit' | 'deny';
  proto: 'ip' | 'icmp' | 'tcp' | 'udp';
  src: AddrSpec;
  dst: AddrSpec;
  srcPort: PortMatch | null;
  dstPort: PortMatch | null;
  icmpType: '' | 'echo' | 'echo-reply' | 'unreachable' | 'time-exceeded';
  remark: string;
}

export interface Acl {
  name: string;
  type: 'standard' | 'extended';
  entries: AclEntry[];
}

export type NatRule =
  | { kind: 'pat'; acl: string; iface: string }
  | { kind: 'static'; inside: string; outside: string };

export interface OspfNetwork {
  net: string;
  wildcard: string;
  area: number;
}

export interface OspfConfig {
  processId: number;
  routerId: string;
  networks: OspfNetwork[];
  passive: string[];
  refBw: number;
  defaultOriginate: boolean;
}

export interface WifiConfig {
  ssid: string;
  security: 'wpa3' | 'wpa2' | 'open';
  key: string;
  band: '2.4' | '5' | '6';
  vlan: number;
}

export interface WifiClientConfig {
  ssid: string;
  key: string;
}

export interface FwRule {
  name: string;
  from: string;
  to: string;
  proto: 'any' | 'icmp' | 'tcp' | 'udp';
  port: number;
  dst: string;
  action: 'allow' | 'deny';
}

export interface Device {
  id: string;
  kind: DeviceKind;
  model: string;
  name: string;
  x: number;
  y: number;
  baseMac: string;
  ports: Port[];
  vifs: VirtualIf[];
  vlans: { id: number; name: string }[];
  ipRouting: boolean;
  routes: StaticRoute[];
  defaultGateway: string;
  dhcpPools: DhcpPool[];
  dhcpExcluded: { from: string; to: string }[];
  dhcpBindings: DhcpBinding[];
  dnsRecords: DnsRecord[];
  services: { dhcp: boolean; dns: boolean; http: boolean };
  web: { title: string; body: string };
  ospf: OspfConfig | null;
  acls: Acl[];
  nat: NatRule[];
  wifi: WifiConfig | null;
  wifiClient: WifiClientConfig | null;
  fwRules: FwRule[];
  stpPriority: number;
  dhcpSnooping: { enabled: boolean; vlans: number[] };
  banner: string;
  mgmt: MgmtConfig;
  startup: string;
}

export interface MgmtConfig {
  enableSecret: string;
  users: { name: string; secret: string }[];
  domain: string;
  sshKeys: boolean;
  sshV2: boolean;
  vtyTransport: 'ssh' | 'telnet' | 'all' | 'none' | '';
  vtyLogin: 'local' | 'password' | '';
  vtyPassword: string;
  consolePassword: string;
  consoleLogin: boolean;
  execTimeout: number;
  passwordEncryption: boolean;
  lldp: boolean;
  domainLookup: boolean;
}

export interface LinkEnd {
  dev: string;
  port: string;
}

export interface Link {
  id: string;
  a: LinkEnd;
  b: LinkEnd;
  cable: CableType;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface Network {
  version: 1;
  seq: number;
  devices: Device[];
  links: Link[];
  notes: Note[];
}

export interface Explain {
  key: string;
  params?: Record<string, string | number>;
}

export type IcmpType = 'echo-request' | 'echo-reply' | 'unreachable' | 'time-exceeded';

export interface IcmpMsg {
  type: IcmpType;
  code: number;
  id: number;
  seq: number;
  original?: { src: number; dst: number; id: number; seq: number };
}

export interface DhcpMsg {
  op: 'discover' | 'offer' | 'request' | 'ack' | 'nak';
  xid: number;
  chaddr: string;
  yiaddr: number;
  giaddr: number;
  server: number;
  prefix: number;
  router: number;
  dns: number;
}

export interface DnsMsg {
  id: number;
  response: boolean;
  name: string;
  answer: number;
  rcode: 'ok' | 'nxdomain';
}

export interface HttpMsg {
  kind: 'request' | 'response';
  method: string;
  host: string;
  path: string;
  status: number;
  title: string;
  body: string;
}

export interface UdpSeg {
  sport: number;
  dport: number;
  dhcp?: DhcpMsg;
  dns?: DnsMsg;
}

export interface TcpSeg {
  sport: number;
  dport: number;
  flags: ('SYN' | 'ACK' | 'PSH' | 'FIN' | 'RST')[];
  http?: HttpMsg;
}

export interface Ipv4Packet {
  src: number;
  dst: number;
  ttl: number;
  proto: 'icmp' | 'udp' | 'tcp';
  icmp?: IcmpMsg;
  udp?: UdpSeg;
  tcp?: TcpSeg;
}

export interface ArpMsg {
  op: 'request' | 'reply';
  senderMac: string;
  senderIp: number;
  targetMac: string;
  targetIp: number;
}

export interface Frame {
  src: string;
  dst: string;
  vlan: number | null;
  type: 'arp' | 'ipv4';
  arp?: ArpMsg;
  ip?: Ipv4Packet;
}

export type Protocol = 'ARP' | 'ICMP' | 'DHCP' | 'DNS' | 'TCP' | 'HTTP' | 'HTTPS' | 'UDP';

export interface TraceEvent {
  seq: number;
  time: number;
  from: LinkEnd;
  to: LinkEnd | null;
  link: string | null;
  frame: Frame;
  proto: Protocol;
  sent: Explain[];
  received: Explain[];
  outcome: 'ok' | 'drop';
}
