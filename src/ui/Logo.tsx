export function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" style={{ fill: 'var(--surface-2)', stroke: 'var(--accent)', strokeOpacity: 0.5 }} />
      <circle cx="16" cy="16" r="8.5" style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2 }} />
      <path d="M16 4.5v5M16 22.5v5M4.5 16h5M22.5 16h5" style={{ stroke: 'var(--accent)', strokeWidth: 2, strokeLinecap: 'round' }} />
      <circle cx="16" cy="16" r="2.6" style={{ fill: 'var(--ok)' }} />
    </svg>
  );
}
