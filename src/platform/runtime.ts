import {
  initialSnapshot,
  careSchema,
  monitoringEventSchema,
  observationSchema,
  snapshotSchema,
  type CareProfile,
  type MonitoringEvent,
  type MonitoringSnapshot,
  type Observation,
} from './contracts.js';
import { collectBaseline, contextFor, deviation, MAX_GAP_MS, resetBaseline } from './behaviour.js';

/** Shared by the browser demonstrator and separate edge service. Never accepts pixels or audio. */
export class MonitoringRuntime {
  private value: MonitoringSnapshot;
  private streak = 0;
  private candidateAt: number | null = null;
  private lastAt: number | null = null;
  private episode = false;
  private ordinary = 0;
  private lastAlert = -Infinity;
  constructor(
    snapshot: unknown,
    private readonly id: () => string,
  ) {
    this.value = snapshotSchema.parse(snapshot);
    const latest = this.value.events.filter((e) => e.type === 'movement-deviation').at(-1);
    if (latest) {
      this.lastAlert = Date.parse(latest.at);
      this.episode = true;
    }
  }
  snapshot(): MonitoringSnapshot {
    return structuredClone(this.value);
  }
  configure(input: CareProfile) {
    const care = careSchema.parse(input),
      old = this.value.care;
    const changed =
      care.environment.id !== old.environment.id ||
      care.environment.name !== old.environment.name ||
      care.environment.cameraId !== old.environment.cameraId;
    this.value.care = care;
    if (changed && this.value.baseline.count) this.value.baseline.state = 'requires-review';
    if (changed || !care.consent.video || !care.consent.authorityConfirmed) this.stop();
  }
  private emit(
    type: MonitoringEvent['type'],
    at: string,
    quality: Observation['quality'],
    explanation: MonitoringEvent['explanation'],
    priority: MonitoringEvent['priority'] = 'information',
  ) {
    const s = this.value;
    const e = monitoringEventSchema.parse({
      id: this.id(),
      individualId: s.individualId,
      sourceId: s.health.camera.id,
      roomId: s.care.environment.id,
      type,
      at,
      category: type === 'movement-deviation' ? 'behaviour' : 'environment',
      quality,
      explanation,
      priority,
      confidence: null,
      simulated: s.health.camera.simulated,
      status: 'new',
      acknowledgedAt: null,
      note: '',
      history: [],
    });
    if (s.events.length >= 10000)
      throw new Error('Event capacity reached. Export or clear local monitoring data before continuing.');
    s.events.push(e);
  }
  start(at: string, mode: 'browser-demo' | 'edge-simulation' | 'browser-camera' = 'browser-demo') {
    const s = this.value;
    if (!s.care.consent.video || !s.care.consent.authorityConfirmed)
      throw new Error('Explicit monitoring consent is required.');
    const already = s.health.gateway.state === 'running' && s.health.camera.state === 'connected';
    s.health.gateway = { ...s.health.gateway, state: 'running', mode };
    s.health.camera = {
      ...s.health.camera,
      id: s.care.environment.cameraId,
      roomId: s.care.environment.id,
      state: 'connected',
      integration: mode === 'browser-camera' ? 'browser-webcam' : 'simulated',
      simulated: mode !== 'browser-camera',
    };
    this.streak = 0;
    this.lastAt = null;
    if (!already) this.emit('monitoring-started', at, 'missing', 'started');
  }
  stop() {
    this.value.health.gateway.state = 'stopped';
    this.value.health.camera.state = 'disabled';
    this.streak = 0;
    this.lastAt = null;
  }
  disconnect(at: string) {
    const s = this.value;
    if (s.health.camera.state !== 'connected') return;
    s.health.camera.state = 'disconnected';
    s.health.observationQuality = 'disconnected';
    this.streak = 0;
    this.lastAt = null;
    this.emit('camera-disconnected', at, 'disconnected', 'disconnected');
  }
  resetDemo() {
    if (this.value.events.some((e) => !e.simulated))
      throw new Error('Actual observation history cannot be reset as a demo.');
    const care = this.value.care;
    this.value = initialSnapshot(this.value.individualId);
    this.value.care = care;
    this.streak = 0;
    this.lastAt = null;
    this.episode = false;
    this.lastAlert = -Infinity;
  }
  beginBaseline() {
    this.value.baseline = resetBaseline();
    this.streak = 0;
    this.episode = false;
  }
  ingest(input: unknown) {
    const o = observationSchema.parse(input),
      s = this.value;
    if ((o.sourceMode === 'simulated') !== s.health.camera.simulated)
      throw new Error('Observation source mode mismatch.');
    if (o.individualId !== s.individualId || o.sourceId !== s.health.camera.id || o.roomId !== s.care.environment.id)
      throw new Error('Observation assignment mismatch.');
    if (
      s.health.gateway.state !== 'running' ||
      s.health.camera.state !== 'connected' ||
      !s.care.consent.video ||
      !s.care.consent.authorityConfirmed
    )
      return;
    const now = Date.parse(o.at);
    if (this.lastAt !== null && now <= this.lastAt) return;
    if (this.lastAt !== null && now - this.lastAt > MAX_GAP_MS) {
      this.streak = 0;
      this.candidateAt = null;
    }
    this.lastAt = now;
    s.health.camera.lastObservation = o.at;
    if (o.quality === 'disconnected') {
      this.disconnect(o.at);
      return;
    }
    if (o.quality !== 'good' || o.energy === null) {
      if (s.health.observationQuality === 'good') this.emit('observation-unavailable', o.at, o.quality, 'poor-quality');
      s.health.observationQuality = o.quality;
      this.streak = 0;
      this.candidateAt = null;
      return;
    }
    s.health.observationQuality = 'good';
    s.health.lastSuccessfulObservation = o.at;
    if (s.baseline.context && contextFor(o) !== s.baseline.context) s.baseline.state = 'requires-review';
    const before = s.baseline.state;
    if (s.care.movementEnabled && s.baseline.state !== 'not-configured')
      s.baseline = collectBaseline(s.baseline, {
        ...o,
        reviewedContext: o.reviewedContext && s.care.baselineContextReviewed,
      });
    if (before !== 'available' && s.baseline.state === 'available')
      this.emit('baseline-available', o.at, 'good', 'baseline-ready');
    const inSchedule =
      !s.care.schedules.length || s.care.schedules.some((w) => o.localHour >= w.startHour && o.localHour < w.endHour);
    if (!s.care.movementEnabled || !s.care.baselineContextReviewed || !o.reviewedContext || !inSchedule) {
      this.streak = 0;
      return;
    }
    if (deviation(s.baseline, o)) {
      this.ordinary = 0;
      if (this.streak === 0) this.candidateAt = now;
      this.streak++;
      if (
        this.streak >= 3 &&
        this.candidateAt !== null &&
        now - this.candidateAt >= 2000 &&
        !this.episode &&
        now - this.lastAlert >= 60000
      ) {
        this.emit('movement-deviation', o.at, 'good', 'sustained-deviation', 'review');
        this.episode = true;
        this.lastAlert = now;
      }
    } else {
      this.streak = 0;
      this.candidateAt = null;
      this.ordinary++;
      if (this.ordinary >= 3) this.episode = false;
    }
  }
  review(eventId: string, action: 'acknowledge' | 'dismiss' | 'note', note: string, at: string) {
    const e = this.value.events.find((e) => e.id === eventId);
    if (!e) throw new Error('Event not found.');
    const feedback = monitoringEventSchema.shape.history.element.parse({ action, note, at });
    if (e.history.length >= 200) throw new Error('Review history capacity reached.');
    e.history.push(feedback);
    e.note = note;
    if (action === 'acknowledge') {
      e.status = 'acknowledged';
      e.acknowledgedAt = at;
    }
    if (action === 'dismiss') e.status = 'dismissed';
  }
}
