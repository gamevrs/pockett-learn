import { daysBetween, dayKey } from './progress';

/** "Today", "Yesterday", a weekday within the week, else a short date, in the phone's language. */
export function relativeDay(iso: string, now: Date, locale?: string): string {
  const t = Date.parse(iso);
  if (!t) return '';
  const d = new Date(t);
  const diff = daysBetween(dayKey(d), dayKey(now));
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }).format(d);
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function plural(n: number, one: string, other = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : other}`;
}

export function minutesLabel(m: number | undefined): string {
  return m ? `${m} min` : '';
}
