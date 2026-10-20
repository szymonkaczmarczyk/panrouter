import type { Lab } from '../types';
import { ADVANCED_LABS } from './advanced';
import { BASIC_LABS } from './basic';
import { EXPERT_LABS } from './expert';

const afterStp = ADVANCED_LABS.findIndex((lab) => lab.id === 'stp') + 1;

export const LABS: Lab[] = [...BASIC_LABS, ...ADVANCED_LABS.slice(0, afterStp), ...EXPERT_LABS, ...ADVANCED_LABS.slice(afterStp)];
