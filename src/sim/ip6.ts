const ALL = (1n << 128n) - 1n;

export function parseIpv6(text: string): bigint | null {
  const value = text.trim().toLowerCase().replace(/%.*$/, '');
  if (!/^[0-9a-f:]+$/.test(value) || value.split('::').length > 2) return null;
  const [head, tail] = value.includes('::') ? value.split('::') : [value, null];
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  if ([...left, ...right].some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const missing = 8 - left.length - right.length;
  if (tail === null ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array(tail === null ? 0 : missing).fill('0'), ...right];
  return groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n);
}

export function formatIpv6(value: bigint): string {
  const groups = Array.from({ length: 8 }, (_, i) => Number((value >> BigInt((7 - i) * 16)) & 0xffffn));
  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === 0) j++;
    if (j - i > bestLength && j - i > 1) {
      bestStart = i;
      bestLength = j - i;
    }
    i = j;
  }
  const hex = groups.map((g) => g.toString(16));
  if (bestStart < 0) return hex.join(':');
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLength).join(':')}`;
}

export function parseCidr6(text: string): { addr: bigint; prefix: number } | null {
  const [addr, len] = text.trim().split('/');
  const parsed = parseIpv6(addr ?? '');
  const prefix = Number(len);
  if (parsed === null || !/^\d{1,3}$/.test(len ?? '') || prefix > 128) return null;
  return { addr: parsed, prefix };
}

export function mask6(prefix: number): bigint {
  return prefix === 0 ? 0n : (ALL << BigInt(128 - prefix)) & ALL;
}

export function network6(addr: bigint, prefix: number): bigint {
  return addr & mask6(prefix);
}

export function inSubnet6(addr: bigint, net: bigint, prefix: number): boolean {
  return network6(addr, prefix) === network6(net, prefix);
}

export function interfaceId(mac: string): bigint {
  const bytes = (/^[0-9a-f]{12}$/.test(mac) ? mac : '000000000000').match(/.{2}/g)!.map((b) => parseInt(b, 16));
  const eui = [bytes[0] ^ 0x02, bytes[1], bytes[2], 0xff, 0xfe, bytes[3], bytes[4], bytes[5]];
  return eui.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
}

export function linkLocal(mac: string): bigint {
  return (0xfe80n << 112n) | interfaceId(mac);
}

export function eui64(prefixAddr: bigint, mac: string): bigint {
  return network6(prefixAddr, 64) | interfaceId(mac);
}

export function isLinkLocal(addr: bigint): boolean {
  return addr >> 118n === 0xfe80n >> 6n;
}

export function isMulticast6(addr: bigint): boolean {
  return addr >> 120n === 0xffn;
}

export const ALL_NODES = parseIpv6('ff02::1')!;
export const ALL_ROUTERS = parseIpv6('ff02::2')!;

export function solicitedNode(addr: bigint): bigint {
  return parseIpv6('ff02::1:ff00:0')! | (addr & 0xffffffn);
}

export function multicastMac(addr: bigint): string {
  return `3333${(addr & 0xffffffffn).toString(16).padStart(8, '0')}`;
}

export function isMulticastMac(mac: string): boolean {
  return mac.startsWith('3333');
}
