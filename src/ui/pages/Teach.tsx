import { clsx } from 'clsx';
import { Circle, CircleCheck, RotateCcw, Trash } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'wouter';
import { coachSignal, MIN_EXAMPLES } from '../../engine/coach';
import { CLIP_N, D, IDLE_ENERGY, MAX_INVALID_FRACTION } from '../../engine/constants';
import { bestSubWindow, featureMotionEnergy } from '../../engine/motion';
import { resampleClip } from '../../engine/resample';
import { TEACHABLE_GESTURES, type GestureName } from '../../engine/simulator';
import { pickText, useT, type MsgKey } from '../../i18n';
import { addExample, createSignal, RepoError } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { session, useSession } from '../../store/useSession';
import { useTeachDraft } from '../../store/useTeachDraft';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Controls';
import { SignalGlyph } from '../components/SignalGlyph';
import { Stepper } from '../components/Stepper';
import { CoachCard, Countdown, draftValid, emptyDraft, RecordRing, SignalForm, type SignalDraft } from '../components/TeachBits';
import { GESTURE_LABEL } from '../components/gestureLabels';
import { SourceControls, VideoPanel } from '../components/VideoPanel';

const TARGET = 5;
const RECORD_MS = 2500;
const CLIP_MS = 2000;

interface Take {
  id: number;
  clip: Float32Array;
  invalid: number;
}

type Phase = 'idle' | 'countdown' | 'recording' | 'review';

function useRecorder() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const list = timers.current;
    return () => {
      alive.current = false;
      list.forEach(clearTimeout);
    };
  }, []);
  const wait = (ms: number) =>
    new Promise<void>((r) => {
      timers.current.push(setTimeout(r, ms));
    });

  /** countdown 3-2-1, then capture; resolves with the processed take or a notice key */
  const record = async (performer: GestureName | null): Promise<{ take: Omit<Take, 'id'> } | { notice: MsgKey } | null> => {
    setPhase('countdown');
    for (const n of [3, 2, 1]) {
      setCount(n);
      await wait(1000);
      if (!alive.current) return null;
    }
    setPhase('recording');
    setProgress(0);
    if (performer) session.performDemo(performer);
    const started = performance.now();
    const tick = setInterval(() => setProgress(Math.min((performance.now() - started) / RECORD_MS, 1)), 100);
    const res = await session.capture(RECORD_MS);
    clearInterval(tick);
    if (!alive.current) return null;
    const win = bestSubWindow(res.frames, CLIP_MS);
    const clip = res.invalidFraction > MAX_INVALID_FRACTION ? null : resampleClip(win, CLIP_N, D);
    if (!clip) {
      setPhase('idle');
      return { notice: 'coachVisibility' };
    }
    if (featureMotionEnergy(win) < IDLE_ENERGY) {
      setPhase('idle');
      return { notice: 'teachStill' };
    }
    setPhase('review');
    return { take: { clip, invalid: res.invalidFraction } };
  };
  return { phase, setPhase, count, progress, record };
}

export default function Teach() {
  const t = useT();
  const params = useParams<{ signalId?: string }>();
  const [, navigate] = useLocation();
  const lang = useSettings((s) => s.lang);
  const skeleton = useSettings((s) => s.skeletonTeach);
  const setSettings = useSettings((s) => s.set);
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const examples = useData((s) => s.examples);
  const sessionPhase = useSession((s) => s.phase);
  const sourceKind = useSession((s) => s.kind);

  const addTo = params.signalId ? signals.find((s) => s.id === params.signalId) : undefined;
  const addMode = !!params.signalId;
  const steps: MsgKey[] = addMode ? ['stepRecord', 'stepCheck', 'stepSave'] : ['stepName', 'stepRecord', 'stepCheck', 'stepSave'];
  const [step, setStep] = useState(0);
  const stepKey = steps[step]!;

  const [draft, setDraft] = useState<SignalDraft>(emptyDraft);
  const [draftError, setDraftError] = useState('');
  const preloaded = useTeachDraft((s) => s.preloaded);
  const [takes, setTakes] = useState<Take[]>(() => (preloaded ? [{ id: 0, clip: preloaded, invalid: 0 }] : []));
  const [usedPreload] = useState(!!preloaded);
  const [pending, setPending] = useState<Omit<Take, 'id'> | null>(null);
  const [notice, setNotice] = useState<MsgKey | null>(null);
  const [performer, setPerformer] = useState<GestureName>('wave');
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState('');
  const nextId = useRef(1);
  const rec = useRecorder();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (preloaded) useTeachDraft.getState().set(null);
  }, [preloaded]);
  useEffect(() => {
    if (step > 0) heading.current?.focus();
  }, [step]);

  const startTake = async () => {
    setNotice(null);
    setPending(null);
    if (sessionPhase !== 'running') {
      setNotice('teachNeedSource');
      return;
    }
    const r = await rec.record(sourceKind === 'demo' ? performer : null);
    if (!r) return;
    if ('notice' in r) setNotice(r.notice);
    else setPending(r.take);
  };

  const keep = () => {
    if (!pending) return;
    setTakes((ts) => [...ts, { ...pending, id: nextId.current++ }]);
    setPending(null);
    rec.setPhase('idle');
  };

  const coach = useMemo(() => {
    if (stepKey !== 'stepCheck') return null;
    const own = [...(addTo ? (examples[addTo.id] ?? []).map((e) => e.data) : []), ...takes.map((x) => x.clip)];
    const others = signals.filter((s) => s.id !== addTo?.id).map((s) => ({ signalId: s.id, examples: (examples[s.id] ?? []).map((e) => e.data) }));
    const invalid = takes.length ? takes.reduce((a, x) => a + x.invalid, 0) / takes.length : 0;
    return coachSignal({ examples: own, others, n: CLIP_N, d: D, invalidFraction: invalid });
  }, [stepKey, takes, signals, examples, addTo]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let signalId = addTo?.id;
      let name = addTo ? pickText(addTo.name, lang) : '';
      if (!addTo) {
        const s = await createSignal({ profileId: profile.id, ...draft, name: trimBi(draft.name), meaning: trimBi(draft.meaning) });
        signalId = s.id;
        name = pickText(s.name, lang);
      }
      for (const take of takes) await addExample({ signalId: signalId!, n: CLIP_N, d: D, data: take.clip, source: 'teach' });
      await useData.getState().refresh();
      setSavedName(name);
      setStep(steps.length - 1);
    } catch (err) {
      toast.error(t(err instanceof RepoError && err.code === 'quota' ? 'storageQuota' : 'storageError'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(emptyDraft());
    setTakes([]);
    setPending(null);
    setNotice(null);
    setStep(0);
    rec.setPhase('idle');
    if (addMode) navigate('/teach');
  };

  if (addMode && !addTo && stepKey !== 'stepSave') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl">{t('teachAddTitle')}</h1>
        <p role="alert">{t('teachUnknownSignal')}</p>
        <Link href="/signals" className="font-bold text-primary underline underline-offset-4">
          {t('navSignals')}
        </Link>
      </div>
    );
  }

  const busy = rec.phase === 'countdown' || rec.phase === 'recording';
  const enough = takes.length + (addTo ? (examples[addTo.id]?.length ?? 0) : 0) >= MIN_EXAMPLES;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl sm:text-3xl">{addTo ? t('teachAddingTo', { name: pickText(addTo.name, lang) }) : t('teachTitle')}</h1>
        <Stepper steps={steps.map((s) => t(s))} current={step} />
      </header>

      {stepKey === 'stepName' && (
        <Card aria-labelledby="step-h">
          <h2 id="step-h" ref={heading} tabIndex={-1} className="sr-only">
            {t('stepName')}
          </h2>
          <SignalForm draft={draft} onChange={(d) => { setDraft(d); if (draftValid(d)) setDraftError(''); }} lang={lang} error={draftError} />
          <div className="mt-8 flex justify-end">
            <Button
              size="lg"
              onClick={() => {
                if (!draftValid(draft)) {
                  setDraftError(t('teachNameRequired'));
                  return;
                }
                setStep(step + 1);
              }}
            >
              {t('next')}
            </Button>
          </div>
        </Card>
      )}

      {stepKey === 'stepRecord' && (
        <section aria-labelledby="step-h" className="grid grid-cols-1 gap-6 [--stage-reserve:400px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <h2 id="step-h" ref={heading} tabIndex={-1} className="text-xl outline-none">
              {t('teachRecordTitle')}
            </h2>
            <VideoPanel
              skeleton={skeleton}
              onSkeleton={(v) => setSettings({ skeletonTeach: v })}
              overlay={
                rec.phase === 'countdown' ? (
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <Countdown n={rec.count} />
                  </div>
                ) : rec.phase === 'recording' ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16">
                    <RecordRing progress={rec.progress} />
                  </div>
                ) : null
              }
            />

            {/* The main action sits right under the video so both are on screen together. */}
            <div className="space-y-3">
              {notice && (
                <p role="alert" className="rounded-[16px] bg-rising-bg p-3 font-bold text-rising-fg">
                  {t(notice)}
                </p>
              )}
              {rec.phase === 'review' && pending ? (
                <div className="flex flex-wrap items-center gap-4 rounded-[16px] border border-border-soft bg-surface-2 p-3">
                  <SignalGlyph data={pending.clip} n={CLIP_N} playing size="sm" label={t('glyphLabel', { name: t('teachTake', { n: takes.length + 1 }) })} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-bold">{t('teachTake', { n: takes.length + 1 })}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={keep}>{t('teachKeep')}</Button>
                      <Button variant="secondary" icon={<RotateCcw aria-hidden className="size-5" />} onClick={() => void startTake()}>
                        {t('teachRedo')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button size="lg" className="w-full" disabled={busy} loading={busy} onClick={() => void startTake()}>
                  {busy ? t(rec.phase === 'countdown' ? 'teachGetReady' : 'teachRecording') : t('teachRecordTake', { n: takes.length + 1 })}
                </Button>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold tabular" aria-live="polite" data-testid="take-count">
                  {t('teachTarget', { n: takes.length, target: TARGET })}
                </p>
                <ol className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: TARGET }, (_, i) => (
                    <li key={i}>{i < takes.length ? <CircleCheck className="size-6 text-calm-fg" /> : <Circle className="size-6 text-border" />}</li>
                  ))}
                </ol>
              </div>
            </div>

            <SourceControls gestures={[]} />
            {sourceKind === 'demo' && sessionPhase === 'running' && (
              <fieldset className="source-controls rounded-[16px] bg-surface p-4">
                <legend className="font-bold">{t('teachPerformerGesture')}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TEACHABLE_GESTURES.map((g) => (
                    <Chip key={g} selected={performer === g} onClick={() => setPerformer(g)}>
                      {t(GESTURE_LABEL[g])}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          <Card className="space-y-4 self-start">
            <p className="text-ink-muted">{t('teachRecordHint')}</p>
            {usedPreload && <p className="rounded-[16px] bg-primary-soft p-3 text-primary">{t('teachPreloaded')}</p>}
            <p className="text-sm text-ink-muted">{t('teachMinNote', { min: MIN_EXAMPLES, target: TARGET })}</p>

            {takes.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3" aria-label={t('teachTarget', { n: takes.length, target: TARGET })}>
                {takes.map((take, i) => (
                  <li key={take.id} className="relative rounded-[16px] border border-border-soft bg-surface p-1">
                    <SignalGlyph data={take.clip} n={CLIP_N} playing={false} size="sm" label={t('teachTake', { n: i + 1 })} />
                    <button
                      type="button"
                      onClick={() => setTakes((ts) => ts.filter((x) => x.id !== take.id))}
                      className="absolute right-0 top-0 grid size-12 place-items-center rounded-[16px] text-ink-muted hover:text-high-fg"
                      aria-label={t('teachRemove', { n: i + 1 })}
                    >
                      <Trash aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap justify-between gap-3 border-t border-border-soft pt-4">
              {!addMode && (
                <Button variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>
                  {t('back')}
                </Button>
              )}
              <Button disabled={!enough || busy || rec.phase === 'review'} onClick={() => setStep(step + 1)} className="ml-auto">
                {t('next')}
              </Button>
            </div>
          </Card>
        </section>
      )}

      {stepKey === 'stepCheck' && coach && (
        <Card aria-labelledby="step-h" className="space-y-4">
          <h2 id="step-h" ref={heading} tabIndex={-1} className="text-xl outline-none">
            {t('teachCheckTitle')}
          </h2>
          <div className="space-y-3">
            {coach.advice.map((a) => (
              <CoachCard key={a.code} advice={a} similarName={a.similarTo ? pickText(signals.find((s) => s.id === a.similarTo)?.name ?? { en: '', ms: '' }, lang) : undefined} />
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-border-soft pt-4">
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              {t('back')}
            </Button>
            <Button size="lg" loading={saving} onClick={() => void save()}>
              {saving ? t('teachSaving') : t(addMode ? 'teachSaveExamples' : 'teachSaveSignal')}
            </Button>
          </div>
        </Card>
      )}

      {stepKey === 'stepSave' && (
        <Card aria-labelledby="step-h" className="flex flex-col items-center gap-4 py-10 text-center">
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-calm-bg text-calm-fg">
            <CircleCheck className="size-9" />
          </span>
          <h2 id="step-h" ref={heading} tabIndex={-1} className="text-2xl outline-none">
            {t('teachSavedTitle', { name: savedName })}
          </h2>
          <p className="max-w-md text-ink-muted">{t('teachSavedBody')}</p>
          <div className={clsx('mt-2 flex flex-wrap justify-center gap-3')}>
            <Button variant="secondary" onClick={reset}>
              {t('teachAnother')}
            </Button>
            <Button onClick={() => navigate('/')}>{t('teachGoLive')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function trimBi(b: { en: string; ms: string }) {
  return { en: b.en.trim(), ms: b.ms.trim() };
}
