import { CircleHelp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { CLIP_N, D, EMIT_CONFIDENCE, EVAL_INTERVAL_MS, IDLE_ENERGY } from '../../../engine/constants';
import { DEMO_GESTURE } from '../../../engine/sign/demoPack';
import { recogniseDynamic, recogniseStatic } from '../../../engine/sign/models';
import { featureMotionEnergy } from '../../../engine/motion';
import { resampleClip } from '../../../engine/resample';
import type { FeatureFrame } from '../../../engine/types';
import { useT } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { modelsFor, useSignPacks } from '../../../store/useSignPacks';
import { session, useSession } from '../../../store/useSession';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfidenceBar } from '../../components/LiveBits';
import { SourceControls, VideoPanel } from '../../components/VideoPanel';
import { glossOf, PackBadges } from './SignBits';

/** A candidate is shown only after two agreeing evaluations, and held briefly so it can be confirmed. */
const HOLD_MS = 3000;

export default function Recognise() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const skeleton = useSettings((s) => s.skeletonLive);
  const setSettings = useSettings((s) => s.set);
  const { packId } = useParams<{ packId: string }>();
  const { packs, load } = useSignPacks();
  useEffect(() => void load(), [load]);
  const pack = packs.find((p) => p.id === packId);
  const kind = useSession((s) => s.kind);
  const [cand, setCand] = useState<{ signId: string; confidence: number; at: number } | null>(null);
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const last = useRef<string | null>(null);
  const shown = useRef<{ signId: string; confidence: number; at: number } | null>(null);

  useEffect(() => {
    if (!pack) return;
    const models = modelsFor(pack);
    const buf: FeatureFrame[] = [];
    let lastEval = -Infinity;
    const off = session.subscribeFeatures((f) => {
      buf.push(f);
      while (buf.length && buf[0]!.t < f.t - 3000) buf.shift();
      if (f.t - lastEval < EVAL_INTERVAL_MS) return;
      lastEval = f.t;
      const win = buf.filter((x) => x.t >= f.t - 2000);
      if (win.length < 4 || win[win.length - 1]!.t - win[0]!.t < 1200) return;
      const energy = featureMotionEnergy(win);
      let id: string | null = null;
      let conf = 0;
      if (energy < IDLE_ENERGY) {
        const held = resampleClip(buf.filter((x) => x.t >= f.t - 1000), CLIP_N, D);
        const r = held && models.static.length ? recogniseStatic(held, models) : null;
        if (r?.signId && r.confidence >= EMIT_CONFIDENCE) [id, conf] = [r.signId, r.confidence];
      } else {
        const clip = resampleClip(win, CLIP_N, D);
        const r = clip && models.dynamic.length ? recogniseDynamic(clip, models, energy) : null;
        if (r?.signalId && r.confidence >= EMIT_CONFIDENCE) [id, conf] = [r.signalId, r.confidence];
      }
      if (id && id === last.current) {
        if (shown.current?.signId !== id) setAnswer(null);
        shown.current = { signId: id, confidence: conf, at: f.t };
        setCand(shown.current);
      } else if (shown.current && f.t - shown.current.at > HOLD_MS) {
        shown.current = null;
        setCand(null);
      }
      last.current = id;
    });
    return off;
  }, [pack]);

  if (!pack) {
    return (
      <Link href="/signs" className="font-bold text-primary underline underline-offset-4">
        {t('spBack')}
      </Link>
    );
  }
  const sign = cand ? pack.signs.find((s) => s.id === cand.signId) : undefined;
  const demoGestures = pack.demo && kind === 'demo' ? pack.signs.map((s) => DEMO_GESTURE[s.id]).filter((g): g is NonNullable<typeof g> => !!g) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href={`/signs/pack/${pack.id}`} className="inline-flex min-h-12 items-center font-bold text-primary">
          ← {pack.title_en}
        </Link>
        <h1 className="text-2xl sm:text-3xl">{t('spRecognise')}</h1>
        <PackBadges pack={pack} />
        <p className="text-ink-muted">{t('spRecogniseHint')}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <VideoPanel skeleton={skeleton} onSkeleton={(v) => setSettings({ skeletonLive: v })} />
          <SourceControls gestures={demoGestures} />
        </div>
        <Card className="space-y-4 self-start" aria-live="polite" data-testid="recognise-card">
          {sign && cand ? (
            <>
              <p className="text-2xl font-bold" data-testid="recognise-candidate">
                {glossOf(sign, lang)}
              </p>
              <ConfidenceBar confidence={cand.confidence} />
              {answer ? (
                <p className="font-semibold">{t('spThanks')}</p>
              ) : (
                <>
                  <p className="font-bold">{t('spIsThis', { gloss: glossOf(sign, lang) })}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setAnswer('yes')}>{t('spYes')}</Button>
                    <Button variant="secondary" onClick={() => setAnswer('no')}>
                      {t('spNo')}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 text-xl font-bold text-ink-muted" data-testid="recognise-not-sure">
              <CircleHelp aria-hidden className="size-6" />
              {t('spNotSure')}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
