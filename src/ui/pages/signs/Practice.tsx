import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { CLIP_N } from '../../../engine/constants';
import { DEMO_GESTURE } from '../../../engine/sign/demoPack';
import { practiceFeedback, type PracticeFeedback } from '../../../engine/sign/feedback';
import { useT } from '../../../i18n';
import { listSignProgress, recordSignAttempt } from '../../../store/repo';
import type { SignProgress } from '../../../store/db';
import { useSettings } from '../../../store/useApp';
import { modelsFor, useSignPacks } from '../../../store/useSignPacks';
import { useSession } from '../../../store/useSession';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Controls';
import { SignalGlyph } from '../../components/SignalGlyph';
import { SourceControls, VideoPanel } from '../../components/VideoPanel';
import { useSignCapture, windowFor } from '../../hooks/useSignCapture';
import { CaptureOverlay, FeedbackView, glossOf, PackBadges } from './SignBits';

export default function Practice() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const skeleton = useSettings((s) => s.skeletonTeach);
  const setSettings = useSettings((s) => s.set);
  const { packId, signId } = useParams<{ packId: string; signId: string }>();
  const { packs, load } = useSignPacks();
  useEffect(() => void load(), [load]);
  const pack = packs.find((p) => p.id === packId);
  const sign = pack?.signs.find((s) => s.id === signId);
  const phase = useSession((s) => s.phase);
  const kind = useSession((s) => s.kind);
  const cap = useSignCapture();
  const [fb, setFb] = useState<PracticeFeedback | null>(null);
  const [prog, setProg] = useState<SignProgress | null>(null);
  const [performer, setPerformer] = useState(signId);

  useEffect(() => {
    setPerformer(signId);
    setFb(null);
    if (!packId) return;
    void listSignProgress(packId)
      .then((ps) => setProg(ps.find((p) => p.signId === signId) ?? null))
      .catch(() => undefined);
  }, [packId, signId]);

  if (!pack || !sign) {
    return (
      <Link href="/signs" className="font-bold text-primary underline underline-offset-4">
        {t('spBack')}
      </Link>
    );
  }
  const models = modelsFor(pack);
  const reference = models.clips.get(sign.id)?.[0];
  const glossFor = (id: string) => {
    const s = pack.signs.find((x) => x.id === id);
    return s ? glossOf(s, lang) : id;
  };
  const demoChoices = pack.demo && kind === 'demo' ? pack.signs.filter((s) => DEMO_GESTURE[s.id]) : [];

  const check = async () => {
    setFb(null);
    const r = await cap.capture(kind === 'demo' && performer ? (DEMO_GESTURE[performer] ?? null) : null);
    if (!r) return;
    const w = windowFor(r, sign.type);
    const result: PracticeFeedback = w.clip ? practiceFeedback(w.clip, w.energy, sign.id, models) : { verdict: 'not-seen', component: null, ratios: { handshape: 0, movement: 0, location: 0 } };
    setFb(result);
    if (result.verdict !== 'not-seen') {
      setProg(await recordSignAttempt(pack.id, sign.id, result.verdict === 'close', new Date().toISOString()).catch(() => null));
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href={`/signs/pack/${pack.id}`} className="inline-flex min-h-12 items-center font-bold text-primary">
          ← {pack.title_en}
        </Link>
        <h1 className="text-2xl sm:text-3xl" data-testid="practice-gloss">
          {sign.gloss}
          {sign.gloss_ms && <span className="block text-lg font-normal text-ink-muted">{sign.gloss_ms}</span>}
        </h1>
        <PackBadges pack={pack} />
        <p className="text-ink-muted">{t(sign.type === 'static' ? 'spStatic' : 'spDynamic')}</p>
        {sign.confusableWith.length > 0 && <p className="font-semibold text-rising-fg">{t('spConfusable', { list: sign.confusableWith.map(glossFor).join(', ') })}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <VideoPanel skeleton={skeleton} onSkeleton={(v) => setSettings({ skeletonTeach: v })} overlay={<CaptureOverlay phase={cap.phase} count={cap.count} progress={cap.progress} />} />
          <Button size="lg" className="w-full" disabled={phase !== 'running' || cap.busy} loading={cap.busy} onClick={() => void check()}>
            {cap.busy ? t('spChecking') : t('spCheck')}
          </Button>
          {fb && <FeedbackView fb={fb} glossFor={glossFor} isStatic={sign.type === 'static'} />}
          <SourceControls gestures={[]} />
          {demoChoices.length > 0 && (
            <fieldset className="source-controls rounded-[16px] bg-surface p-4">
              <legend className="font-bold">{t('spPerformerDoes')}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {demoChoices.map((s) => (
                  <Chip key={s.id} selected={performer === s.id} onClick={() => setPerformer(s.id)}>
                    {glossOf(s, lang)}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <Card className="space-y-4 self-start" aria-labelledby="ref-h">
          <h2 id="ref-h" className="text-lg">
            {t('spReference')}
          </h2>
          {reference && (
            <div className="flex justify-center">
              <SignalGlyph data={reference} n={CLIP_N} playing label={t('spReferenceLabel', { gloss: sign.gloss })} />
            </div>
          )}
          {sign.notes && <p className="text-sm text-ink-muted">{sign.notes}</p>}
          {prog && (
            <div className="space-y-1 border-t border-border-soft pt-3 text-sm" data-testid="practice-progress">
              <p>{t('spProgress', { n: prog.attempts })}</p>
              {prog.streak >= 2 && <p className="font-bold text-calm-fg">{t('spRun', { n: prog.streak })}</p>}
              {prog.bestStreak >= 2 && prog.streak < 2 && <p>{t('spBest', { n: prog.bestStreak })}</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
