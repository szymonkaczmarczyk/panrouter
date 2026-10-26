export const REVIEW_DAYS = [1, 3, 7];

export interface ReviewItem {
  box: number;
  due: string;
}

export type Reviews = Record<string, ReviewItem>;

export const questionKey = (id: string) => `q:${id}`;
export const termKey = (term: string) => `t:${term}`;

export function dayOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayOf(new Date(y, m - 1, d + days));
}

export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((day) => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

export function dueKeys(reviews: Reviews, day: string): string[] {
  return Object.entries(reviews)
    .filter(([, item]) => item.due <= day)
    .sort(([, a], [, b]) => a.due.localeCompare(b.due))
    .map(([key]) => key);
}

export function nextDue(reviews: Reviews, day: string): string | null {
  const upcoming = Object.values(reviews)
    .map((item) => item.due)
    .filter((due) => due > day)
    .sort();
  return upcoming[0] ?? null;
}

export function scheduleAgain(reviews: Reviews, key: string, day: string): void {
  reviews[key] = { box: 0, due: addDays(day, REVIEW_DAYS[0]) };
}

export function schedulePassed(reviews: Reviews, key: string, day: string): void {
  const item = reviews[key];
  if (!item) return;
  const box = item.box + 1;
  if (box >= REVIEW_DAYS.length) delete reviews[key];
  else reviews[key] = { box, due: addDays(day, REVIEW_DAYS[box]) };
}

export function cleanReviews(value: unknown): Reviews {
  if (!value || typeof value !== 'object') return {};
  const result: Reviews = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 2000)) {
    const item = raw as ReviewItem | null;
    if (!/^[qt]:.{1,80}$/.test(key) || !item || !/^\d{4}-\d{2}-\d{2}$/.test(String(item.due))) continue;
    result[key] = { box: Math.max(0, Math.min(REVIEW_DAYS.length - 1, Math.floor(Number(item.box) || 0))), due: item.due };
  }
  return result;
}
