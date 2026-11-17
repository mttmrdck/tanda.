import { Delete, Eraser, Space, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CLIP_N, D, EVAL_INTERVAL_MS } from '../../../engine/constants';
import { DEMO_GESTURE } from '../../../engine/sign/demoPack';
import type { SignPack } from '../../../engine/sign/pack';
import { rankCandidates, type Candidate } from '../../../engine/translate/candidates';
import { alphabet, fingerspellWord, letterOf } from '../../../engine/translate/search';
import { bestSubWindow, featureMotionEnergy } from '../../../engine/motion';
import { resampleClip } from '../../../engine/resample';
import { heldWindow, MOVE_MS } from '../../../engine/sign/window';
import type { FeatureFrame } from '../../../engine/types';
import { useT } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { modelsFor } from '../../../store/useSignPacks';
import { translateSession, useTranslateCam } from '../../../store/translateSession';
import { useTranslate } from '../../../store/useTranslate';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip, TextField } from '../../components/Controls';
import { glossOf } from '../signs/SignBits';
import { confidenceKey } from './SignToWord';
import { SkeletonPlayer } from './SkeletonPlayer';
import { SpellSteps } from './SpellSteps';
import { TranslateStage, useTranslateCamera } from './TranslateStage';

/** A candidate is shown briefly after the hand moves on, so it can be tapped. */
const HOLD_MS = 1500;

/** Fingerspelling: letters seen by the camera are confirmed one at a time; or a typed word is spelled out. */
export function Fingerspell({ pack }: { pack: SignPack }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { source, setSource, word, wordDo } = useTranslate();
  const abc = useMemo(() => alphabet(pack), [pack]);
  const ids = useMemo(() => new Set([...abc.values()].map((s) => s.id)), [abc]);
  const src = source ?? (pack.demo ? 'demo' : 'camera');
  useTranslateCamera(src, abc.size > 0);
  const cam = useTranslateCam();
  const models = modelsFor(pack);
  const [seen, setSeen] = useState<{ list: Candidate[]; at: number } | null>(null);
  const [typed, setTyped] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const steps = useMemo(() => fingerspellWord(typed, pack), [typed, pack]);
  const label = (signId: string) => {
    const s = pack.signs.find((x) => x.id === signId);
    const l = s ? letterOf(s) : null;
    return l ? (pack.demo ? t('trDemoLetter', { ch: l }) : l) : signId;
  };

  useEffect(() => {
    if (ids.size === 0) return;
    const buf: FeatureFrame[] = [];
    let last = -Infinity;
    return translateSession.subscribeFeatures((f) => {
      buf.push(f);
      while (buf.length && buf[0]!.t < f.t - 2500) buf.shift();
      if (f.t - last < EVAL_INTERVAL_MS) return;
      last = f.t;
      const mv = bestSubWindow(buf, MOVE_MS);
      const hd = heldWindow(buf.filter((x) => x.t >= f.t - 1500));
      const r = rankCandidates(
        { clip: resampleClip(mv, CLIP_N, D), energy: featureMotionEnergy(mv) },
        { clip: resampleClip(hd, CLIP_N, D), energy: featureMotionEnergy(hd) },
        models,
        { only: ids },
      );
      if (r.candidates.length) setSeen({ list: r.candidates, at: f.t });
      else setSeen((s) => (s && f.t - s.at > HOLD_MS ? null : s));
    });
  }, [ids, models]);

  if (abc.size === 0) return <p className="rounded-[16px] bg-surface-2 p-4 font-bold">{t('trNoAlphabet')}</p>;
  const confusable = [...abc.values()].filter((s) => s.confusableWith.some((c) => ids.has(c)));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <h2 className="text-lg">{t('trSpellCamera')}</h2>
        <TranslateStage source={src} onSource={setSource} />
        {cam.kind === 'demo' && (
          <fieldset className="source-controls rounded-[16px] bg-surface p-4">
            <legend className="font-bold">{t('spPerformerDoes')}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...abc.values()]
                .filter((s) => DEMO_GESTURE[s.id])
                .map((s) => (
                  <Chip key={s.id} selected={false} onClick={() => translateSession.performDemo(DEMO_GESTURE[s.id]!)}>
                    {glossOf(s, lang)}
                  </Chip>
                ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="space-y-4">
        <Card className="space-y-3" aria-labelledby="fs-seen-h">
          <h2 id="fs-seen-h" className="text-lg">
            {t('trSpellSeen')}
          </h2>
          {(pack.language === 'ASL' || confusable.length > 0) && (
            <p className="flex items-start gap-2 font-semibold text-rising-fg">
              <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
              {pack.language === 'ASL' ? t('spAslConfusable') : t('spConfusable', { list: confusable.map((s) => label(s.id)).join(', ') })}
            </p>
          )}
          {!seen ? (
            <p className="text-ink-muted" data-testid="fs-none">
              {t('trSpellNone')}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-live="polite" data-testid="fs-candidates">
              {seen.list.map((c) => {
                const s = pack.signs.find((x) => x.id === c.signId);
                const l = s ? letterOf(s) : null;
                if (!l) return null;
                return (
                  <li key={c.signId}>
                    <button
                      type="button"
                      onClick={() => wordDo({ type: 'letter', ch: l })}
                      className="press flex min-h-16 min-w-20 flex-col items-center justify-center rounded-[18px] border border-border bg-surface px-4 hover:bg-primary-soft"
                    >
                      <span className="sr-only">{t('trAdd')} </span>
                      <span className="text-2xl font-bold">{label(c.signId)}</span>
                      <span className="text-xs font-semibold text-ink-muted">{t(confidenceKey(c.confidence))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-3" aria-labelledby="fs-word-h">
          <h2 id="fs-word-h" className="text-lg">
            {t('trWordBox')}
          </h2>
          <output className="block min-h-14 rounded-[14px] bg-surface-2 px-4 py-3 text-2xl font-bold tracking-widest" data-testid="fs-word" aria-live="polite">
            {word.text || <span className="text-base font-normal tracking-normal text-ink-muted">{t('trWordEmpty')}</span>}
          </output>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Space aria-hidden className="size-5" />} onClick={() => wordDo({ type: 'space' })}>
              {t('trSpace')}
            </Button>
            <Button variant="secondary" icon={<Delete aria-hidden className="size-5" />} disabled={!word.text} onClick={() => wordDo({ type: 'backspace' })}>
              {t('trBackspace')}
            </Button>
            <Button variant="secondary" icon={<Eraser aria-hidden className="size-5" />} disabled={!word.text} onClick={() => wordDo({ type: 'clear' })}>
              {t('trClear')}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3" aria-labelledby="fs-rev-h">
          <h2 id="fs-rev-h" className="text-lg">
            {t('trSpellReverse')}
          </h2>
          <TextField
            label={t('trSpellType')}
            value={typed}
            onChange={(v) => {
              setTyped(v);
              setSel(null);
            }}
            maxLength={24}
          />
          {steps.length > 0 && <SpellSteps steps={steps} pack={pack} selected={sel} onSelect={setSel} />}
          {sel !== null &&
            (() => {
              const st = steps[sel];
              const s = st?.signId ? pack.signs.find((x) => x.id === st.signId) : undefined;
              const clip = s ? models.clips.get(s.id)?.[0] : undefined;
              return s && clip ? <SkeletonPlayer data={clip} n={16} label={label(s.id)} {...(s.notes ? { notes: s.notes } : {})} /> : null;
            })()}
        </Card>
      </div>
    </div>
  );
}
