import { xpSources } from '../state/progress';
import { LABS } from './labs';
import { MODULES } from './modules';
import type { Lab, Module } from './types';

export { LEVELS } from './levels';
export { MODULES, LABS };

xpSources.value = { sectionsPerModule: Object.fromEntries(MODULES.map((m) => [m.id, m.sections.length])) };

export function moduleById(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export function labById(id: string): Lab | undefined {
  return LABS.find((lab) => lab.id === id);
}

export function modulesOfLevel(level: number): Module[] {
  return MODULES.filter((m) => m.level === level);
}

export function labsOfLevel(level: number): Lab[] {
  return LABS.filter((lab) => lab.level === level);
}
