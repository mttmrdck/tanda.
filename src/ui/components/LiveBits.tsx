import { clsx } from 'clsx';
import { Activity, CircleCheck, CircleQuestionMark, FlaskConical, Leaf, Pencil, Sparkles, WavesHorizontal } from 'lucide-react';
import type { CalmState } from '../../engine/calmWatch';
import type { CalmTier, EventRecord, Signal } from '../../engine/types';
import { pickText, useT, type Lang, type MsgKey } from '../../i18n';
import { timeOfDay } from './format';
import { iconFor } from './signalIcons';

export function confidenceLevel(c: number): MsgKey {
  return c >= 0.8 ? 'confConfident' : c >= 0.65 ? 'confFairly' : 'confUnsure';
}

/** Confidence as a bar plus a text label (no percentages). */
export function ConfidenceBar({ confidence, compact = false }: { confidence: number; compact?: boolean }) {
  const t = useT();
  const level = t(confidenceLevel(confidence));
  const filled = confidence >= 0.8 ? 3 : confidence >= 0.65 ? 2 : 1;
  return (
    <div className="flex items-center gap-3 whitespace-nowrap">
      <span aria-hidden className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span key={i} className={clsx('h-2.5 w-8 rounded-full', i <= filled ? 'bg-primary-fill' : 'bg-surface-2 ring-1 ring-border-soft')} />
        ))}
      </span>
      <span className="font-bold text-ink-muted">{compact ? level : t('confLabel', { level })}</span>
    </div>
  );
}

const TIERS: { tier: CalmTier; label: MsgKey; Icon: typeof Leaf; on: string }[] = [
  { tier: 'calm', label: 'tierCalm', Icon: Leaf, on: 'bg-calm-bg text-calm-fg ring-2 ring-calm-fg' },
  { tier: 'rising', label: 'tierRising', Icon: WavesHorizontal, on: 'bg-rising-bg text-rising-fg ring-2 ring-rising-fg' },
  // "well above usual" is an observation, not an alarm: same warm tone as "above usual", stronger mark
  { tier: 'high', label: 'tierHigh', Icon: Activity, on: 'bg-rising-bg text-rising-fg ring-[3px] ring-rising-fg' },
];

export const tierLabel = (tier: CalmTier): MsgKey => TIERS.find((x) => x.tier === tier)!.label;

/** Three-segment meter: icon + word + colour; the current tier is also stated in text. */
export function CalmMeter({ state }: { state: CalmState | null }) {
  const t = useT();
  const tier = state?.tier ?? 'calm';
  return (
    <div>
      <p className="sr-only" data-testid="calm-tier">
        {t('calmMeterLabel', { tier: t(tierLabel(tier)) })}
      </p>
      <ol aria-hidden className="grid grid-cols-3 gap-2" data-testid="calm-meter" data-tier={state ? tier : 'none'}>
        {TIERS.map((x) => (
          <li
            key={x.tier}
            className={clsx(
              'flex min-h-14 items-center justify-center gap-2 rounded-[14px] px-2 font-bold transition-colors duration-[320ms]',
              state && x.tier === tier ? x.on : 'bg-surface-2 text-ink-muted',
            )}
          >
            <x.Icon className="size-5 shrink-0" />
            <span className="truncate">{t(x.label)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function calmReasons(state: CalmState, lang: Lang, t: ReturnType<typeof useT>): string[] {
  const hz = new Intl.NumberFormat(lang === 'ms' ? 'ms-MY' : 'en-GB', { maximumFractionDigits: 1 }).format(state.frequencyHz);
  return state.reasons.map((r) => (r === 'fast-movement' ? t('reasonFast') : r === 'repetitive-rhythm' ? t('reasonRhythm', { hz }) : t('reasonSudden')));
}

const FB: Record<NonNullable<EventRecord['feedback']> | 'none', { label: MsgKey; Icon: typeof CircleCheck; cls: string }> = {
  yes: { label: 'fbYes', Icon: CircleCheck, cls: 'text-calm-fg' },
  no: { label: 'fbNo', Icon: Pencil, cls: 'text-rising-fg' },
  new: { label: 'fbNew', Icon: Sparkles, cls: 'text-primary' },
  none: { label: 'fbNone', Icon: CircleQuestionMark, cls: 'text-ink-muted' },
};

export function FeedbackState({ fb }: { fb: EventRecord['feedback'] }) {
  const t = useT();
  const c = FB[fb ?? 'none'];
  return (
    <span className={clsx('inline-flex items-center gap-1 text-sm font-bold', c.cls)}>
      <c.Icon aria-hidden className="size-4" />
      {t(c.label)}
    </span>
  );
}

/** Marks a record produced by the simulated demo performer (never a real person). */
export function SimulatedTag() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-muted" data-testid="simulated-tag">
      <FlaskConical aria-hidden className="size-3.5" />
      {t('evSimulated')}
    </span>
  );
}

/** Recent events list (newest first). */
export function EventList({ events, signals, lang }: { events: EventRecord[]; signals: Signal[]; lang: Lang }) {
  const t = useT();
  if (events.length === 0) return <p className="text-ink-muted">{t('recentEmpty')}</p>;
  return (
    <ul className="divide-y divide-border-soft" data-testid="recent-events">
      {events.map((e) => {
        const s = e.signalId ? signals.find((x) => x.id === e.signalId) : undefined;
        const Icon = e.kind === 'signal' ? iconFor(s?.icon ?? '') : TIERS.find((x) => x.tier === e.tier)?.Icon ?? Leaf;
        return (
          <li key={e.id} className="flex items-center gap-3 py-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[16px] bg-surface-2 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {e.kind === 'signal' ? (s ? pickText(s.name, lang) : t('deletedSignal')) : t('eventTier', { tier: t(tierLabel(e.tier ?? 'calm')) })}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {e.kind === 'signal' && <FeedbackState fb={e.feedback} />}
                {e.source === 'demo' && <SimulatedTag />}
              </div>
            </div>
            <time dateTime={e.ts} className="text-sm text-ink-muted tabular">
              {timeOfDay(e.ts, lang)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
