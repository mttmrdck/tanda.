import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  Cpu,
  Lock,
  Radio,
  Hand,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Info,
  Plus,
  X,
} from 'lucide-react';
import { useState, type ReactNode, type Ref } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { dur, ease, indicator } from '../motion';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useMonitoring } from '../../store/useMonitoring';
import { pickText, useT, type MsgKey } from '../../i18n';
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
import type { MonitoringEvent } from '../../platform/contracts';

const baselineKeys: Record<string, MsgKey> = {
  'not-configured': 'monNotConfigured',
  collecting: 'monCollecting',
  insufficient: 'monInsufficient',
  available: 'monAvailable',
  'requires-review': 'monRequiresReview',
};
const baselineShort: Record<string, MsgKey> = {
  'not-configured': 'ovBlNone',
  collecting: 'ovBlCollecting',
  insufficient: 'ovBlInsufficient',
  available: 'ovBlReady',
  'requires-review': 'ovBlReview',
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

export function PlatformOverview() {
  const t = useT(),
    m = useMonitoringProfile(),
    profile = useData((s) => s.profile),
    signals = useData((s) => s.signals),
    s = m.snapshot;
  const lang = useSettings((x) => x.lang);
  const today = new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const name = profile?.nickname ?? '';
  const live = s?.health.gateway.state === 'running';
  const simulated = s?.health.camera.simulated ?? false;
  const open = (s?.events ?? []).filter((e) => e.priority !== 'information' && e.status === 'new');
  const moment = open[open.length - 1];
  const samples = s?.baseline.count ?? 0;
  const filled = Math.round((Math.min(samples, BASELINE_SAMPLE_MIN) / BASELINE_SAMPLE_MIN) * 7);
  const tags = signals.slice(0, 2).map((x) => pickText(x.meaning, lang));
  const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="platform-page overview-page">
      <header className="ov-head">
        <p className="page-eyebrow">{today}</p>
        <h1>{t('monOverview')}</h1>
        <p className="ov-privacy">
          <ShieldCheck size={15} aria-hidden />
          {t('ovPrivacy')}
        </p>
      </header>
      {m.error && <p role="alert">{t('storageError')}</p>}

      <div className="ov-layout">
        <section className="ov-card ov-hero" aria-labelledby="ov-hero-h" data-live={live || undefined}>
          <div className="ov-hero-top">
            <p className="ov-kicker" data-testid="overview-monitoring-state">
              <span className={live ? 'ov-pulse is-live' : 'ov-pulse'} aria-hidden />
              {t(live ? 'ovLive' : 'ovStandby')}
            </p>
            {(live || simulated) && <span className={live && !simulated ? 'ov-source is-live' : 'ov-source'}>{t(simulated ? 'tagSimulated' : 'ovLiveTag')}</span>}
          </div>
          <h2 id="ov-hero-h" className="ov-hero-title">
            {live ? t('ovObserving', { name }) : t('ovReady')}
          </h2>
          <p className="ov-hero-body">{t(live ? 'ovLiveBody' : 'ovStandbyBody')}</p>
          <div className="ov-hero-actions">
            <Link href="/monitoring" className="ov-btn ov-btn-primary">
              {t(live ? 'monOpenMonitoring' : 'ovStart')}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
            <Link href="/teach" className="ov-btn ov-btn-ghost">
              <Plus size={16} aria-hidden />
              {t('ovTeach')}
            </Link>
          </div>
          <p className="ov-hero-foot">
            <span>{t('monLatest')}</span>
            <strong>{s?.health.lastSuccessfulObservation ? clock(s.health.lastSuccessfulObservation) : t('monNoObservations')}</strong>
          </p>
        </section>

        <div className="ov-bento">
          <Link href="/home" className="ov-card ov-tile-card">
            <span className="ov-label">
              <Hand size={14} aria-hidden />
              {t('ovSignals')}
            </span>
            <span className="ov-metric">
              <span className="ov-metric-num">{signals.length}</span>
              <span className="ov-metric-unit">{t('ovTaught')}</span>
            </span>
            <span className="ov-tags">
              {tags.length ? (
                <>
                  {tags.map((x, i) => (
                    <span key={i} className="ov-tag">
                      {x}
                    </span>
                  ))}
                  {signals.length > 2 && <span className="ov-tag">+{signals.length - 2}</span>}
                </>
              ) : (
                <span className="ov-tag">{t('ovFirstSignal')}</span>
              )}
            </span>
            <span className="ov-tile-foot">
              {t('ovLibrary')}
              <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
          <Link href="/movement" className="ov-card ov-tile-card">
            <span className="ov-label">
              <Activity size={14} aria-hidden />
              {t('monBaseline')}
            </span>
            <span className="ov-metric ov-metric-split">
              <span className="ov-metric-word">{t(baselineShort[s?.baseline.state ?? 'not-configured'] ?? 'ovBlNone')}</span>
              <span className="ov-bars" aria-hidden>
                {[42, 58, 48, 64, 52, 60, 46].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} className={i < filled ? 'is-on' : undefined} />
                ))}
              </span>
            </span>
            <span className="ov-tags">
              <span className="ov-tag">{t('ovSamples', { n: samples, min: BASELINE_SAMPLE_MIN })}</span>
            </span>
            <span className="ov-tile-foot is-quiet">{t('ovNonDiagnostic')}</span>
          </Link>
        </div>

        <section className="ov-review-slot" aria-label={t('monEventQueue')}>
          <AnimatePresence initial={false} mode="popLayout">
          {moment ? (
            <motion.div
              key={moment.id}
              className="ov-card ov-moment"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: dur.screen, ease: ease.out } }}
              exit={{ opacity: 0, y: -4, transition: { duration: dur.exit, ease: ease.in } }}
            >
              <p className="ov-kicker is-strong">
                <span className="ov-pulse is-live" aria-hidden />
                {t('ovNeedsConfirm', { time: clock(moment.at) })}
              </p>
              <p className="ov-moment-title">{t(eventKeys[moment.type])}</p>
              <p className="ov-moment-meta">
                {t(moment.simulated ? 'monSimulatedEvent' : 'monBrowserObservation')} · {t(explanationKeys[moment.explanation])}
              </p>
              <div className="ov-moment-actions">
                <button type="button" className="ov-btn ov-btn-primary" onClick={() => void m.review(moment.id, 'acknowledge', moment.note)}>
                  <Check size={16} aria-hidden />
                  {t('monAcknowledge')}
                </button>
                <button type="button" className="ov-btn ov-btn-ghost" onClick={() => void m.review(moment.id, 'dismiss', moment.note)}>
                  <X size={16} aria-hidden />
                  {t('monDismiss')}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="clear"
              className="ov-clear-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: dur.screen, ease: ease.out } }}
              exit={{ opacity: 0, transition: { duration: dur.exit, ease: ease.in } }}
            >
            <Link href="/events" className="ov-card ov-clear">
              <span className="ov-clear-main">
                <CheckCircle2 size={17} aria-hidden />
                {t('ovAttentionNone')}
              </span>
              <span className="ov-clear-side">
                {t('ovHistory', { n: open.length })}
                <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
            </motion.div>
          )}
          </AnimatePresence>
        </section>
      </div>

      <footer className="ov-footnote">
        <ShieldCheck aria-hidden size={16} />
        <div>
          <p>{t('monPhilosophy')}</p>
          <p>{t('monRemoteUnavailable')}</p>
        </div>
      </footer>
    </div>
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

/**
 * One review item. Changing between the full card and the compact row swaps keys, so the old shape fades out while
 * the new one rises in and neighbours glide into place. While leaving, the item is hidden from assistive technology.
 */
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
      animate={{ opacity: 1, y: 0, transition: { duration: dur.screen, ease: ease.out, delay: 0.09 } }}
      exit={{ opacity: 0, transition: { duration: 0.09, ease: ease.in } }}
      transition={{ layout: { duration: dur.screen, ease: ease.out } }}
    >
      {children}
    </motion.li>
  );
}

/** Acknowledged: the tick draws once, as a quiet confirmation. */
function AckMark() {
  return (
    <svg className="ea-done-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <motion.path d="m9 12 2 2 4-4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22, ease: ease.out, delay: 0.08 }} />
    </svg>
  );
}

export function EventsPage() {
  const t = useT(),
    m = useMonitoringProfile(),
    profile = useData((s) => s.profile);
  const [filter, setFilter] = useState<'pending' | 'all' | 'history'>('all');
  const [why, setWhy] = useState(false);
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
  const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const contextButton = (e: MonitoringEvent) => (
    <button
      type="button"
      className="ov-btn ea-quiet"
      onClick={() => {
        setEditing(e.id);
        setNote(e.note);
      }}
    >
      {t('monAddContext')}
    </button>
  );
  const historyBlock = (e: MonitoringEvent) =>
    e.history.length > 0 && (
      <details className="ea-history">
        <summary>
          {t('monReviewHistory')} ({e.history.length})
          <ChevronDown aria-hidden size={14} />
        </summary>
        <ul>
          {e.history.map((h, i) => (
            <li key={i}>
              {new Date(h.at).toLocaleString()} ·{' '}
              {t(h.action === 'acknowledge' ? 'monAcknowledged' : h.action === 'dismiss' ? 'monDismissed' : 'monContextAdded')}
              {h.note && ` · ${h.note}`}
            </li>
          ))}
        </ul>
      </details>
    );
  return (
    <div className="platform-page ea-page">
      <header className="ea-head">
        <p className="page-eyebrow">{t('eaEyebrow')}</p>
        <div className="ea-title-row">
          <h1>{t('monEvents')}</h1>
          <button type="button" className={why ? 'ea-why is-open' : 'ea-why'} aria-expanded={why} aria-controls="ea-principle" onClick={() => setWhy((v) => !v)}>
            <Info size={14} aria-hidden />
            {t('eaPhilosophy')}
          </button>
        </div>
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
          <h2 id="ea-empty-h">{all.length ? t('ovAttentionNone') : t('monNoEvents')}</h2>
          <p>{t('eaAllClearBody', { name: profile?.nickname ?? '' })}</p>
          <Link href="/monitoring" className="ov-btn ov-btn-primary">
            {t('monOpenMonitoring')}
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        </motion.section>
      ) : (
        <ul className="ea-list">
          <AnimatePresence initial={false} mode="popLayout">
          {events.map((e) => {
            const state = (
              <span className={`ea-state state-${e.status}`} role="status" data-testid="review-state">
                {t(e.status === 'new' ? 'monNew' : e.status === 'acknowledged' ? 'monAcknowledged' : 'monDismissed')}
              </span>
            );
            if (!isPending(e))
              return (
                <EventItem key={`${e.id}:row`} className="ov-card ea-done" priority={e.priority} state={e.status}>
                  <div className="ea-done-row">
                    {e.status === 'new' ? (
                      <Info size={17} aria-hidden className="ea-done-icon" />
                    ) : e.status === 'acknowledged' ? (
                      <AckMark />
                    ) : (
                      <CheckCircle2 size={17} aria-hidden className="ea-done-icon" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="ea-done-time">
                        <time dateTime={e.at}>{clock(e.at)}</time> · {t(e.simulated ? 'monSimulatedEvent' : 'monBrowserObservation')}
                      </p>
                      <h2 className="ea-done-title">{t(eventKeys[e.type])}</h2>
                      {e.note && <p className="ea-note">{e.note}</p>}
                    </div>
                    {state}
                  </div>
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
                    {contextButton(e)}
                  </div>
                  {historyBlock(e)}
                </EventItem>
              );
            return (
              <EventItem key={`${e.id}:card`} className="ov-card ea-card" priority={e.priority} state={e.status}>
                <div className="ea-card-top">
                  <p className="ov-kicker is-strong">
                    <span className={`ea-dot node-${e.priority}`} aria-hidden />
                    {t(e.priority === 'information' ? 'monInformation' : e.priority === 'review' ? 'monReview' : 'monHighPriority')}
                    <span className="ea-time">
                      · <time dateTime={e.at}>{clock(e.at)}</time>
                    </span>
                  </p>
                  <span className={e.simulated ? 'ov-source' : 'ov-source is-live'}>{t(e.simulated ? 'monSimulatedEvent' : 'monBrowserObservation')}</span>
                </div>
                <h2 className="ea-title">{t(eventKeys[e.type])}</h2>
                <p className="ea-detail">{t(explanationKeys[e.explanation])}</p>
                <dl className="ea-telemetry">
                  <div>
                    <dt>{t('eaQuality')}</dt>
                    <dd>{t(statusKeys[e.quality])}</dd>
                  </div>
                  <div>
                    <dt>{t('monCamera')}</dt>
                    <dd>{e.sourceId}</dd>
                  </div>
                  <div>
                    <dt>{t('eaRoom')}</dt>
                    <dd>{m.snapshot?.care.environment.name || e.roomId}</dd>
                  </div>
                </dl>
                {e.note && <p className="ea-note">{e.note}</p>}
                <div className="ea-actions">
                  <button type="button" className="ov-btn ov-btn-primary" onClick={() => void m.review(e.id, 'acknowledge', e.note)}>
                    <Check size={16} aria-hidden />
                    {t('monAcknowledge')}
                  </button>
                  <button type="button" className="ov-btn ov-btn-ghost" onClick={() => void m.review(e.id, 'dismiss', e.note)}>
                    <X size={16} aria-hidden />
                    {t('monDismiss')}
                  </button>
                </div>
                <div className="ea-foot">
                  {state}
                  {contextButton(e)}
                </div>
                {historyBlock(e)}
              </EventItem>
            );
          })}
          </AnimatePresence>
        </ul>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={t('monAddContext')}
        footer={
          <Button
            onClick={() => {
              if (editing)
                void m.review(editing, 'note', note).then((ok) => {
                  if (ok) setEditing(null);
                });
            }}
          >
            {t('save')}
          </Button>
        }
      >
        <TextField label={t('monCaregiverNote')} value={note} onChange={setNote} multiline maxLength={500} />
      </Dialog>
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
