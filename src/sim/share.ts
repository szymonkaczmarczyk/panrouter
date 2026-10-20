import { normalizeNetwork } from './normalize';
import type { Network } from './types';

const VERSION = '1';
const MAX_ENCODED = 400_000;
const MAX_JSON = 3_000_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function readLimited(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function encodeNetwork(net: Network): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(net));
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = await readLimited(stream, Number.MAX_SAFE_INTEGER);
  return `${VERSION}.${toBase64Url(bytes!)}`;
}

export async function decodeNetwork(data: string): Promise<Network | null> {
  if (data.length > MAX_ENCODED) return null;
  const [version, payload] = data.split('.', 2);
  if (version !== VERSION || !payload) return null;
  const bytes = fromBase64Url(payload);
  if (!bytes) return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const json = await readLimited(stream, MAX_JSON);
    if (!json) return null;
    return normalizeNetwork(JSON.parse(new TextDecoder().decode(json)));
  } catch {
    return null;
  }
}

export function shareUrl(data: string): string {
  return `${window.location.origin}${window.location.pathname}#/symulator?siec=${data}`;
}

export function shareParam(path: string): string | null {
  const query = path.split('?')[1];
  if (!query) return null;
  return new URLSearchParams(query).get('siec');
}
