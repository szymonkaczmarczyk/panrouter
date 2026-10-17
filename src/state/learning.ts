import { computed } from '@preact/signals';
import { LABS, MODULES } from '../content';
import type { Module } from '../content/types';
import { progress } from './progress';

export type Status = 'new' | 'progress' | 'done';

export const QUIZ_PASS = 70;

export function sectionsDone(module: Module): number {
  return progress.value.sections[module.id]?.length ?? 0;
}

export function moduleStatus(module: Module): Status {
  const done = sectionsDone(module);
  const quiz = progress.value.quizzes[module.id];
  if (done >= module.sections.length && quiz && quiz.best >= QUIZ_PASS) return 'done';
  if (done > 0 || quiz) return 'progress';
  return 'new';
}

export function modulePercent(module: Module): number {
  const total = module.sections.length + 1;
  const quiz = (progress.value.quizzes[module.id]?.best ?? 0) >= QUIZ_PASS ? 1 : 0;
  return Math.round(((Math.min(sectionsDone(module), module.sections.length) + quiz) / total) * 100);
}

export function levelPercent(level: number): number {
  const modules = MODULES.filter((m) => m.level === level);
  const labs = LABS.filter((lab) => lab.level === level);
  if (!modules.length && !labs.length) return 0;
  const parts = [...modules.map(modulePercent), ...labs.map((lab) => progress.value.labs[lab.id]?.best ?? 0)];
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export const overallPercent = computed(() => {
  const parts = [...MODULES.map(modulePercent), ...LABS.map((lab) => progress.value.labs[lab.id]?.best ?? 0)];
  if (!parts.length) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
});

export const nextModule = computed<Module | null>(() => {
  return MODULES.find((m) => moduleStatus(m) === 'progress') ?? MODULES.find((m) => moduleStatus(m) === 'new') ?? null;
});

export const labsDone = computed(() => LABS.filter((lab) => progress.value.labs[lab.id]?.done).length);
