import { CircleAlert, CircleCheck, FlaskConical, Info, RotateCcw, ShieldQuestion, BadgeCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PracticeFeedback } from '../../../engine/sign/feedback';
import type { Sign, SignPack } from '../../../engine/sign/pack';
import { useT, type Lang, type MsgKey, type TFn } from '../../../i18n';
import { Countdown, RecordRing } from '../../components/TeachBits';

const LANG_KEY: Record<string, MsgKey> = { ASL: 'spLangASL', BIM: 'spLangBIM', DEMO: 'spLangDEMO' };

/** Every pack is labelled with its language — never "sign language" generically. */
export function languageLabel(code: string, t: TFn): string {
  const k = LANG_KEY[code];
  return k ? t(k) : code;
}

export const packTitle = (p: SignPack, lang: Lang) => (lang === 'ms' && p.title_ms ? p.title_ms : p.title_en);
export const glossOf = (s: Sign, lang: Lang) => (lang === 'ms' && s.gloss_ms ? s.gloss_ms : s.gloss);

/** Language, demo and review badges — icon + text, never colour alone. */
export function PackBadges({ pack }: { pack: SignPack }) {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-2 text-sm font-semibold" aria-label={t('spTitle')}>
      <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3">{languageLabel(pack.language, t)}</li>
      {pack.demo && (
        <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-rising-bg px-3 text-rising-fg" data-testid="demo-badge">
          <FlaskConical aria-hidden className="size-4" />
          {t('spDemoBadge')}
        </li>
      )}
      {pack.reviewStatus === 'reviewed' && pack.reviewedBy ? (
        <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-calm-bg px-3 text-calm-fg">
          <BadgeCheck aria-hidden className="size-4" />
          {t('spReviewed', { name: pack.reviewedBy })}
        </li>
      ) : (
        <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-ink-muted" data-testid="review-status">
          <ShieldQuestion aria-hidden className="size-4" />
          {t('spUnreviewed')}
        </li>
      )}
    </ul>
  );
}

/** The framing every sign page carries: practice aid, language note, limits. */
export function FramingNotes() {
  const t = useT();
  return (
    <div className="space-y-2 text-ink-muted">
      <p className="flex gap-2">
        <Info aria-hidden className="mt-1 size-4 shrink-0" />
        <span data-testid="practice-aid">{t('spPracticeAid')}</span>
      </p>
      <p className="pl-6">{t('spLangNote')}</p>
      <p className="pl-6">{t('spLimits')}</p>
    </div>
  );
}

export function PackMeta({ pack, actions }: { pack: SignPack; actions?: (creditId: string, name: string) => ReactNode }) {
  const t = useT();
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
      <dt className="font-bold">{t('spLicence')}</dt>
      <dd data-testid="pack-licence">{pack.licence}</dd>
      <dt className="font-bold">{t('spSource')}</dt>
      <dd>{pack.source}</dd>
      <dt className="font-bold">{t('spCredits')}</dt>
      <dd data-testid="pack-credits">
        {pack.signerCredits.length === 0 ? (
          t('spNoCredits')
        ) : (
          <ul className="space-y-1">
            {pack.signerCredits.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span>{c.name || t('spCreditAnon')}</span>
                {actions?.(c.id, c.name || t('spCreditAnon'))}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
  );
}

/** Countdown / recording ring layered on the camera stage. */
export function CaptureOverlay({ phase, count, progress }: { phase: 'idle' | 'countdown' | 'recording'; count: number; progress: number }) {
  if (phase === 'countdown')
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        <Countdown n={count} />
      </div>
    );
  if (phase === 'recording')
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16">
        <RecordRing progress={progress} />
      </div>
    );
  return null;
}

/** Practice feedback: icon + text (+ colour), encouraging, never a score. */
export function FeedbackView({ fb, glossFor, isStatic }: { fb: PracticeFeedback; glossFor: (id: string) => string; isStatic: boolean }) {
  const t = useT();
  if (fb.verdict === 'close')
    return (
      <p role="status" className="flex items-start gap-3 rounded-[16px] bg-calm-bg p-4 font-bold text-calm-fg" data-testid="practice-feedback">
        <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0" />
        {t('spClose')}
      </p>
    );
  if (fb.verdict === 'not-seen')
    return (
      <p role="status" className="flex items-start gap-3 rounded-[16px] bg-surface-2 p-4 font-bold" data-testid="practice-feedback">
        <CircleAlert aria-hidden className="mt-0.5 size-6 shrink-0" />
        {t('spNotSeen')}
      </p>
    );
  const part =
    isStatic && fb.component === 'movement'
      ? t('spHoldStill')
      : fb.component
        ? t((`spDiffer_${fb.component}` as const) satisfies MsgKey)
        : '';
  return (
    <div role="status" className="space-y-1 rounded-[16px] bg-rising-bg p-4 text-rising-fg" data-testid="practice-feedback">
      <p className="flex items-start gap-3 font-bold">
        <RotateCcw aria-hidden className="mt-0.5 size-6 shrink-0" />
        {t('spTryAgain')}
      </p>
      {part && <p className="pl-9">{part}</p>}
      {fb.lookedLike && <p className="pl-9">{t('spLookedLike', { gloss: glossFor(fb.lookedLike) })}</p>}
    </div>
  );
}
