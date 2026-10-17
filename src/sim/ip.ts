export const BROADCAST_MAC = 'ffffffffffff';
export const BROADCAST_IP = 0xffffffff;

export function parseIp(text: string): number | null {
  const parts = text.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

export function ipToStr(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

export function prefixToMask(prefix: number): number {
  if (prefix <= 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

export function maskToPrefix(mask: number): number | null {
  const inverted = ~mask >>> 0;
  if ((inverted & (inverted + 1)) !== 0) return null;
  let prefix = 0;
  let probe = mask;
  while (probe & 0x80000000) {
    prefix++;
    probe = (probe << 1) >>> 0;
  }
  return prefix;
}

export function parseMask(text: string): number | null {
  const value = parseIp(text);
  if (value === null) return null;
  return maskToPrefix(value);
}

export function wildcardToPrefix(text: string): number | null {
  const value = parseIp(text);
  if (value === null) return null;
  return maskToPrefix(~value >>> 0);
}

export function networkOf(ip: number, prefix: number): number {
  return (ip & prefixToMask(prefix)) >>> 0;
}

export function broadcastOf(ip: number, prefix: number): number {
  return (networkOf(ip, prefix) | (~prefixToMask(prefix) >>> 0)) >>> 0;
}

export function inSubnet(ip: number, net: number, prefix: number): boolean {
  return networkOf(ip, prefix) === networkOf(net, prefix);
}

export function hostCount(prefix: number): number {
  if (prefix >= 31) return prefix === 31 ? 2 : 1;
  return 2 ** (32 - prefix) - 2;
}

export function parseCidr(text: string): { ip: number; prefix: number } | null {
  const [ipText, prefixText] = text.trim().split('/');
  const ip = parseIp(ipText ?? '');
  const prefix = Number(prefixText);
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  return { ip, prefix };
}

export function isUsableHost(ip: number, prefix: number): boolean {
  if (prefix >= 31) return true;
  return ip !== networkOf(ip, prefix) && ip !== broadcastOf(ip, prefix);
}

export function isPrivate(ip: number): boolean {
  return (
    inSubnet(ip, parseIp('10.0.0.0')!, 8) ||
    inSubnet(ip, parseIp('172.16.0.0')!, 12) ||
    inSubnet(ip, parseIp('192.168.0.0')!, 16)
  );
}

export function isCgnat(ip: number): boolean {
  return inSubnet(ip, parseIp('100.64.0.0')!, 10);
}

export function formatMacCisco(mac: string): string {
  return `${mac.slice(0, 4)}.${mac.slice(4, 8)}.${mac.slice(8, 12)}`;
}

export function formatMacWindows(mac: string): string {
  return mac.toUpperCase().match(/.{2}/g)!.join('-');
}

export function formatMacColon(mac: string): string {
  return mac.match(/.{2}/g)!.join(':');
}
