import type { Lang } from '../../i18n';

const locale = (lang: Lang) => (lang === 'ms' ? 'ms-MY' : 'en-GB');

/** "3 minutes ago" style relative time in the UI language. */
export function relativeTime(iso: string, lang: Lang, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function timeOfDay(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function hourLabel(h: number, lang: Lang): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(d);
}

/** Compact day for narrow tables, e.g. "Wed 11". */
export function shortDayLabel(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'short', day: 'numeric' }).format(d);
}

export function dayLabel(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}
