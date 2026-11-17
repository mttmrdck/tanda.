import {
  Activity,
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
} from 'lucide-react';
import { useState } from 'react';
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

export function PlatformOverview() {
  const t = useT(),
    m = useMonitoringProfile(),
    profile = useData((s) => s.profile),
    s = m.snapshot;
  const pending = s?.events.filter((e) => e.priority !== 'information' && e.status === 'new').length ?? 0;
  const recent = [...(s?.events ?? [])].reverse().slice(0, 3);
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'ovMorning' : hour < 18 ? 'ovAfternoon' : 'ovEvening');
  const lang = useSettings((x) => x.lang);
  const today = new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const monitorState = s?.health.gateway.state ?? 'stopped';
  const sourceLabel = s?.health.camera.simulated ? t('vdDemoSource') : s?.health.camera.state === 'connected' ? t('vdVideoSource') : t('ovNoSource');
  return (
    <div className="platform-page overview-page">
      <header className="page-heading overview-heading">
        <div className="page-heading-copy">
          <p className="page-eyebrow">{today}</p>
          <h1>{t('monOverview')}</h1>
          <p className="overview-greeting">{t('ovCareFor', { greeting, name: profile?.nickname ?? '' })}</p>
        </div>
      </header>
      <section className="care-focus" aria-label={t('vdCareContext')}>
        <div className="care-focus-person">
          <Avatar name={profile?.nickname ?? ''} size="lg" />
          <div className="min-w-0">
            <h2 className="care-focus-name">{profile?.nickname}</h2>
            <p className="identity-context">
              {s?.care.environment.name ?? t('monNotConfigured')}
              <span aria-hidden> · </span>
              {t(s?.care.category === 'child' ? 'monChild' : s?.care.category === 'older-adult' ? 'monOlder' : 'monUnspecified')}
            </p>
            <StatusBadge tone="neutral" dot={false}>
              <ShieldCheck size={14} aria-hidden />
              {t('monLocalOnly')}
            </StatusBadge>
          </div>
        </div>
        <div className="care-focus-state">
          <p className="focus-kicker">{t('ovMonitoringNow')}</p>
          <p className="focus-value" data-testid="overview-monitoring-state">
            <span className={`status-dot tone-${statusTone(monitorState)}`} aria-hidden />
            {t(statusKeys[monitorState] ?? 'monStopped')}
          </p>
          <p className="focus-meta">
            {t('ovSource')}: <strong>{sourceLabel}</strong>
            {s?.health.camera.simulated && <span className="sim-tag">{t('tagSimulated')}</span>}
          </p>
          <div className="care-focus-actions">
            <Link href="/monitoring" className="platform-primary">
              {t('monOpenMonitoring')}
              <ArrowUpRight size={17} aria-hidden />
            </Link>
            <Link href="/events" className={pending ? 'attention-link has-attention' : 'attention-link'}>
              <Bell size={16} aria-hidden />
              {pending ? t('ovAttention', { n: pending }) : t('ovAttentionNone')}
            </Link>
          </div>
        </div>
      </section>
      {m.error && <p role="alert">{t('storageError')}</p>}
      <section className="ov-status" aria-label={t('vdSystemStatus')}>
        {[
          {
            Icon: Camera,
            label: 'monCamera' as const,
            state: s?.health.camera.state ?? 'not-configured',
            value: t(statusKeys[s?.health.camera.state ?? 'not-configured']),
            caption: sourceLabel,
          },
          {
            Icon: Cpu,
            label: 'monLocalProcessing' as const,
            state: s?.health.gateway.state ?? 'stopped',
            value: t(statusKeys[s?.health.gateway.state ?? 'stopped']),
            caption: t('monBrowserDemoGateway'),
          },
          {
            Icon: Activity,
            label: 'monBaseline' as const,
            state: s?.baseline.state ?? 'not-configured',
            value: t(baselineKeys[s?.baseline.state ?? 'not-configured']),
            caption: t('monBaselineSamples', { n: s?.baseline.count ?? 0, seconds: Math.round((s?.baseline.coverageMs ?? 0) / 1000) }),
          },
          {
            Icon: Bell,
            label: 'monNeedsReview' as const,
            state: pending ? 'requires-review' : 'good',
            value: String(pending),
            caption: t('monEvents'),
          },
        ].map(({ Icon, label, state, value, caption }) => (
          <div key={label} className="ov-tile">
            <p className="ov-tile-label">
              <Icon size={16} aria-hidden />
              {t(label)}
            </p>
            <p className="ov-tile-value">
              <span className={`status-dot tone-${statusTone(state)}`} aria-hidden />
              <span>{value}</span>
            </p>
            <p className="ov-tile-caption">{caption}</p>
          </div>
        ))}
      </section>

      <div className="ov-grid">
        <section className="ov-panel ov-review" aria-labelledby="ov-review-h">
          <header className="ov-panel-head">
            <h2 id="ov-review-h">{t('monEventQueue')}</h2>
            <Link href="/events" className="platform-link">
              {t('homeSeeAll')}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          </header>
          {recent.length ? (
            <ul className="ov-events">
              {recent.map((e) => (
                <li key={e.id}>
                  <span className={`event-marker tone-${e.priority === 'review' ? 'review' : 'neutral'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link href="/events" className="ov-event-title">
                      {t(eventKeys[e.type])}
                    </Link>
                    <p className="ov-event-meta">
                      {t(e.simulated ? 'monSimulatedEvent' : 'monBrowserObservation')} · {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ArrowUpRight aria-hidden size={16} className="shrink-0 text-ink-muted" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="ov-empty">
              <span className="ov-empty-icon" aria-hidden>
                <Bell size={20} />
              </span>
              <p>{t('monNoEvents')}</p>
              <Link href="/monitoring" className="platform-link">
                {t('monOpenMonitoring')}
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
          )}
          <dl className="ov-panel-foot">
            <dt>{t('monLatest')}</dt>
            <dd>
              <strong>{s?.health.lastSuccessfulObservation ? new Date(s.health.lastSuccessfulObservation).toLocaleTimeString() : t('monNoObservations')}</strong>
              <span>{s?.health.camera.simulated ? t('monSimulatedClock') : t('monBrowserInput')}</span>
            </dd>
          </dl>
        </section>

        <div className="ov-side">
          <section className="ov-panel ov-comm" aria-labelledby="ov-comm-h">
            <header className="ov-panel-head">
              <h2 id="ov-comm-h">{t('navCommunication')}</h2>
              <span className="ov-panel-icon" aria-hidden>
                <Hand size={18} />
              </span>
            </header>
            <p className="ov-panel-text">{t('monCommunicationBody')}</p>
            <Link href="/home" className="platform-primary ov-comm-cta">
              {t('monOpenCommunication')}
              <ArrowUpRight size={17} aria-hidden />
            </Link>
          </section>
          <section className="ov-panel" aria-labelledby="ov-cap-h">
            <header className="ov-panel-head">
              <h2 id="ov-cap-h">{t('vdEngines')}</h2>
            </header>
            <ul className="ov-capabilities" aria-label={t('monEngines')}>
              {[
                { name: 'monEnvironmentEngine', status: 'monBrowserAndDemo', Icon: Camera },
                { name: 'monBehaviourEngine', status: 'monExperimental', Icon: Activity },
                { name: 'monCommunicationEngine', status: 'monOperational', Icon: Hand },
                { name: 'monAudioEngine', status: 'monAudioUnavailable', Icon: Lock },
              ].map((item) => (
                <li key={item.name}>
                  <item.Icon aria-hidden size={16} />
                  <span className="ov-cap-name">{t(item.name as MsgKey)}</span>
                  <span className="ov-cap-status">{t(item.status as MsgKey)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
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

export function EventsPage() {
  const t = useT(),
    m = useMonitoringProfile(),
    profile = useData((s) => s.profile);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<string | null>(null),
    [note, setNote] = useState('');
  const events = [...(m.snapshot?.events ?? [])]
    .sort(
      (a, b) =>
        Number(b.status === 'new' && b.priority !== 'information') -
          Number(a.status === 'new' && a.priority !== 'information') || Date.parse(b.at) - Date.parse(a.at),
    )
    .filter(
      (e) =>
        filter === 'all' ||
        (filter === 'pending' ? e.status === 'new' && e.priority !== 'information' : e.status !== 'new'),
    );
  return (
    <div className="platform-page space-y-6">
      <PageHeader
        title={t('monEvents')}
        description={t('vdReviewSubtitle')}
        actions={
          <span className="individual-context-chip">
            <Avatar name={profile?.nickname ?? ''} />
            {t('vdEventsFor', { name: profile?.nickname ?? '' })}
          </span>
        }
      />
      <details className="event-context">
        <summary>
          {t('vdAboutEvents')}
          <ChevronDown aria-hidden size={15} />
        </summary>
        <p className="event-intro">{t('monEventIntro')}</p>
      </details>
      <div className="event-toolbar">
        <label>
          {t('monFilter')}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-3 min-h-11 rounded-xl bg-surface px-4"
          >
            <option value="all">{t('monAll')}</option>
            <option value="pending">{t('monNeedsReview')}</option>
            <option value="history">{t('monHistory')}</option>
          </select>
        </label>
        <StatusBadge
          tone={
            m.snapshot?.events.some((e) => e.status === 'new' && e.priority !== 'information') ? 'review' : 'neutral'
          }
        >
          {m.snapshot?.events.filter((e) => e.status === 'new' && e.priority !== 'information').length ?? 0} ·{' '}
          {t('monNeedsReview')}
        </StatusBadge>
      </div>
      {m.error && <p role="alert">{t('monActionError')}</p>}
      {!events.length && (
        <Card className="intentional-empty">
          <Bell aria-hidden size={28} />
          <p>{t('monNoEvents')}</p>
          <Link href="/monitoring" className="platform-link mt-3">
            {t('monOpenMonitoring')}
          </Link>
        </Card>
      )}
      <ul className="event-timeline">
        {events.map((e) => (
          <Card
            as="li"
            key={e.id}
            className="monitor-event"
            data-testid="monitor-event"
            data-priority={e.priority}
            data-review-state={e.status}
          >
            <span className={`event-node node-${e.priority} state-${e.status}`} aria-hidden />
            <div className="event-body">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`monitor-priority priority-${e.priority}`}>
                <Bell aria-hidden size={15} />
                {t(
                  e.priority === 'information'
                    ? 'monInformation'
                    : e.priority === 'review'
                      ? 'monReview'
                      : 'monHighPriority',
                )}
              </span>
              <span className="text-sm text-ink-muted">
                {t(e.simulated ? 'monSimulatedEvent' : 'monBrowserObservation')}
              </span>
            </div>
            <h2 className="mt-3 text-xl">{t(eventKeys[e.type])}</h2>
            <p className="event-explanation">{t(explanationKeys[e.explanation])}</p>
            <dl className="monitor-event-meta">
              <div>
                <dt>{t('monEnvironment')}</dt>
                <dd>
                  {m.snapshot?.care.environment.name} · {e.roomId}
                </dd>
              </div>
              <div>
                <dt>{t('monCamera')}</dt>
                <dd>{e.sourceId}</dd>
              </div>
              <div>
                <dt>{t('monObservationQuality')}</dt>
                <dd>{t(statusKeys[e.quality])}</dd>
              </div>
              <div>
                <dt>{t('colTime')}</dt>
                <dd>
                  <time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time>
                </dd>
              </div>
            </dl>
            <p className="event-review-state" role="status" data-testid="review-state">
              {t(e.status === 'new' ? 'monNew' : e.status === 'acknowledged' ? 'monAcknowledged' : 'monDismissed')}
            </p>
            {e.note && <p className="caregiver-note">{e.note}</p>}
            <div className="monitor-event-actions">
              <Button
                variant={e.priority !== 'information' && e.status === 'new' ? 'primary' : 'secondary'}
                disabled={e.status === 'acknowledged'}
                icon={<Check aria-hidden size={16} />}
                onClick={() => void m.review(e.id, 'acknowledge', e.note)}
              >
                {t('monAcknowledge')}
              </Button>
              <Button
                variant="secondary"
                disabled={e.status === 'dismissed'}
                onClick={() => void m.review(e.id, 'dismiss', e.note)}
              >
                {t('monDismiss')}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setEditing(e.id);
                  setNote(e.note);
                }}
              >
                {t('monAddContext')}
              </Button>
            </div>
            <details className="event-history">
              <summary className="min-h-11 cursor-pointer py-3 text-sm text-primary">
                {t('monReviewHistory')} ({e.history.length})
              </summary>
              <ul className="space-y-2 text-sm">
                {e.history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString()} ·{' '}
                    {t(
                      h.action === 'acknowledge'
                        ? 'monAcknowledged'
                        : h.action === 'dismiss'
                          ? 'monDismissed'
                          : 'monContextAdded',
                    )}
                    {h.note && ` · ${h.note}`}
                  </li>
                ))}
              </ul>
            </details>
            </div>
          </Card>
        ))}
      </ul>
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
