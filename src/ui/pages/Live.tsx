import { Info, TriangleExclamationPoint, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { CLIP_N, D } from '../../engine/constants';
import { dtw } from '../../engine/dtw';
import { ALL_GESTURES } from '../../engine/simulator';
import type { EventRecord } from '../../engine/types';
import { pickText, useT } from '../../i18n';
import { addEvent, addExample, listEvents, updateEvent } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { session, useSession } from '../../store/useSession';
import { useTeachDraft } from '../../store/useTeachDraft';
import { announce } from '../components/Announcer';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { CalmMeter, calmReasons, ConfidenceBar, EventList, FeedbackState, tierLabel } from '../components/LiveBits';
import { iconFor } from '../components/signalIcons';
import { VideoPanel } from '../components/VideoPanel';
import { speak, speechAvailable } from '../hooks/speech';

interface Current {
  eventId: string;
  signalId: string;
  confidence: number;
  window: Float32Array;
  feedback?: EventRecord['feedback'];
}

/** Add the window as a new example only if it is not already well covered (nearest distance > 0.6·τ). */
const ADD_IF_FARTHER_THAN = 0.6;

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Live() {
  const t = useT();
  const [, navigate] = useLocation();
  const lang = useSettings((s) => s.lang);
  const skeleton = useSettings((s) => s.skeletonLive);
  const speakAloud = useSettings((s) => s.speakAloud);
  const setSettings = useSettings((s) => s.set);
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const models = useData((s) => s.models);
  const calm = useSession((s) => s.calm);
  const phase = useSession((s) => s.phase);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const [sheet, setSheet] = useState(false);

  // latest values for subscription callbacks
  const ref = useRef({ signals, lang, profile, speakAloud, t });
  useEffect(() => {
    ref.current = { signals, lang, profile, speakAloud, t };
  });

  useEffect(() => {
    session.setMode('live');
  }, []);

  useEffect(() => {
    if (!profile) return;
    let live = true;
    void listEvents(profile.id, startOfToday())
      .then((evs) => live && setEvents(evs.reverse()))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [profile]);

  useEffect(() => {
    const offEmit = session.onEmission((e) => {
      const { signals: sigs, lang: l, profile: p, speakAloud: sa, t: tt } = ref.current;
      const sig = sigs.find((s) => s.id === e.signalId);
      if (!p || !sig) return;
      const name = pickText(sig.name, l);
      const meaning = pickText(sig.meaning, l);
      announce(tt('announceSignal', { name, meaning }));
      if (sa) speak(meaning, l);
      void addEvent({ profileId: p.id, ts: new Date().toISOString(), kind: 'signal', signalId: sig.id, confidence: e.confidence })
        .then((ev) => {
          setEvents((xs) => [ev, ...xs]);
          setCurrent({ eventId: ev.id, signalId: sig.id, confidence: e.confidence, window: e.window });
        })
        .catch(() => toast.error(tt('storageError')));
    });
    const offCalm = session.onCalm((u) => {
      const { profile: p, t: tt } = ref.current;
      if (!u.tierChanged || !p) return;
      announce(tt('announceTier', { tier: tt(tierLabel(u.tierChanged)) }));
      if (u.tierChanged === 'high' && useSettings.getState().vibration) navigator.vibrate?.(200);
      void addEvent({ profileId: p.id, ts: new Date().toISOString(), kind: 'calm-tier', tier: u.tierChanged, score: u.state.score })
        .then((ev) => setEvents((xs) => [ev, ...xs]))
        .catch(() => undefined);
    });
    return () => {
      offEmit();
      offCalm();
    };
  }, []);

  const setFeedback = (eventId: string, patch: Partial<EventRecord>) => {
    setEvents((xs) => xs.map((x) => (x.id === eventId ? { ...x, ...patch } : x)));
    setCurrent((c) => (c && c.eventId === eventId ? { ...c, ...(patch.feedback ? { feedback: patch.feedback } : {}), ...(patch.signalId ? { signalId: patch.signalId } : {}) } : c));
    return updateEvent(eventId, patch);
  };

  const onYes = async () => {
    if (!current) return;
    try {
      await setFeedback(current.eventId, { feedback: 'yes' });
      const model = models.find((m) => m.signalId === current.signalId);
      if (model) {
        const nearest = Math.min(...model.examples.map((e) => dtw(current.window, e, CLIP_N, D)));
        if (nearest > ADD_IF_FARTHER_THAN * model.tau) {
          await addExample({ signalId: current.signalId, n: CLIP_N, d: D, data: current.window, source: 'feedback' });
          await useData.getState().refresh();
        }
      }
      toast.success(t('fbThanksYes'));
    } catch {
      toast.error(t('storageError'));
    }
  };

  const relabel = async (signalId: string) => {
    if (!current) return;
    setSheet(false);
    try {
      await setFeedback(current.eventId, { feedback: 'no', signalId });
      await addExample({ signalId, n: CLIP_N, d: D, data: current.window, source: 'feedback' });
      await useData.getState().refresh();
      const s = signals.find((x) => x.id === signalId);
      toast.success(t('fbRelabelled', { name: s ? pickText(s.name, lang) : '' }));
    } catch {
      toast.error(t('storageError'));
    }
  };

  const teachNew = async () => {
    if (!current) return;
    setSheet(false);
    await setFeedback(current.eventId, { feedback: 'new' }).catch(() => undefined);
    useTeachDraft.getState().set(current.window);
    navigate('/teach');
  };

  const sig = current ? signals.find((s) => s.id === current.signalId) : undefined;
  const SigIcon = sig ? iconFor(sig.icon) : null;
  const tier = calm?.tier ?? 'calm';
  const steps = profile?.comfortSteps[tier]?.trim() ?? '';
  const reasons = calm ? calmReasons(calm, lang, t) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl">{t('liveTitle')}</h1>

      {calm?.tier === 'high' && (
        <div role="status" className="flex items-start gap-3 rounded-[16px] border border-high-fg/40 bg-high-bg p-4 text-high-fg" data-testid="high-banner">
          <TriangleExclamationPoint aria-hidden className="mt-0.5 size-6 shrink-0" />
          <p className="font-bold">
            {t('calmBanner')} {profile?.comfortSteps.high.trim() ? t('calmBannerSteps', { steps: profile.comfortSteps.high.trim() }) : t('calmBannerNoSteps', { name: profile?.nickname ?? '' })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <VideoPanel skeleton={skeleton} onSkeleton={(v) => setSettings({ skeletonLive: v })} gestures={ALL_GESTURES} />

        <div className="space-y-6">
          {signals.length === 0 ? (
            <EmptyState
              title={t('emptyNoSignalsTitle')}
              body={t('emptyNoSignalsBody', { name: profile?.nickname ?? '' })}
              action={
                <Link href="/teach" className="inline-flex min-h-12 items-center rounded-[12px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-hover">
                  {t('teachFirst')}
                </Link>
              }
            />
          ) : (
            <Card aria-labelledby="saying-h" data-testid="saying-card">
              <h2 id="saying-h" className="font-sans text-sm font-bold uppercase tracking-wide text-ink-muted">
                {t('liveSaying')}
              </h2>
              {current && sig && SigIcon ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <span aria-hidden className="grid size-20 shrink-0 place-items-center rounded-[20px] bg-primary-soft text-primary">
                      <SigIcon className="size-11" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-2xl font-semibold" data-testid="saying-name">
                        {pickText(sig.name, lang)}
                      </p>
                      <p className="mt-1 text-lg" data-testid="saying-meaning">
                        {pickText(sig.meaning, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <ConfidenceBar confidence={current.confidence} />
                    {speechAvailable() && (
                      <Button variant="quiet" icon={<Volume2 aria-hidden className="size-5" />} onClick={() => speak(pickText(sig.meaning, lang), lang)}>
                        {t('speak')}
                      </Button>
                    )}
                  </div>
                  {current.feedback ? (
                    <div className="rounded-[12px] bg-surface-2 p-3">
                      <FeedbackState fb={current.feedback} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="lg" className="col-span-2" onClick={() => void onYes()}>
                        {t('yes')}
                      </Button>
                      <Button size="lg" variant="secondary" onClick={() => setSheet(true)}>
                        {t('notQuite')}
                      </Button>
                      <Button size="lg" variant="secondary" onClick={() => void teachNew()}>
                        {t('newMeaning')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-lg font-bold">{phase === 'running' ? t('liveWatching', { name: profile?.nickname ?? '' }) : t('liveNoVideo')}</p>
                  {phase === 'running' && <p className="mt-1 text-ink-muted">{t('liveWatchingHint')}</p>}
                </div>
              )}
            </Card>
          )}

          <Card aria-labelledby="calm-h" data-testid="calm-card">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="calm-h" className="text-lg">
                {t('calmTitle')}
              </h2>
            </div>
            <div className="mt-4">
              <CalmMeter state={calm} />
            </div>
            {calm ? (
              <div className="mt-4 space-y-3">
                <p data-testid="calm-reasons">{reasons.length ? reasons.join(' · ') : t('calmSettled')}</p>
                <div className="rounded-[14px] bg-surface-2 p-3">
                  <p className="text-sm font-bold text-ink-muted">{t('calmStepsTitle')}</p>
                  {steps ? (
                    <p className="mt-1 font-bold">{steps}</p>
                  ) : (
                    <Link href="/settings" className="mt-1 inline-flex min-h-12 items-center font-bold text-primary underline underline-offset-4">
                      {t('calmNoSteps')}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-ink-muted">{t('calmWaiting')}</p>
            )}
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
              <Info aria-hidden className="size-4 shrink-0" />
              {t('calmNotDiagnosis')}
            </p>
          </Card>

          <Card aria-labelledby="recent-h">
            <h2 id="recent-h" className="text-lg">
              {t('recentTitle')}
            </h2>
            <div className="mt-2">
              <EventList events={events.slice(0, 10)} signals={signals} lang={lang} />
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={sheet} onOpenChange={setSheet} title={t('fbWhich')} description={t('fbWhichHint')} sheet>
        <ul className="mt-4 space-y-2">
          {signals.map((s) => {
            const Icon = iconFor(s.icon);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => void relabel(s.id)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-[14px] border border-border-soft bg-surface px-4 text-left hover:bg-surface-2"
                >
                  <Icon aria-hidden className="size-6 shrink-0 text-primary" />
                  <span>
                    <span className="block font-bold">{pickText(s.name, lang)}</span>
                    <span className="block text-sm text-ink-muted">{pickText(s.meaning, lang)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => void teachNew()}
              className="flex min-h-14 w-full items-center gap-3 rounded-[14px] border border-dashed border-border px-4 text-left hover:bg-surface-2"
            >
              <span>
                <span className="block font-bold">{t('fbSomethingElse')}</span>
                <span className="block text-sm text-ink-muted">{t('fbSomethingElseHint')}</span>
              </span>
            </button>
          </li>
        </ul>
      </Dialog>
    </div>
  );
}
