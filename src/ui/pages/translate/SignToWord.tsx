import { CircleAlert, CircleHelp, Copy, Eraser, RotateCcw, Undo2 } from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DEMO_GESTURE } from '../../../engine/sign/demoPack';
import type { SignPack } from '../../../engine/sign/pack';
import { rankCandidates, type RankResult } from '../../../engine/translate/candidates';
import { stripText } from '../../../engine/translate/compose';
import { useT, type MsgKey } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { modelsFor } from '../../../store/useSignPacks';
import { useTranslateCam } from '../../../store/translateSession';
import { useTranslate } from '../../../store/useTranslate';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip, Switch } from '../../components/Controls';
import { pickVoice, speak } from '../../hooks/speech';
import { CaptureOverlay, glossOf } from '../signs/SignBits';
import { SkeletonPlayer } from './SkeletonPlayer';
import { TranslateStage, useTranslateCamera } from './TranslateStage';
import { useTranslateCapture, windowsOf } from './useTranslateCapture';

export const confidenceKey = (c: number): MsgKey => (c >= 0.8 ? 'trConfHigh' : c >= 0.6 ? 'trConfMid' : 'trConfLow');

/** Sign → word: capture one sign, show up to 3 candidates from the pack, the person confirms. */
export function SignToWord({ pack }: { pack: SignPack }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { source, setSource, strip, stripDo, speak: speakOn, setSpeak } = useTranslate();
  const src = source ?? (pack.demo ? 'demo' : 'camera');
  useTranslateCamera(src, true);
  const cam = useTranslateCam();
  const cap = useTranslateCapture();
  const models = modelsFor(pack);
  const demoSigns = useMemo(() => (pack.demo ? pack.signs.filter((s) => DEMO_GESTURE[s.id]) : []), [pack]);
  const [performer, setPerformer] = useState(demoSigns[0]?.id ?? '');
  const [result, setResult] = useState<(RankResult & { endedAt: number }) | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [replay, setReplay] = useState<string | null>(null);
  const canSpeak = !!pickVoice(lang);
  const gloss = (id: string) => {
    const s = pack.signs.find((x) => x.id === id);
    return s ? glossOf(s, lang) : id;
  };

  // latency: from the end of the sign window to the result being on screen
  useLayoutEffect(() => {
    if (result) setLatency(Math.round(performance.now() - result.endedAt));
  }, [result]);

  const captureSign = async () => {
    setResult(null);
    setReplay(null);
    const r = await cap.capture(cam.kind === 'demo' ? (DEMO_GESTURE[performer] ?? null) : null);
    if (!r) return;
    const { move, held } = windowsOf(r.frames);
    setResult({ ...rankCandidates(move, held, models), endedAt: r.endedAt });
  };

  const confirm = (signId: string) => {
    stripDo({ type: 'add', signId });
    if (speakOn && canSpeak) speak(gloss(signId), lang);
    setResult(null);
    setReplay(null);
  };

  return (
    // phone order: camera + Capture, result, performer, strip · desktop: camera column | result column
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-4 lg:col-start-1 lg:row-start-1">
        <TranslateStage source={src} onSource={setSource} overlay={<CaptureOverlay phase={cap.phase} count={cap.count} progress={cap.progress} />} />
        <Button size="lg" className="w-full" disabled={cam.phase !== 'running' || cap.busy} loading={cap.busy} onClick={() => void captureSign()}>
          {cap.busy ? t('trCapturing') : t('trCapture')}
        </Button>
      </div>

      <div className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <Card aria-labelledby="tr-result-h" className="min-h-64 space-y-4" data-testid="translate-result" {...(latency !== null && result ? { 'data-latency': latency } : {})}>
          <h2 id="tr-result-h" className="text-lg">
            {t('trCandidates')}
          </h2>
          {!result ? null : result.quality === 'no-hands' ? (
            <p role="status" className="flex items-start gap-3 rounded-[16px] bg-surface-2 p-4 font-bold">
              <CircleAlert aria-hidden className="mt-0.5 size-6 shrink-0" />
              {t('trLowQuality')}
            </p>
          ) : result.notSure ? (
            <p role="status" className="flex items-start gap-3 rounded-[16px] bg-surface-2 p-4 text-lg font-bold" data-testid="translate-not-sure">
              <CircleHelp aria-hidden className="mt-0.5 size-6 shrink-0" />
              {t('trNotSure')}
            </p>
          ) : (
            <div role="status">
            <ul className="space-y-3">
              {result.candidates.map((c) => {
                const s = pack.signs.find((x) => x.id === c.signId);
                if (!s) return null;
                const clip = models.clips.get(s.id)?.[0];
                return (
                  <li key={c.signId} className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => confirm(c.signId)}
                        className="press flex min-h-16 flex-1 flex-col items-start justify-center rounded-[18px] border border-border bg-surface px-5 py-3 text-left hover:bg-primary-soft"
                        data-testid="translate-candidate"
                      >
                        <span className="text-xl font-bold">{s.gloss}</span>
                        {s.gloss_ms && <span className="text-ink-muted">{s.gloss_ms}</span>}
                        <span className="text-sm font-semibold text-ink-muted">{t(confidenceKey(c.confidence))}</span>
                      </button>
                      <Button variant="secondary" className="min-h-16 shrink-0" aria-expanded={replay === s.id} aria-label={`${t('trReplay')}: ${s.gloss}`} icon={<RotateCcw aria-hidden className="size-5" />} onClick={() => setReplay(replay === s.id ? null : s.id)}>
                        <span className="hidden sm:inline">{t('trReplay')}</span>
                      </Button>
                    </div>
                    {replay === s.id && clip && <SkeletonPlayer data={clip} n={16} label={t('trReplayOf', { gloss: s.gloss })} {...(s.notes ? { notes: s.notes } : {})} />}
                  </li>
                );
              })}
            </ul>
            </div>
          )}
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {!result.notSure && result.quality === 'ok' && (
                <Button variant="secondary" onClick={() => setResult(null)}>
                  {t('trNoneOfThese')}
                </Button>
              )}
              {latency !== null && <p className="text-sm text-ink-muted tabular">{t('trLatency', { ms: latency })}</p>}
            </div>
          )}
        </Card>

        <Card aria-labelledby="tr-strip-h" className="space-y-3" data-testid="translate-strip">
          <h2 id="tr-strip-h" className="text-lg">
            {t('trStripTitle')}
          </h2>
          <p className="text-sm text-ink-muted">{t('trStripNote')}</p>
          {strip.items.length === 0 ? (
            <p className="text-ink-muted">{t('trStripEmpty')}</p>
          ) : (
            <ol className="flex flex-wrap gap-2" data-testid="translate-strip-items">
              {strip.items.map((id, i) => (
                <li key={`${id}-${i}`} className="rounded-full bg-primary-soft px-4 py-2 font-bold text-primary">
                  {gloss(id)}
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Copy aria-hidden className="size-5" />}
              disabled={strip.items.length === 0}
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(stripText(strip.items, gloss))
                  .then(() => toast.success(t('trCopied')))
                  .catch(() => undefined)
              }
            >
              {t('trCopy')}
            </Button>
            <Button variant="secondary" icon={<Undo2 aria-hidden className="size-5" />} disabled={strip.past.length === 0} onClick={() => stripDo({ type: 'undo' })}>
              {t('trUndo')}
            </Button>
            <Button variant="secondary" icon={<Eraser aria-hidden className="size-5" />} disabled={strip.items.length === 0} onClick={() => stripDo({ type: 'clear' })}>
              {t('trClear')}
            </Button>
          </div>
          {canSpeak && <Switch label={t('trSpeak')} hint={t('trSpeakHint')} checked={speakOn} onChange={setSpeak} />}
        </Card>
      </div>
      {cam.kind === 'demo' && demoSigns.length > 0 && (
        <fieldset className="source-controls rounded-[16px] bg-surface p-4 lg:col-start-1 lg:row-start-2">
          <legend className="font-bold">{t('spPerformerDoes')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {demoSigns.map((s) => (
              <Chip key={s.id} selected={performer === s.id} onClick={() => setPerformer(s.id)}>
                {glossOf(s, lang)}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
