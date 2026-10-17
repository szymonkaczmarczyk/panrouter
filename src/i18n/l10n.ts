export type Lang = 'pl' | 'en';

export interface L10n {
  pl: string;
  en: string;
}

export function l(pl: string, en: string): L10n {
  return { pl, en };
}
