import { tx } from '../i18n';
import { progress, today } from './progress';
import { daysBetween, dueKeys, nextDue } from './reviews';

export function dueCount(): number {
  return dueKeys(progress.value.reviews, today()).length;
}

export function nextReviewText(): string {
  const next = nextDue(progress.value.reviews, today());
  if (!next) return tx('Nie masz zaplanowanych powtórek.', 'You have no reviews scheduled.');
  const days = daysBetween(today(), next);
  return days === 1 ? tx('Następna powtórka jutro.', 'Next review tomorrow.') : tx(`Następna powtórka za ${days} dni.`, `Next review in ${days} days.`);
}
