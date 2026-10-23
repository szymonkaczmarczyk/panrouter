import dmSansExtUrl from '@fontsource-variable/dm-sans/files/dm-sans-latin-ext-wght-normal.woff2?url';
import dmSansUrl from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url';
import monoExtUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-400-normal.woff2?url';
import monoUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import type { Network } from '../types';

const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'paint-order',
  'opacity',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'display',
  'visibility',
];

const DROP_SELECTORS = ['.packet', '.wifi-range', '.link-hit', '.link-flash', '.node-ring', '.canvas-bg', 'defs'];
const SCALE = 2;
const MAX_SIDE = 8000;

async function dataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fontFaces(): Promise<string> {
  const [sans, sansExt, mono, monoExt] = await Promise.all([dmSansUrl, dmSansExtUrl, monoUrl, monoExtUrl].map(dataUrl));
  return [
    `@font-face{font-family:'DM Sans Variable';font-weight:100 1000;src:url(${sans}) format('woff2');unicode-range:U+0000-00FF}`,
    `@font-face{font-family:'DM Sans Variable';font-weight:100 1000;src:url(${sansExt}) format('woff2');unicode-range:U+0100-024F}`,
    `@font-face{font-family:'JetBrains Mono';font-weight:400;src:url(${mono}) format('woff2');unicode-range:U+0000-00FF}`,
    `@font-face{font-family:'JetBrains Mono';font-weight:400;src:url(${monoExt}) format('woff2');unicode-range:U+0100-024F}`,
  ].join('');
}

function bounds(net: Network): { x: number; y: number; w: number; h: number } {
  const left = [...net.devices.map((d) => d.x - 110), ...net.notes.map((n) => n.x - 20)];
  const right = [...net.devices.map((d) => d.x + 110), ...net.notes.map((n) => n.x + 210)];
  const top = [...net.devices.map((d) => d.y - 80), ...net.notes.map((n) => n.y - 20)];
  const bottom = [...net.devices.map((d) => d.y + 120), ...net.notes.map((n) => n.y + 170)];
  const x = Math.min(...left);
  const y = Math.min(...top);
  return { x, y, w: Math.max(...right) - x, h: Math.max(...bottom) - y };
}

function inlineStyles(source: SVGSVGElement, target: SVGSVGElement): void {
  const from = [source, ...source.querySelectorAll('*')];
  const to = [target, ...target.querySelectorAll('*')];
  from.forEach((element, index) => {
    const clone = to[index] as SVGElement | undefined;
    if (!clone) return;
    const computed = getComputedStyle(element);
    const style = STYLE_PROPS.map((prop) => `${prop}:${computed.getPropertyValue(prop)}`).join(';');
    clone.setAttribute('style', style);
    clone.removeAttribute('class');
  });
}

export async function renderNetworkPng(svg: SVGSVGElement, net: Network, caption: string): Promise<Blob> {
  const box = bounds(net);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sourceNodes = [...svg.querySelectorAll('*')];
  const cloneNodes = [...clone.querySelectorAll('*')];
  const dropped = new Set(svg.querySelectorAll(DROP_SELECTORS.join(',')));
  inlineStyles(svg, clone);
  sourceNodes.forEach((element, index) => {
    if (dropped.has(element)) cloneNodes[index]?.remove();
  });
  const styles = getComputedStyle(document.documentElement);
  const background = styles.getPropertyValue('--bg').trim() || '#0b1016';
  const dim = styles.getPropertyValue('--text-dim').trim() || '#8296ab';
  clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
  clone.setAttribute('width', String(box.w));
  clone.setAttribute('height', String(box.h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-label');
  const ns = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(ns, 'style');
  style.textContent = await fontFaces();
  const backdrop = document.createElementNS(ns, 'rect');
  backdrop.setAttribute('x', String(box.x));
  backdrop.setAttribute('y', String(box.y));
  backdrop.setAttribute('width', String(box.w));
  backdrop.setAttribute('height', String(box.h));
  backdrop.setAttribute('fill', background);
  const label = document.createElementNS(ns, 'text');
  label.setAttribute('x', String(box.x + box.w - 16));
  label.setAttribute('y', String(box.y + box.h - 14));
  label.setAttribute('style', `fill:${dim};font-family:'DM Sans Variable',sans-serif;font-size:12px;font-weight:600;text-anchor:end`);
  label.textContent = caption;
  clone.prepend(style, backdrop);
  clone.append(label);
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const scale = Math.min(SCALE, MAX_SIDE / Math.max(box.w, box.h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(box.w * scale);
    canvas.height = Math.round(box.h * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
