import type { DeviceKind } from '../types';
import { modelOf } from '../catalog';

const CATEGORY_COLOR: Record<string, string> = {
  routers: 'var(--cat-routers)',
  switches: 'var(--cat-switches)',
  wireless: 'var(--cat-wireless)',
  security: 'var(--cat-security)',
  end: 'var(--cat-end)',
  wan: 'var(--cat-wan)',
};

export function categoryColor(kind: DeviceKind): string {
  return CATEGORY_COLOR[modelOf(kind).category];
}

function Shape({ kind }: { kind: DeviceKind }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'router':
      return (
        <g style={s}>
          <circle cx="24" cy="24" r="13" />
          <path d="M14.5 19.5h7.5m-2.5-2.5 2.5 2.5-2.5 2.5" />
          <path d="M33.5 28.5H26m2.5 2.5-2.5-2.5 2.5-2.5" />
          <path d="M28.5 14.5v7.5m2.5-2.5-2.5 2.5-2.5-2.5" />
          <path d="M19.5 33.5V26m-2.5 2.5 2.5-2.5 2.5 2.5" />
        </g>
      );
    case 'homeRouter':
      return (
        <g style={s}>
          <rect x="10" y="22" width="28" height="12" rx="3" />
          <path d="M15 22l-2-9M33 22l2-9" />
          <circle cx="16" cy="28" r="1.2" style={{ fill: 'currentColor', stroke: 'none' }} />
          <circle cx="21" cy="28" r="1.2" style={{ fill: 'currentColor', stroke: 'none' }} />
          <path d="M26 28h7" />
          <path d="M19.5 14.5a6.5 6.5 0 0 1 9 0M21.8 17.2a3 3 0 0 1 4.4 0" />
        </g>
      );
    case 'switch':
      return (
        <g style={s}>
          <rect x="8" y="14" width="32" height="20" rx="3" />
          <path d="M14 21h18m-3-3 3 3-3 3" />
          <path d="M34 27H16m3-3-3 3 3 3" />
        </g>
      );
    case 'l3switch':
      return (
        <g style={s}>
          <rect x="8" y="14" width="32" height="20" rx="3" />
          <path d="M15 19l18 10m-1-4 1 4-4 0.5" />
          <path d="M33 19 15 29m1-4-1 4 4 0.5" />
        </g>
      );
    case 'firewall':
      return (
        <g style={s}>
          <rect x="10" y="13" width="28" height="22" rx="2" />
          <path d="M10 20.3h28M10 27.6h28M19 13v7.3M29 13v7.3M24 20.3v7.3M15 27.6V35M33 27.6V35" />
        </g>
      );
    case 'ap':
      return (
        <g style={s}>
          <circle cx="24" cy="30" r="2.2" style={{ fill: 'currentColor', stroke: 'none' }} />
          <path d="M18.5 24.5a8 8 0 0 1 11 0M14.5 20.5a13.5 13.5 0 0 1 19 0M10.8 16.6a19 19 0 0 1 26.4 0" />
          <path d="M16 36h16" />
        </g>
      );
    case 'internet':
      return (
        <g style={s}>
          <path d="M15 33h19a7 7 0 0 0 1-13.9A10 10 0 0 0 16 18.5 7.3 7.3 0 0 0 15 33Z" />
          <path d="M24 22v8M20 26h8" />
        </g>
      );
    case 'pc':
      return (
        <g style={s}>
          <rect x="10" y="12" width="28" height="19" rx="2" />
          <path d="M20 36h8M24 31v5" />
        </g>
      );
    case 'laptop':
      return (
        <g style={s}>
          <rect x="13" y="14" width="22" height="15" rx="2" />
          <path d="M9 34h30l-3-5H12Z" />
        </g>
      );
    case 'phone':
      return (
        <g style={s}>
          <rect x="17" y="10" width="14" height="28" rx="3" />
          <path d="M22 34h4" />
        </g>
      );
    case 'server':
      return (
        <g style={s}>
          <rect x="12" y="10" width="24" height="9" rx="2" />
          <rect x="12" y="19.5" width="24" height="9" rx="2" />
          <rect x="12" y="29" width="24" height="9" rx="2" />
          <path d="M16 14.5h1M16 24h1M16 33.5h1M28 14.5h4M28 24h4M28 33.5h4" />
        </g>
      );
    case 'printer':
      return (
        <g style={s}>
          <path d="M16 18v-7h16v7" />
          <rect x="10" y="18" width="28" height="12" rx="2" />
          <path d="M16 26h16v10H16Z" />
        </g>
      );
    case 'camera':
      return (
        <g style={s}>
          <path d="M10 17l20-5 3 8-20 5Z" />
          <path d="M31 16l6-1.5 1 5-6 1.5" />
          <path d="M17 24l-1 7h-5" />
        </g>
      );
    case 'voip':
      return (
        <g style={s}>
          <rect x="11" y="13" width="26" height="22" rx="3" />
          <path d="M15 19c2-3 6-3 8 0M15 19v3M23 19v3" />
          <rect x="27" y="17" width="6" height="5" rx="1" />
          <path d="M16 28h2M21 28h2M26 28h2M16 31h2M21 31h2M26 31h2" />
        </g>
      );
  }
}

export function DeviceGlyph({ kind, size = 48, muted = false }: { kind: DeviceKind; size?: number; muted?: boolean }) {
  const color = categoryColor(kind);
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" style={{ color: muted ? 'var(--text-dim)' : color }}>
      <rect x="1.5" y="1.5" width="45" height="45" rx="11" style={{ fill: 'var(--surface-2)', stroke: 'currentColor', strokeOpacity: 0.45 }} />
      <Shape kind={kind} />
    </svg>
  );
}

export function DeviceShape({ kind }: { kind: DeviceKind }) {
  return <Shape kind={kind} />;
}
