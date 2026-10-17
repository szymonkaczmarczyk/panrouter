import { describe, expect, it } from 'vitest';
import { compressIpv6, expandIpv6 } from '../../src/games/ipv6';
import { MODULES } from '../../src/content/modules';

describe('ipv6 helpers', () => {
  it('compresses per RFC 5952', () => {
    expect(compressIpv6([0x2001, 0xdb8, 0, 0, 0, 0xff00, 0x42, 0x8329])).toBe('2001:db8::ff00:42:8329');
    expect(compressIpv6([0x2001, 0xdb8, 0, 1, 0, 0, 0, 1])).toBe('2001:db8:0:1::1');
    expect(compressIpv6([0x2001, 0xdb8, 0, 0, 1, 0, 0, 1])).toBe('2001:db8::1:0:0:1');
    expect(compressIpv6([0x2001, 0xdb8, 1, 0, 1, 2, 3, 4])).toBe('2001:db8:1:0:1:2:3:4');
    expect(expandIpv6([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1])).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });
});

describe('content', () => {
  it('has unique module and question ids with valid answers', () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const questions = MODULES.flatMap((m) => m.quiz);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      if (q.kind === 'single') expect(q.answer).toBeLessThan(q.options.length);
      if (q.kind === 'multi') for (const a of q.answer) expect(a).toBeLessThan(q.options.length);
    }
    expect(MODULES).toHaveLength(20);
  });

  it('avoids em dashes in all content', () => {
    const text = JSON.stringify(MODULES);
    expect(text.includes('\u2014')).toBe(false);
  });
});
