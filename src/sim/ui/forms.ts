import { tx } from '../../i18n';
import { isUsableHost, maskToPrefix, networkOf, parseIp } from '../ip';

export function parsePrefix(text: string): number | null {
  const value = text.trim().replace(/^\//, '');
  if (/^\d{1,2}$/.test(value)) {
    const n = Number(value);
    return n >= 1 && n <= 32 ? n : null;
  }
  const mask = parseIp(value);
  if (mask === null) return null;
  return maskToPrefix(mask);
}

export function ipError(text: string, required = true): string | null {
  if (!text.trim()) return required ? tx('Wpisz adres IP, np. 192.168.1.10.', 'Enter an IP address, e.g. 192.168.1.10.') : null;
  if (parseIp(text) === null) return tx('To nie jest poprawny adres IPv4. Użyj czterech liczb 0-255 oddzielonych kropkami.', 'This is not a valid IPv4 address. Use four numbers 0-255 separated by dots.');
  return null;
}

export function prefixError(text: string): string | null {
  if (!text.trim()) return tx('Wpisz maskę, np. 255.255.255.0 albo /24.', 'Enter a mask, e.g. 255.255.255.0 or /24.');
  if (parsePrefix(text) === null) return tx('Maska musi mieć ciągłe jedynki, np. 255.255.255.0 (/24) albo 255.255.255.192 (/26).', 'The mask needs contiguous ones, e.g. 255.255.255.0 (/24) or 255.255.255.192 (/26).');
  return null;
}

export function hostAddressError(ipText: string, prefixText: string): string | null {
  const ip = parseIp(ipText);
  const prefix = parsePrefix(prefixText);
  if (ip === null || prefix === null) return null;
  if (!isUsableHost(ip, prefix)) return tx('To adres sieci albo rozgłoszeniowy. Wybierz adres hosta z zakresu podsieci.', 'This is the network or broadcast address. Pick a host address inside the subnet.');
  return null;
}

export function gatewayError(gwText: string, ipText: string, prefixText: string): string | null {
  if (!gwText.trim()) return null;
  const base = ipError(gwText);
  if (base) return base;
  const gw = parseIp(gwText)!;
  const ip = parseIp(ipText);
  const prefix = parsePrefix(prefixText);
  if (ip === null || prefix === null) return null;
  if (networkOf(gw, prefix) !== networkOf(ip, prefix)) return tx('Brama musi być w tej samej podsieci co adres komputera.', 'The gateway must be in the same subnet as the computer address.');
  if (gw === ip) return tx('Brama nie może mieć tego samego adresu co komputer.', 'The gateway cannot use the computer’s own address.');
  return null;
}

export function hostnameError(text: string): string | null {
  if (!/^[A-Za-z][A-Za-z0-9-]{0,31}$/.test(text)) return tx('Nazwa: litera na początku, potem litery, cyfry lub łącznik, maks. 32 znaki.', 'Name: start with a letter, then letters, digits or hyphen, max 32 characters.');
  return null;
}
