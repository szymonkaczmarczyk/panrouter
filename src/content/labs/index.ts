import type { Lab } from '../types';
import { ADVANCED_LABS } from './advanced';
import { BASIC_LABS } from './basic';
import { EXPERT_LABS } from './expert';
import { IPV6_LABS } from './ipv6';

const afterAcl = ADVANCED_LABS.findIndex((lab) => lab.id === 'acl') + 1;
const afterStp = ADVANCED_LABS.findIndex((lab) => lab.id === 'stp') + 1;

export const LABS: Lab[] = [...BASIC_LABS, ...ADVANCED_LABS.slice(0, afterAcl), ...IPV6_LABS, ...ADVANCED_LABS.slice(afterAcl, afterStp), ...EXPERT_LABS, ...ADVANCED_LABS.slice(afterStp)];
