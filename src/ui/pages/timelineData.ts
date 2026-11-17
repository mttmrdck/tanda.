import type { CalmTier, EventRecord, Signal } from '../../engine/types';

export const CSV_HEADER = ['time_utc', 'local_time', 'kind', 'signal', 'meaning', 'confidence', 'feedback', 'calm_tier', 'calm_score'] as const;

const csvCell = (v: string | number | undefined) => {
  if (v === undefined) return '';
  const s = String(v);
  // neutralise spreadsheet formula injection and quote when needed
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(events: EventRecord[], signals: Signal[], pick: (s: Signal) => { name: string; meaning: string }, localTime: (iso: string) => string): string {
  const rows = events.map((e) => {
    const s = e.signalId ? signals.find((x) => x.id === e.signalId) : undefined;
    const p = s ? pick(s) : undefined;
    return [e.ts, localTime(e.ts), e.kind, p?.name, p?.meaning, e.confidence?.toFixed(2), e.feedback, e.tier, e.score?.toFixed(2)].map(csvCell).join(',');
  });
  return [CSV_HEADER.join(','), ...rows].join('\n') + '\n';
}

/** Local-day bounds [start, end) as ISO strings. */
export function dayBounds(dateStr: string): { from: string; to: string; date: Date } {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString(), date: start };
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function byHour(events: EventRecord[]): { hour: number; count: number }[] {
  const out = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const e of events) if (e.kind === 'signal') out[new Date(e.ts).getHours()]!.count++;
  return out;
}

const TIER_N: Record<CalmTier, number> = { calm: 0, rising: 1, high: 2 };

/** Calm Watch level over the day as a step series (hour as a fractional number). */
export function calmSeries(events: EventRecord[]): { h: number; level: number; score: number }[] {
  const pts = events
    .filter((e) => e.kind === 'calm-tier' && e.tier)
    .map((e) => {
      const d = new Date(e.ts);
      return { h: d.getHours() + d.getMinutes() / 60, level: TIER_N[e.tier!], score: e.score ?? 0 };
    });
  if (!pts.length) return [];
  return [{ h: 0, level: 0, score: 0 }, ...pts, { h: 24, level: pts[pts.length - 1]!.level, score: pts[pts.length - 1]!.score }];
}

export function topSignals(events: EventRecord[]): { signalId: string; count: number }[] {
  const m = new Map<string, number>();
  for (const e of events) if (e.kind === 'signal' && e.signalId && e.feedback !== 'no') m.set(e.signalId, (m.get(e.signalId) ?? 0) + 1);
  return [...m.entries()].map(([signalId, count]) => ({ signalId, count })).sort((a, b) => b.count - a.count);
}

/** Busiest one-hour window (by start hour) for one signal. */
export function peakHour(events: EventRecord[], signalId: string): number | null {
  const counts = new Array<number>(24).fill(0);
  for (const e of events) if (e.kind === 'signal' && e.signalId === signalId) counts[new Date(e.ts).getHours()]!++;
  const max = Math.max(...counts);
  return max > 0 ? counts.indexOf(max) : null;
}
