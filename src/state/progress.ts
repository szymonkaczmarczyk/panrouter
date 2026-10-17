import { computed, effect, signal } from '@preact/signals';
import type { Network } from '../sim/types';

const STORAGE_KEY = 'panrouter:v1';

export interface Progress {
  version: 1;
  sections: Record<string, string[]>;
  quizzes: Record<string, { best: number; attempts: number; last: number }>;
  labs: Record<string, { best: number; done: boolean }>;
  games: Record<string, { best: number; plays: number }>;
  exam: { attempts: number; best: number; passed: boolean; theory: number; practical: number };
  mistakes: string[];
  streak: { days: number; last: string };
  sandbox: Network | null;
  labNets: Record<string, Network>;
  settings: { motion: 'system' | 'reduce'; terminalFont: number; showPorts: boolean; showIps: boolean };
}

function blank(): Progress {
  return {
    version: 1,
    sections: {},
    quizzes: {},
    labs: {},
    games: {},
    exam: { attempts: 0, best: 0, passed: false, theory: 0, practical: 0 },
    mistakes: [],
    streak: { days: 0, last: '' },
    sandbox: null,
    labNets: {},
    settings: { motion: 'system', terminalFont: 14, showPorts: false, showIps: true },
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (parsed.version !== 1) return blank();
    const base = blank();
    return { ...base, ...parsed, exam: { ...base.exam, ...parsed.exam }, settings: { ...base.settings, ...parsed.settings }, streak: { ...base.streak, ...parsed.streak } };
  } catch {
    return blank();
  }
}

export const progress = signal<Progress>(load());

let saveTimer: number | undefined;
effect(() => {
  const value = progress.value;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      return;
    }
  }, 150);
});

effect(() => {
  document.documentElement.dataset.motion = progress.value.settings.motion === 'reduce' ? 'reduce' : '';
});

export function update(mutator: (draft: Progress) => void): void {
  const draft = structuredClone(progress.value);
  mutator(draft);
  progress.value = draft;
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function touchStreak(draft: Progress): void {
  const day = today();
  if (draft.streak.last === day) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  draft.streak = { days: draft.streak.last === y ? draft.streak.days + 1 : 1, last: day };
}

export function markSection(moduleId: string, sectionId: string): void {
  if (progress.value.sections[moduleId]?.includes(sectionId)) return;
  update((d) => {
    d.sections[moduleId] = [...(d.sections[moduleId] ?? []), sectionId];
    touchStreak(d);
  });
}

export function recordQuiz(id: string, percent: number, wrong: string[], right: string[]): void {
  update((d) => {
    const prev = d.quizzes[id];
    d.quizzes[id] = { best: Math.max(prev?.best ?? 0, percent), attempts: (prev?.attempts ?? 0) + 1, last: percent };
    const set = new Set(d.mistakes);
    for (const q of wrong) set.add(q);
    for (const q of right) set.delete(q);
    d.mistakes = [...set];
    touchStreak(d);
  });
}

export function recordLab(id: string, percent: number): void {
  update((d) => {
    const prev = d.labs[id];
    d.labs[id] = { best: Math.max(prev?.best ?? 0, percent), done: (prev?.done ?? false) || percent >= 100 };
    touchStreak(d);
  });
}

export function recordGame(id: string, score: number): void {
  update((d) => {
    const prev = d.games[id];
    d.games[id] = { best: Math.max(prev?.best ?? 0, score), plays: (prev?.plays ?? 0) + 1 };
    touchStreak(d);
  });
}

export function recordExam(result: { theory: number; practical: number; total: number; passed: boolean }): void {
  update((d) => {
    d.exam.attempts += 1;
    d.exam.best = Math.max(d.exam.best, result.total);
    d.exam.theory = result.theory;
    d.exam.practical = result.practical;
    d.exam.passed = d.exam.passed || result.passed;
    touchStreak(d);
  });
}

export function saveSandbox(net: Network): void {
  update((d) => {
    d.sandbox = net;
  });
}

export function saveLabNet(id: string, net: Network | null): void {
  update((d) => {
    if (net) d.labNets[id] = net;
    else delete d.labNets[id];
  });
}

export function resetProgress(): void {
  progress.value = blank();
}

export function exportProgress(): string {
  return JSON.stringify(progress.value, null, 2);
}

export function importProgress(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as Progress;
    if (parsed.version !== 1 || typeof parsed.sections !== 'object') return false;
    const base = blank();
    progress.value = { ...base, ...parsed, exam: { ...base.exam, ...parsed.exam }, settings: { ...base.settings, ...parsed.settings } };
    return true;
  } catch {
    return false;
  }
}

export const RANK_THRESHOLDS = [0, 250, 800, 1600, 2600, 3600];

export interface XpSources {
  sectionsPerModule: Record<string, number>;
}

export const xpSources = signal<XpSources>({ sectionsPerModule: {} });

export const xp = computed(() => {
  const p = progress.value;
  let total = 0;
  for (const [moduleId, done] of Object.entries(p.sections)) {
    total += done.length * 5;
    const needed = xpSources.value.sectionsPerModule[moduleId];
    if (needed && done.length >= needed) total += 20;
  }
  for (const q of Object.values(p.quizzes)) total += Math.round(q.best / 2);
  for (const lab of Object.values(p.labs)) total += Math.round(lab.best);
  for (const game of Object.values(p.games)) total += Math.round(Math.min(100, game.best) / 2);
  if (p.exam.passed) total += 300;
  return total;
});

export const rankIndex = computed(() => {
  let index = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) if (xp.value >= RANK_THRESHOLDS[i]) index = i;
  return index;
});
