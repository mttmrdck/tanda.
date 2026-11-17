import { clsx } from 'clsx';
import { CircleCheck, Info } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useT } from '../../i18n';
import type { CoachAdvice } from '../../engine/coach';
import { Chip, SegmentedControl, TextField } from './Controls';
import { SIGNAL_ICONS } from './signalIcons';
import type { BiText, Category, Urgency } from '../../engine/types';
import { Button } from './Button';
import type { MsgKey } from '../../i18n';

export const CATEGORIES: { value: Category; label: MsgKey }[] = [
  { value: 'need', label: 'catNeed' },
  { value: 'feeling', label: 'catFeeling' },
  { value: 'safety', label: 'catSafety' },
  { value: 'request', label: 'catRequest' },
  { value: 'social', label: 'catSocial' },
];
export const URGENCIES: { value: Urgency; label: MsgKey }[] = [
  { value: 'low', label: 'urgLow' },
  { value: 'normal', label: 'urgNormal' },
  { value: 'high', label: 'urgHigh' },
];

export interface SignalDraft {
  name: BiText;
  meaning: BiText;
  category: Category;
  urgency: Urgency;
  icon: string;
}

export const emptyDraft = (): SignalDraft => ({ name: { en: '', ms: '' }, meaning: { en: '', ms: '' }, category: 'need', urgency: 'normal', icon: 'water' });

export function draftValid(d: SignalDraft): boolean {
  return (!!d.name.en.trim() && !!d.meaning.en.trim()) || (!!d.name.ms.trim() && !!d.meaning.ms.trim());
}

/** Signal name/meaning (both languages), category, urgency and pictogram. */
export function SignalForm({ draft, onChange, lang, error }: { draft: SignalDraft; onChange: (d: SignalDraft) => void; lang: 'en' | 'ms'; error?: string }) {
  const t = useT();
  const first = lang;
  const second = lang === 'en' ? 'ms' : 'en';
  const langName = (l: 'en' | 'ms') => t(l === 'en' ? 'langEn' : 'langMs');
  const set = (patch: Partial<SignalDraft>) => onChange({ ...draft, ...patch });
  const block = (l: 'en' | 'ms', isSecond: boolean) => (
    <fieldset className="space-y-4 rounded-[16px] border border-border-soft p-4" lang={l}>
      <legend className="px-1 font-bold">
        {langName(l)}
        {isSecond && <span className="font-normal text-ink-muted"> ({t('optional')})</span>}
      </legend>
      <TextField label={t('teachName')} hint={t('teachNameHint')} value={draft.name[l]} onChange={(v) => set({ name: { ...draft.name, [l]: v } })} maxLength={40} lang={l} />
      <TextField label={t('teachMeaning')} hint={t('teachMeaningHint')} value={draft.meaning[l]} onChange={(v) => set({ meaning: { ...draft.meaning, [l]: v } })} maxLength={140} lang={l} />
      {isSecond && (draft.name[first] || draft.meaning[first]) && !draft.name[l] && !draft.meaning[l] && (
        <Button variant="quiet" onClick={() => set({ name: { ...draft.name, [l]: draft.name[first] }, meaning: { ...draft.meaning, [l]: draft.meaning[first] } })}>
          {t('copyFrom', { lang: langName(first) })}
        </Button>
      )}
    </fieldset>
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {block(first, false)}
        {block(second, true)}
      </div>
      {error && (
        <p role="alert" className="font-bold text-high-fg">
          {error}
        </p>
      )}
      <fieldset>
        <legend className="font-bold">{t('teachCategory')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c.value} selected={draft.category === c.value} onClick={() => set({ category: c.value })}>
              {t(c.label)}
            </Chip>
          ))}
        </div>
      </fieldset>
      <SegmentedControl label={t('teachUrgency')} value={draft.urgency} onChange={(urgency) => set({ urgency })} options={URGENCIES.map((u) => ({ value: u.value, label: t(u.label) }))} />
      <fieldset>
        <legend className="font-bold">{t('teachIcon')}</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {SIGNAL_ICONS.map(({ key, Icon, label }) => (
            <label
              key={key}
              className={clsx(
                'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border p-2 text-xs font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                draft.icon === key ? 'border-primary bg-primary-soft text-primary' : 'border-border-soft bg-surface text-ink hover:bg-surface-2',
              )}
            >
              <input type="radio" name="signal-icon" value={key} checked={draft.icon === key} onChange={() => set({ icon: key })} className="sr-only" />
              <Icon aria-hidden className="size-6" />
              {t(label)}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Large 3-2-1 countdown shown over the stage. Numbers, not colour. */
export function Countdown({ n }: { n: number }) {
  const t = useT();
  return (
    <div className="absolute inset-0 grid place-items-center bg-[rgb(20_24_29/0.35)]" aria-live="assertive">
      <div className="grid size-36 place-items-center rounded-full bg-surface text-center shadow-soft">
        <span className="sr-only">{t('teachGetReady')}: </span>
        <span key={n} className="countdown-num font-display text-6xl font-semibold text-primary tabular">
          {n}
        </span>
      </div>
    </div>
  );
}

/** Recording indicator: progress ring (static ring under reduced motion). */
export function RecordRing({ progress }: { progress: number }) {
  const t = useT();
  const reduce = useReducedMotion();
  const C = 2 * Math.PI * 22;
  return (
    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-surface px-3 py-2 font-bold shadow-soft" role="status">
      <svg aria-hidden viewBox="0 0 52 52" className="size-8 -rotate-90">
        <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border-soft)" strokeWidth="6" />
        <circle cx="26" cy="26" r="22" fill="none" stroke="var(--high-fg)" strokeWidth="6" strokeDasharray={C} strokeDashoffset={reduce ? 0 : C * (1 - progress)} strokeLinecap="round" />
      </svg>
      {t('teachRecording')}
    </div>
  );
}

const COACH_TEXT: Record<CoachAdvice['code'], MsgKey> = {
  ok: 'coachOk',
  inconsistent: 'coachInconsistent',
  'too-similar': 'coachTooSimilar',
  'too-few': 'coachTooFew',
  'poor-visibility': 'coachVisibility',
};

/** Friendly coach result: green tick for ok, amber note otherwise. Never says "fail". */
export function CoachCard({ advice, similarName }: { advice: CoachAdvice; similarName?: string }) {
  const t = useT();
  const ok = advice.code === 'ok';
  return (
    <div data-testid={`coach-${advice.code}`} className={clsx('flex gap-3 rounded-[16px] p-4', ok ? 'bg-calm-bg text-calm-fg' : 'bg-rising-bg text-rising-fg')}>
      {ok ? <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0" /> : <Info aria-hidden className="mt-0.5 size-6 shrink-0" />}
      <p className="font-bold">{t(COACH_TEXT[advice.code], { name: similarName ?? '' })}</p>
    </div>
  );
}
