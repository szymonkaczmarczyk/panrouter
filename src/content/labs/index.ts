import type { Lab } from '../types';
import { ADVANCED_LABS } from './advanced';
import { BASIC_LABS } from './basic';

export const LABS: Lab[] = [...BASIC_LABS, ...ADVANCED_LABS];
