import { signal } from '@preact/signals';

function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export const path = signal(currentPath());

window.addEventListener('hashchange', () => {
  const next = currentPath();
  if (next === path.value) return;
  path.value = next;
  const main = document.getElementById('main');
  if (main) main.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0 });
});

export function navigate(to: string): void {
  window.location.hash = to;
}

export function href(to: string): string {
  return `#${to}`;
}

export function matchRoute(pattern: string, value: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const valueParts = value.split('?')[0].split('/').filter(Boolean);
  if (patternParts.length !== valueParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(valueParts[i]);
    else if (part !== valueParts[i]) return null;
  }
  return params;
}
