import {
  Activity,
  ArrowUpRight,
  CameraOff,
  ChevronRight,
  Bell,
  Camera,
  Check,
  Cpu,
  Lock,
  Radio,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  MessageSquarePlus,
  Info,
  X,
} from 'lucide-react';
import { useState, type ReactNode, type Ref } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { dur, ease, indicator } from '../motion';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useMonitoring } from '../../store/useMonitoring';
import { useT, type MsgKey } from '../../i18n';
import { useData } from '../../store/useData';
import { useSettings } from '../../store/useApp';
import { session, useSession } from '../../store/useSession';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageHeader, StatusBadge } from '../components/PageHeader';
import { Avatar } from '../components/Shell';
import { TextField } from '../components/Controls';
import { VideoPanel } from '../components/VideoPanel';
import { MonitoringConfig } from '../components/MonitoringConfig';
import { Dialog } from '../components/Dialog';
import { BASELINE_SAMPLE_MIN } from '../../platform/behaviour';
import { useSignalCounts } from '../hooks/useSignalCounts';
import { cameraLabel, cameraTone } from '../cameraStatus';
import type { MonitoringEvent } from '../../platform/contracts';

const baselineKeys: Record<string, MsgKey> = {
  'not-configured': 'monNotConfigured',
  collecting: 'monCollecting',
  insufficient: 'monInsufficient',
  available: 'monAvailable',
  'requires-review': 'monRequiresReview',
};
const eventKeys: Record<MonitoringEvent['type'], MsgKey> = {
  'monitoring-started': 'monStarted',
  'camera-disconnected': 'monDisconnected',
  'observation-unavailable': 'monObservationUnavailable',
  'baseline-available': 'monBaselineReady',
  'movement-deviation': 'monDeviation',
};
const explanationKeys: Record<MonitoringEvent['explanation'], MsgKey> = {
  started: 'monStartedReason',
  disconnected: 'monDisconnectedReason',
  'poor-quality': 'monQualityReason',
  'baseline-ready': 'monBaselineReason',
  'sustained-deviation': 'monDeviationReason',
};
const statusKeys: Record<string, MsgKey> = {
  connected: 'monConnected',
  disconnected: 'monDisconnected',
  disabled: 'monDisabled',
  'not-configured': 'monNotConfigured',
  initialising: 'monInitialising',
  unavailable: 'monUnavailable',
  running: 'monRunning',
  stopped: 'monStopped',
  good: 'monGood',
  missing: 'monMissing',
  occluded: 'monOccluded',
  'low-light': 'monLowLight',
};

const statusTone = (state: string): 'calm' | 'review' | 'neutral' =>
  ['connected', 'running', 'available', 'good'].includes(state)
    ? 'calm'
    : ['disconnected', 'requires-review', 'low-light', 'occluded'].includes(state)
      ? 'review'
      : 'neutral';

const qualityTone = (q: string): 'ok' | 'warn' => (q === 'good' ? 'ok' : 'warn');

/** Leaves and enters with the shared review motion: fade + lift in, quick fade out, neighbours glide. */
function ReviewRow({ children, className, ref }: { children: ReactNode; className: string; ref?: Ref<HTMLLIElement> }) {
  const present = useIsPresent();
  return (
    <motion.li
      ref={ref}
      layout="position"
      className={className}
      aria-hidden={present ? undefined : true}
      inert={!present}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: dur.screen, ease: ease.out, delay: 0.09 } }}
      exit={{ opacity: 0, transition: { duration: 0.09, ease: ease.in } }}
      transition={{ layout: { duration: dur.screen, ease: ease.out } }}
    >
      {children}
    </motion.li>
  );
}

/** Home: today at a glance — sources, the people in your care, what needs review, and what happened recently. */
export function PlatformOverview() {
  const t = useT(),
    m = useMonitoringProfile(),
    profile = useData((s) => s.profile),
    profiles = useData((s) => s.profiles),
    s = m.snapshot;
  const advanced = useSettings((x) => x.advanced);
  const lang = useSettings((x) => x.lang);
  const counts = useSignalCounts();
  const now = new Date();
  const today = new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(now);
  const hour = now.getHours();
  const events = s?.events ?? [];
  const pending = events.filter((e) => e.priority !== 'information' && e.status === 'new').reverse();
  const recent = [...events].reverse().slice(0, 3);
  const simulated = (s?.health.camera.simulated ?? false) || events.some((e) => e.simulated);
  const camState = s?.health.camera.state ?? 'not-configured';
  const tone = cameraTone(camState);
  const name = profile?.nickname ?? '';
  const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const CamIcon = tone === 'bad' ? CameraOff : Camera;
  return (
    <div className="platform-page home-page">
      <header className="home-head">
        <div className="min-w-0">
          <p className="home-date">
            <span>{today}</span>
            {simulated && <span className="sim-tag">{t('ovSimData')}</span>}
          </p>
          <h1>{t(hour < 12 ? 'ovMorning' : hour < 18 ? 'ovAfternoon' : 'ovEvening')}</h1>
          <p className="home-sub">{t('ovSubtitle')}</p>
        </div>
        <Link href="/events" className="home-bell press">
          <span className="sr-only">{t('ovOpenReview')}</span>
          <Bell size={18} aria-hidden />
          {pending.length > 0 && <span className="home-bell-count">{pending.length}</span>}
        </Link>
      </header>
      {m.error && <p role="alert">{t('storageError')}</p>}

      <section className="ov-card home-monitor" aria-labelledby="home-mon-h">
        <div className="home-monitor-row">
          <span className={`home-mon-icon tone-${tone}`} aria-hidden>
            <CamIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="home-mon-title">
              <span id="home-mon-h">{t('monCamera')}</span>
              <span className={`pill tone-${tone}`}>{t(cameraLabel(camState))}</span>
            </p>
            <p className="home-mon-meta">
              {t('monLatest')}: <strong>{s?.health.lastSuccessfulObservation ? clock(s.health.lastSuccessfulObservation) : t('monNoObservations')}</strong>
            </p>
          </div>
          <Link href="/devices" className="ov-btn ov-btn-ghost home-setup">
            {t('ovSetup')}
          </Link>
        </div>
        <Disclosure open={advanced}>
          <dl className="tech-row">
            <div>
              <dt>{t('monLocalProcessing')}</dt>
              <dd>{t(statusKeys[s?.health.gateway.state ?? 'stopped'] ?? 'monStopped')}</dd>
            </div>
            <div>
              <dt>{t('ovRuntimeLabel')}</dt>
              <dd>{t('ovRuntime')}</dd>
            </div>
            <div>
              <dt>{t('monBaseline')}</dt>
              <dd>{t(baselineKeys[s?.baseline.state ?? 'not-configured'] ?? 'monNotConfigured')} · {s?.baseline.count ?? 0}/{BASELINE_SAMPLE_MIN}</dd>
            </div>
          </dl>
        </Disclosure>
      </section>

      <section className="home-section" aria-labelledby="home-people-h">
        <header className="home-section-head">
          <h2 id="home-people-h">{t('ovPeople')}</h2>
          <Link href="/individuals" className="home-more">
            {t('ovAllPeople')}
            <ChevronRight size={15} aria-hidden />
          </Link>
        </header>
        <ul className="home-people">
          {profiles.map((p) => {
            const active = p.id === profile?.id;
            return (
              <li key={p.id}>
                <Link href={`/individuals/${p.id}`} className="ov-card person-card">
                  <Avatar name={p.nickname} />
                  <span className="min-w-0 flex-1">
                    <span className="person-name">
                      {p.nickname}
                      {active && <span className="pill tone-ok">{t('indSelected')}</span>}
                    </span>
                    <span className="person-meta">
                      {active && s?.care.environment.name ? `${s.care.environment.name} · ` : ''}
                      {t('indGestures', { n: counts[p.id] ?? 0 })}
                    </span>
                  </span>
                  <ChevronRight size={17} aria-hidden className="person-chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="home-review-h">
        <header className="home-section-head">
          <h2 id="home-review-h">
            {t('ovNeedsReviewTitle')}
            {pending.length > 0 && <span className="pill tone-warn tabular">{pending.length}</span>}
          </h2>
          <Link href="/events" className="home-more">
            {t('ovOpenActivity')}
            <ChevronRight size={15} aria-hidden />
          </Link>
        </header>
        <AnimatePresence initial={false} mode="popLayout">
          {pending.length === 0 ? (
            <motion.div
              key="none"
              className="ov-card home-none"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: dur.screen, ease: ease.out } }}
            >
              <CheckCircle2 size={17} aria-hidden className="tone-text-ok" />
              <p>{t('ovNoReview')}</p>
            </motion.div>
          ) : (
            <motion.ul key="list" className="home-review" exit={{ opacity: 0, transition: { duration: 0.09 } }}>
              <AnimatePresence initial={false} mode="popLayout">
                {pending.slice(0, 2).map((e) => (
                  <ReviewRow key={e.id} className="ov-card review-card">
                    <div className="review-top">
                      <p className="review-who">
                        <span className="dot tone-warn" aria-hidden />
                        {name}
                        <span className="review-time">· {clock(e.at)}</span>
                      </p>
                      <span className={`pill tone-${qualityTone(e.quality)}`}>{t(statusKeys[e.quality] ?? 'monGood')}</span>
                    </div>
                    <h3 className="review-title">{t(eventKeys[e.type])}</h3>
                    <p className="review-why">
                      <strong>{t('ovWhy')}</strong> {t(explanationKeys[e.explanation])}
                    </p>
                    <div className="review-actions">
                      <Link href="/events" className="ov-btn ov-btn-primary">
                        {t('ovReviewObs')}
                        <ArrowUpRight size={16} aria-hidden />
                      </Link>
                      <button type="button" className="ov-btn ov-btn-ghost" onClick={() => void m.review(e.id, 'acknowledge', e.note)}>
                        {t('ovQuickAck')}
                      </button>
                    </div>
                  </ReviewRow>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>
      </section>

      {recent.length > 0 && (
        <section className="home-section" aria-labelledby="home-recent-h">
          <header className="home-section-head">
            <h2 id="home-recent-h">{t('ovRecent')}</h2>
          </header>
          <ul className="ov-card home-recent">
            {recent.map((e) => {
              const needs = e.status === 'new' && e.priority !== 'information';
              return (
                <li key={e.id}>
                  <Link href="/events" className="recent-row">
                    <span className="min-w-0 flex-1">
                      <span className="recent-title">{t(eventKeys[e.type])}</span>
                      <span className="recent-meta">
                        {name} · {clock(e.at)}
                      </span>
                    </span>
                    <span className={needs ? 'pill tone-warn' : 'pill'}>
                      {t(needs ? 'ovStatusReview' : e.status === 'new' ? 'monInformation' : 'eaReviewed')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Height + fade disclosure shared by Advanced details (content of any height; nothing jumps). */
export function Disclosure({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="d"
          className="disclosure"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1, transition: { height: { duration: dur.disclosure, ease: ease.out }, opacity: { duration: dur.micro, delay: 0.04 } } }}
          exit={{ height: 0, opacity: 0, transition: { height: { duration: dur.micro, ease: ease.in }, opacity: { duration: 0.1 } } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MonitoringPage() {
  const t = useT(),
    m = useMonitoringProfile(),
    s = m.snapshot,
    phase = useSession((s) => s.phase),
    kind = useSession((s) => s.kind),
    profile = useData((s) => s.profile);
  const [config, setConfig] = useState(false),
    [reset, setReset] = useState(false);
  const ready = !!s?.care.consent.video && !!s.care.consent.authorityConfirmed;
  const running =
    s?.health.gateway.state === 'running' && s.health.camera.state === 'connected' && s.health.camera.simulated;
  return (
    <div className="platform-page space-y-6">
      <PageHeader
        title={t('monLiveMonitoring')}
        description={t('vdMonitoringIntro')}
        actions={
          <>
            <span className="individual-context-chip">
              <Avatar name={profile?.nickname ?? ''} />
              {profile?.nickname}
            </span>
            <Button variant="secondary" onClick={() => setConfig(true)}>
              {t('monConfigure')}
            </Button>
          </>
        }
      />
      <details className="platform-demo-banner">
        <summary>
          <Radio aria-hidden size={17} />
          <strong>{t('monDemoMode')}</strong>
          <span>{t('vdDemoSource')}</span>
          <ChevronDown aria-hidden size={16} />
        </summary>
        <p>{t('monDemoDisclosure')}</p>
      </details>
      <div className="monitoring-workbench">
        <section className="platform-monitor-stage monitor-stage" aria-label={t('monSimulationDiagram')} data-running={running}>
          <div className="stage-top">
            <span className="stage-pill">
              <Radio aria-hidden size={15} />
              {s?.health.camera.simulated ? t('monSimulatedCamera') : t('monNotConfigured')}
            </span>
            <span className="stage-pill">
              <span className={`status-dot tone-${statusTone(s?.health.camera.simulated ? s.health.camera.state : 'not-configured')}`} aria-hidden />
              {t(statusKeys[s?.health.camera.simulated ? s.health.camera.state : 'not-configured'])}
            </span>
          </div>
          <div className="stage-center">
            <div className="platform-topology">
              {[
                { Icon: Camera, label: 'monCamera' as const },
                { Icon: Cpu, label: 'monLocalProcessing' as const },
                { Icon: Bell, label: 'monEvents' as const },
              ].map(({ Icon, label }) => (
                <div className="topology-node" key={label}>
                  <span>
                    <Icon aria-hidden />
                  </span>
                  <p>{t(label)}</p>
                </div>
              ))}
            </div>
            <h2 className="stage-room">{s?.care.environment.name ?? t('monNotConfigured')}</h2>
            <p className="stage-note">{t('monNoFakeVideo')}</p>
          </div>
          <div className="stage-bottom">
            <span className="platform-mode">{t('monBrowserDemoGateway')}</span>
            {profile && (
              <span className="stage-pill">
                <Avatar name={profile.nickname} />
                {profile.nickname}
              </span>
            )}
          </div>
        </section>
        <Card className="monitor-controls space-y-4">
          <h2 className="text-xl">{t('monDemoControls')}</h2>
          <p className="text-sm text-ink-muted">{t('monDemoSequence')}</p>
          <div className="grid gap-2">
            <Button
              disabled={!ready}
              onClick={() => {
                session.stop();
                void m.action('start');
              }}
            >
              {t('monStartDemo')}
            </Button>
            <Button
              variant="secondary"
              disabled={!running || !s?.care.movementEnabled || !s.care.baselineContextReviewed}
              onClick={() => void m.action('baseline')}
            >
              {t('monEstablishDemoBaseline')}
            </Button>
            <Button
              variant="secondary"
              disabled={!running || s?.baseline.state !== 'available'}
              onClick={() => {
                const count = s?.events.length ?? 0;
                void m.action('unusual').then(() => {
                  if ((useMonitoring.getState().snapshot?.events.length ?? 0) > count)
                    toast.info(t('monSimulatedNotification'));
                });
              }}
            >
              {t('monIntroduceEvent')}
            </Button>
            <Button variant="secondary" disabled={!running} onClick={() => void m.action('ordinary')}>
              {t('monOrdinary')}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="quiet" disabled={!running} onClick={() => void m.action('disconnect')}>
                {t('monDisconnect')}
              </Button>
              <Button
                variant="quiet"
                disabled={!running}
                onClick={() => {
                  session.stop();
                  void m.action('stop');
                }}
              >
                {t('monStop')}
              </Button>
            </div>
          </div>
          <Button variant="quiet" onClick={() => setReset(true)}>
            {t('monResetDemo')}
          </Button>
          {!ready && <p className="text-sm text-ink-muted">{t('monConsentRequired')}</p>}
          {m.error && (
            <p role="alert" className="text-high-fg">
              {t('monActionError')}
            </p>
          )}
        </Card>
      </div>
      <div className="monitor-evidence-grid">
        <Card className="baseline-panel">
          <div className="section-heading">
            <h2 className="text-xl">{t('monBaseline')}</h2>
            <Activity aria-hidden size={20} />
          </div>
          <p className="mt-3 font-semibold" data-testid="monitor-baseline">
            {t(baselineKeys[s?.baseline.state ?? 'not-configured'])}
          </p>
          {s && ['collecting', 'insufficient'].includes(s.baseline.state) && (
            <progress
              className="baseline-progress"
              value={Math.min(s.baseline.count, BASELINE_SAMPLE_MIN)}
              max={BASELINE_SAMPLE_MIN}
              aria-label={t('monBaselineSamples', {
                n: s.baseline.count,
                seconds: Math.round(s.baseline.coverageMs / 1000),
              })}
            />
          )}
          <p className="mt-2 text-sm text-ink-muted">{t('monBaselineCaution')}</p>
          <p className="mt-3 text-sm">
            {t('monBaselineSamples', {
              n: s?.baseline.count ?? 0,
              seconds: Math.round((s?.baseline.coverageMs ?? 0) / 1000),
            })}
          </p>
          <p className="mt-2 text-sm text-ink-muted">{t('monBaselineFrozen')}</p>
        </Card>
        <Card>
          <h2 className="text-xl">{t('monObservationQuality')}</h2>
          <p className="mt-3 font-semibold">{t(statusKeys[s?.health.observationQuality ?? 'missing'])}</p>
          <p className="mt-2 text-sm text-ink-muted">{t('monQualityCaution')}</p>
          <Link className="platform-link mt-4" href="/events">
            {t('monReviewEvents')}
            <ArrowUpRight aria-hidden size={17} />
          </Link>
        </Card>
      </div>
      <Card className="browser-source-card">
        <div className="section-heading">
          <div>
            <h2>{t('monBrowserInput')}</h2>
          </div>
          <StatusBadge tone={phase === 'running' && kind === 'camera' ? 'calm' : 'neutral'}>
            {t(phase === 'running' && kind === 'camera' ? 'monConnected' : 'monDisabled')}
          </StatusBadge>
        </div>
        <div className="browser-source-layout">
          <VideoPanel skeleton={false} onSkeleton={() => undefined} />
          <div className="browser-source-info">
            <ShieldCheck aria-hidden size={24} />
            <p>{t('monBrowserBridge')}</p>
            <Button
              className="mt-4"
              variant="secondary"
              disabled={
                !(
                  phase === 'running' &&
                  kind === 'camera' &&
                  ready &&
                  s?.care.movementEnabled &&
                  s.care.baselineContextReviewed
                )
              }
              onClick={() => void m.action('collect-browser')}
            >
              {t('monBrowserBaseline')}
            </Button>
            <p className="text-sm text-ink-muted">
              {phase === 'running' && kind === 'camera' ? t('monActualBrowserRunning') : t('monCameraNotRunning')}
            </p>
          </div>
        </div>
      </Card>
      <Dialog open={config} onOpenChange={setConfig} title={t('monConfig')} sheet>
        <MonitoringConfig />
      </Dialog>
      <Dialog
        open={reset}
        onOpenChange={setReset}
        title={t('monResetDemo')}
        description={t('monResetBody')}
        footer={
          <Button
            variant="destructive"
            onClick={() => {
              void m.action('reset');
              setReset(false);
            }}
          >
            {t('monResetDemo')}
          </Button>
        }
      />
    </div>
  );
}

/** One observation. It keeps its place while its review state changes; leaving the list fades it quickly. */
function EventItem({
  children,
  className,
  priority,
  state,
  ref,
}: {
  children: ReactNode;
  className: string;
  priority: MonitoringEvent['priority'];
  state: MonitoringEvent['status'];
  ref?: Ref<HTMLLIElement>;
}) {
  const present = useIsPresent();
  return (
    <motion.li
      ref={ref}
      layout="position"
      className={className}
      data-testid={present ? 'monitor-event' : undefined}
      data-priority={priority}
      data-review-state={state}
      aria-hidden={present ? undefined : true}
      inert={!present}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: dur.screen, ease: ease.out } }}
      exit={{ opacity: 0, y: -4, transition: { duration: dur.exit, ease: ease.in } }}
      transition={{ layout: { duration: dur.screen, ease: ease.out } }}
    >
      {children}
    </motion.li>
  );
}

/** Reviewed: a quiet tick that draws once. */
function AckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="6.5" strokeWidth="1.4" />
      <motion.path d="M5.2 8.2L7.1 10.1L11 6" strokeWidth="1.6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22, ease: ease.out, delay: 0.06 }} />
    </svg>
  );
}

/** Activity: observable moments surfaced for caregiver context and review. */
export function EventsPage() {
  const t = useT(),
    m = useMonitoringProfile(),
    profile = useData((s) => s.profile),
    advanced = useSettings((x) => x.advanced);
  const [filter, setFilter] = useState<'pending' | 'all' | 'history'>('all');
  const [why, setWhy] = useState(false);
  const [techOpen, setTechOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null),
    [note, setNote] = useState('');
  const all = [...(m.snapshot?.events ?? [])].sort(
    (a, b) =>
      Number(b.status === 'new' && b.priority !== 'information') -
        Number(a.status === 'new' && a.priority !== 'information') || Date.parse(b.at) - Date.parse(a.at),
  );
  const isPending = (e: MonitoringEvent) => e.status === 'new' && e.priority !== 'information';
  const pending = all.filter(isPending);
  const reviewed = all.filter((e) => e.status !== 'new');
  const events = filter === 'pending' ? pending : filter === 'history' ? reviewed : all;
  const name = profile?.nickname ?? '';
  const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const saveNote = (id: string) =>
    void m.review(id, 'note', note.trim()).then((ok) => {
      if (ok) setEditing(null);
    });
  return (
    <div className="platform-page ea-page">
      <header className="ea-head">
        <div className="ea-title-row">
          <h1>{t('monEvents')}</h1>
          <button type="button" className={why ? 'ea-why is-open' : 'ea-why'} aria-expanded={why} aria-controls="ea-principle" onClick={() => setWhy((v) => !v)}>
            <Info size={14} aria-hidden />
            {t('eaPhilosophy')}
          </button>
        </div>
        <p className="home-sub">{t('eaSub')}</p>
        <AnimatePresence initial={false}>
          {why && (
            <motion.div
              key="principle"
              id="ea-principle"
              className="ea-principle-wrap"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transition: { height: { duration: dur.disclosure, ease: ease.out }, opacity: { duration: dur.micro, delay: 0.04 } } }}
              exit={{ height: 0, opacity: 0, transition: { height: { duration: dur.micro, ease: ease.in }, opacity: { duration: 0.1 } } }}
            >
              <div className="ea-principle">
                <div className="ea-principle-top">
                  <span className="ov-label">{t('eaPrinciple')}</span>
                  <button type="button" className="ea-close" aria-label={t('eaClose')} onClick={() => setWhy(false)}>
                    <X size={16} aria-hidden />
                  </button>
                </div>
                <p>{t('monPhilosophy')}</p>
                <p className="ea-principle-sub">{t('monEventIntro')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="ea-segments" role="group" aria-label={t('eaFilterLabel')}>
        {(
          [
            ['pending', 'monNeedsReview', pending.length],
            ['all', 'eaTabAll', all.length],
            ['history', 'eaReviewed', reviewed.length],
          ] as const
        ).map(([id, label, n]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {filter === id && <motion.span layoutId="ea-segment" className="ea-seg-bg" transition={indicator} aria-hidden />}
            <span>{t(label)}</span>
            <span className="ea-count">({n})</span>
          </button>
        ))}
      </div>
      {m.error && <p role="alert">{t('monActionError')}</p>}

      {!events.length ? (
        <motion.section
          key={filter}
          className="ov-card ea-empty"
          aria-labelledby="ea-empty-h"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.screen, ease: ease.out }}
        >
          <span className="ea-rings" aria-hidden>
            <span />
            <span />
            <Check size={16} strokeWidth={2.4} />
          </span>
          <h2 id="ea-empty-h">{all.length ? t('ovAttentionNone') : t('ovNoReview')}</h2>
          <p>{t('eaEmptyBody')}</p>
          <Link href="/monitoring" className="ov-btn ov-btn-primary">
            {t('monOpenMonitoring')}
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        </motion.section>
      ) : (
        <ul className="ea-list">
          <AnimatePresence initial={false} mode="popLayout">
            {events.map((e) => {
              const needs = isPending(e);
              const tech = advanced || !!techOpen[e.id];
              const noting = editing === e.id;
              return (
                <EventItem key={e.id} className="ov-card ea-card" priority={e.priority} state={e.status}>
                  <div className="ea-card-top">
                    <p className="ea-who">
                      <span className="pill">{name}</span>
                      <time dateTime={e.at} className="ea-time">
                        {clock(e.at)}
                      </time>
                      <span className="ea-source">{t(e.simulated ? 'monSimulatedEvent' : 'monBrowserObservation')}</span>
                    </p>
                    <span className={`pill tone-${qualityTone(e.quality)}`}>{t(statusKeys[e.quality] ?? 'monGood')}</span>
                  </div>
                  <h2 className="ea-title">{t(eventKeys[e.type])}</h2>
                  <p className="ea-detail">
                    <strong>{t('ovWhy')}</strong> {t(explanationKeys[e.explanation])}
                  </p>

                  {e.note && !noting && (
                    <p className="ea-note">
                      <strong>{t('monCaregiverNote')}:</strong> <span>{e.note}</span>
                    </p>
                  )}
                  <Disclosure open={noting}>
                    <form
                      className="ea-note-editor"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        saveNote(e.id);
                      }}
                    >
                      <TextField label={t('monCaregiverNote')} value={note} onChange={setNote} maxLength={500} />
                      <button type="submit" className="ov-btn ov-btn-primary">
                        {t('save')}
                      </button>
                    </form>
                  </Disclosure>

                  <AnimatePresence initial={false}>
                    {needs ? (
                      <motion.div
                        key="act"
                        className="ea-actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: dur.micro } }}
                      >
                        <button type="button" className="ov-btn ov-btn-primary" onClick={() => void m.review(e.id, 'acknowledge', e.note)}>
                          <Check size={16} aria-hidden />
                          {t('monAcknowledge')}
                        </button>
                        <button
                          type="button"
                          className="ov-btn ov-btn-ghost"
                          aria-expanded={noting}
                          onClick={() => {
                            setEditing(noting ? null : e.id);
                            setNote(e.note);
                          }}
                        >
                          <MessageSquarePlus size={16} aria-hidden />
                          {t(e.note ? 'eaEditNote' : 'eaAddNote')}
                        </button>
                        <button type="button" className="ov-btn ea-quiet" onClick={() => void m.review(e.id, 'dismiss', e.note)}>
                          {t('monDismiss')}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="state"
                        className="ea-resolved"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: dur.micro, ease: ease.out, delay: 0.06 } }}
                      >
                        <p className={e.status === 'acknowledged' ? 'ea-state-line tone-text-ok' : 'ea-state-line'}>
                          {e.status === 'acknowledged' ? <AckMark /> : <Info size={16} aria-hidden />}
                          <span role="status" data-testid="review-state">
                            {t(e.status === 'new' ? 'monNew' : e.status === 'acknowledged' ? 'monAcknowledged' : 'monDismissed')}
                          </span>
                        </p>
                        <div className="ea-done-actions">
                          {e.status === 'acknowledged' ? (
                            <button type="button" className="ov-btn ea-quiet" onClick={() => void m.review(e.id, 'dismiss', e.note)}>
                              <X size={15} aria-hidden />
                              {t('monDismiss')}
                            </button>
                          ) : (
                            <button type="button" className="ov-btn ea-quiet" onClick={() => void m.review(e.id, 'acknowledge', e.note)}>
                              <Check size={15} aria-hidden />
                              {t('monAcknowledge')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="ov-btn ea-quiet"
                            aria-expanded={noting}
                            onClick={() => {
                              setEditing(noting ? null : e.id);
                              setNote(e.note);
                            }}
                          >
                            <MessageSquarePlus size={15} aria-hidden />
                            {t(e.note ? 'eaEditNote' : 'eaAddNote')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="ea-tech">
                    <button
                      type="button"
                      className="ea-tech-toggle"
                      aria-expanded={tech}
                      onClick={() => setTechOpen((x) => ({ ...x, [e.id]: !x[e.id] }))}
                      disabled={advanced}
                    >
                      <span>{t('eaTechnical')}</span>
                      <ChevronDown size={15} aria-hidden className="ea-chev" />
                    </button>
                    <Disclosure open={tech}>
                      <dl className="tech-row">
                        <div>
                          <dt>{t('eaEventType')}</dt>
                          <dd>{e.type}</dd>
                        </div>
                        <div>
                          <dt>{t('eaPriority')}</dt>
                          <dd>{e.priority}</dd>
                        </div>
                        <div>
                          <dt>{t('monCamera')}</dt>
                          <dd>{e.sourceId}</dd>
                        </div>
                        <div>
                          <dt>{t('eaRoom')}</dt>
                          <dd>{m.snapshot?.care.environment.name || e.roomId}</dd>
                        </div>
                        <div>
                          <dt>{t('eaQuality')}</dt>
                          <dd>{e.quality}</dd>
                        </div>
                      </dl>
                      {e.history.length > 0 && (
                        <ul className="ea-history-list">
                          {e.history.map((h, i) => (
                            <li key={i}>
                              {new Date(h.at).toLocaleString()} ·{' '}
                              {t(h.action === 'acknowledge' ? 'monAcknowledged' : h.action === 'dismiss' ? 'monDismissed' : 'monContextAdded')}
                              {h.note && ` · ${h.note}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Disclosure>
                  </div>
                </EventItem>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export function DevicesPage() {
  const t = useT(),
    m = useMonitoringProfile(),
    s = m.snapshot;
  const [token, setToken] = useState(''),
    [edge, setEdge] = useState<'idle' | 'connected' | 'unavailable'>('idle');
  const connect = async () => {
    try {
      const r = await fetch('/edge-api/health', { headers: { Authorization: `Bearer ${token}` } });
      const data: unknown = await r.json();
      if (!r.ok || typeof data !== 'object' || !data || !('service' in data) || data.service !== 'tanda-edge')
        throw new Error();
      setEdge('connected');
      setToken('');
    } catch {
      setEdge('unavailable');
    }
  };
  return (
    <div className="platform-page space-y-6">
      <PageHeader title={t('monDevices')} description={t('monDevicesIntro')} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="device-card space-y-3">
          <span className="section-icon">
            <Camera aria-hidden className="text-primary" />
          </span>
          <h2 className="text-xl">{t(s?.health.camera.simulated ? 'monSimulatedCamera' : 'monBrowserInput')}</h2>
          <p>{s?.care.environment.name}</p>
          <StatusBadge tone={statusTone(s?.health.camera.state ?? 'not-configured')}>
            {t(statusKeys[s?.health.camera.state ?? 'not-configured'])}
          </StatusBadge>
          <p className="text-sm text-ink-muted">{t('monNoFakeVideo')}</p>
          <Link href="/monitoring" className="platform-link">
            {t('monOpenMonitoring')}
          </Link>
          <dl className="device-facts">
            <div>
              <dt>{t('monCamera')}</dt>
              <dd>{s?.health.camera.id ?? t('monNotConfigured')}</dd>
            </div>
            <div>
              <dt>{t('monLatest')}</dt>
              <dd>
                {s?.health.lastSuccessfulObservation
                  ? new Date(s.health.lastSuccessfulObservation).toLocaleTimeString()
                  : t('monNoObservations')}
                {s?.health.camera.simulated && <small>{t('monSimulatedClock')}</small>}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="device-card space-y-3">
          <span className="section-icon">
            <Cpu aria-hidden className="text-primary" />
          </span>
          <h2 className="text-xl">{t('monEdgeService')}</h2>
          <p>
            {t(
              edge === 'connected'
                ? 'monEdgeConnected'
                : edge === 'unavailable'
                  ? 'monEdgeUnavailable'
                  : 'monEdgeNotConnected',
            )}
          </p>
          <p className="text-sm text-ink-muted">{t('monEdgeDisclosure')}</p>
          <label className="block text-sm">
            {t('monGatewayToken')}
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3"
            />
          </label>
          <Button disabled={token.length < 24} onClick={() => void connect()}>
            {t('monConnectGateway')}
          </Button>
        </Card>
      </div>
      <Card className="unavailable-capability">
        <div className="section-heading">
          <h2 className="text-xl">{t('monIpCamera')}</h2>
          <StatusBadge>{t('monUnavailable')}</StatusBadge>
        </div>
        <p className="mt-2 text-ink-muted">{t('monIpUnavailable')}</p>
      </Card>
      <Card className="unavailable-capability">
        <div className="flex items-center gap-2">
          <Lock aria-hidden size={18} />
          <h2 className="text-xl">{t('monAudioEngine')}</h2>
        </div>
        <p className="mt-2 text-ink-muted">{t('monAudioBoundary')}</p>
      </Card>
      <MonitoringConfig />
      <p className="text-sm text-ink-muted">{t('monRemoteUnavailable')}</p>
    </div>
  );
}
