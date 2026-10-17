import { effect, signal } from '@preact/signals';
import type { L10n, Lang } from './l10n';
import { STRINGS, type StringKey } from './strings';

const LANG_KEY = 'panrouter:lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'pl' || saved === 'en') return saved;
  } catch {
    return 'pl';
  }
  return 'pl';
}

export const lang = signal<Lang>(initialLang());

effect(() => {
  const value = lang.value;
  document.documentElement.lang = value;
  try {
    localStorage.setItem(LANG_KEY, value);
  } catch {
    return;
  }
});

export function t(key: StringKey, params?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  let text = entry ? entry[lang.value] : key;
  if (params) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

export function tr(text: L10n | undefined | null): string {
  if (!text) return '';
  return text[lang.value];
}

export function plural(n: number, forms: { pl: [string, string, string]; en: [string, string] }): string {
  if (lang.value === 'en') return `${n} ${n === 1 ? forms.en[0] : forms.en[1]}`;
  const [one, few, many] = forms.pl;
  if (n === 1) return `${n} ${one}`;
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export type { Lang, L10n };

export function tx(pl: string, en: string): string {
  return lang.value === 'pl' ? pl : en;
}
