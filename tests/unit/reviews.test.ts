import { describe, expect, it } from 'vitest';
import { addDays, cleanReviews, daysBetween, dueKeys, nextDue, scheduleAgain, schedulePassed, type Reviews } from '../../src/state/reviews';

describe('powtórki rozłożone w czasie', () => {
  it('liczy daty przez koniec miesiąca, roku i zmianę czasu', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
    expect(daysBetween('2026-10-23', '2026-10-30')).toBe(7);
  });

  it('prowadzi pytanie przez 1, 3 i 7 dni, a potem je zdejmuje', () => {
    const reviews: Reviews = {};
    scheduleAgain(reviews, 'q:a', '2026-10-01');
    expect(reviews['q:a']).toEqual({ box: 0, due: '2026-10-02' });
    schedulePassed(reviews, 'q:a', '2026-10-02');
    expect(reviews['q:a']).toEqual({ box: 1, due: '2026-10-05' });
    schedulePassed(reviews, 'q:a', '2026-10-05');
    expect(reviews['q:a']).toEqual({ box: 2, due: '2026-10-12' });
    schedulePassed(reviews, 'q:a', '2026-10-12');
    expect(reviews['q:a']).toBeUndefined();
  });

  it('błąd cofa na początek', () => {
    const reviews: Reviews = { 'q:a': { box: 2, due: '2026-10-12' } };
    scheduleAgain(reviews, 'q:a', '2026-10-12');
    expect(reviews['q:a']).toEqual({ box: 0, due: '2026-10-13' });
  });

  it('wybiera zaległe i dzisiejsze, a podaje najbliższy przyszły termin', () => {
    const reviews: Reviews = { 'q:a': { box: 0, due: '2026-10-20' }, 't:VLAN': { box: 1, due: '2026-10-23' }, 'q:b': { box: 0, due: '2026-10-26' } };
    expect(dueKeys(reviews, '2026-10-23')).toEqual(['q:a', 't:VLAN']);
    expect(nextDue(reviews, '2026-10-23')).toBe('2026-10-26');
  });

  it('odrzuca uszkodzone wpisy z pamięci przeglądarki', () => {
    expect(cleanReviews({ 'q:a': { box: 9, due: '2026-10-20' }, 'x:b': { box: 0, due: '2026-10-20' }, 'q:c': { box: 0, due: 'jutro' } })).toEqual({ 'q:a': { box: 2, due: '2026-10-20' } });
    expect(cleanReviews(null)).toEqual({});
  });
});
