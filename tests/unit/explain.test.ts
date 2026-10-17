import { describe, expect, it } from 'vitest';
import source from '../../src/sim/engine.ts?raw';
import { hasExplanation } from '../../src/sim/explain';

describe('explanations', () => {
  it('covers every key the engine emits', () => {
    const keys = new Set([...source.matchAll(/'((?:l2|l3|ip|arp|dhcp|dns|icmp|tcp|http|nat|fw|acl|stp|port|dev|host)\.[a-zA-Z]+)'/g)].map((m) => m[1]));
    const missing = [...keys].filter((key) => !hasExplanation(key));
    expect(missing).toEqual([]);
  });
});
