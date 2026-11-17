import { describe, expect, it } from 'vitest';
import { initialSnapshot, observationSchema, snapshotSchema, type Observation } from '../../src/platform/contracts';
import { MonitoringRuntime } from '../../src/platform/runtime';
import { SimulatedCameraAdapter, UnavailableIpCameraAdapter, audioPipeline } from '../../src/platform/adapters';

const start = Date.parse('2026-11-17T10:00:00Z');
function setup() {
  const s = initialSnapshot('p');
  s.care.consent = { video: true, authorityConfirmed: true, audio: false, reviewedAt: new Date(start).toISOString() };
  s.care.movementEnabled = true;
  s.care.baselineContextReviewed = true;
  let id = 0;
  const r = new MonitoringRuntime(s, () => `e${id++}`);
  r.start(new Date(start).toISOString());
  return r;
}
const obs = (n: number, extra: Partial<Observation> = {}): Observation => ({
  individualId: 'p',
  sourceId: 'camera-1',
  roomId: 'room-1',
  at: new Date(start + n * 1000).toISOString(),
  localHour: 10,
  quality: 'good',
  energy: 0.2,
  sourceMode: 'simulated',
  reviewedContext: true,
  ...extra,
});
function baseline(r: MonitoringRuntime) {
  r.beginBaseline();
  for (let i = 0; i < 24; i++) r.ingest(obs(i));
}

describe('monitoring contracts and temporal event engine', () => {
  it('requires explicit consent, never infers it from age category', () => {
    const s = initialSnapshot('p');
    s.care.category = 'older-adult';
    const r = new MonitoringRuntime(s, () => 'e');
    expect(() => r.start(new Date(start).toISOString())).toThrow(/consent/);
    expect(s.care.movementEnabled).toBe(false);
  });
  it('validates payloads and permanently disables unimplemented audio', () => {
    expect(() => observationSchema.parse(obs(0, { energy: NaN }))).toThrow();
    const s = initialSnapshot('p');
    expect(() =>
      snapshotSchema.parse({ ...s, care: { ...s.care, consent: { ...s.care.consent, audio: true } } }),
    ).toThrow();
    expect(audioPipeline.captureEnabled).toBe(false);
  });
  it('does not create anomaly events with insufficient baseline', () => {
    const r = setup();
    r.beginBaseline();
    r.ingest(obs(0));
    for (let i = 1; i < 5; i++) r.ingest(obs(i, { energy: 8, reviewedContext: false }));
    expect(r.snapshot().baseline.state).not.toBe('available');
    expect(r.snapshot().events.some((e) => e.type === 'movement-deviation')).toBe(false);
  });
  it('requires adequate reviewed context, samples and contiguous coverage', () => {
    const r = setup();
    r.beginBaseline();
    for (let i = 0; i < 24; i++) r.ingest(obs(i * 10));
    expect(r.snapshot().baseline.count).toBe(24);
    expect(r.snapshot().baseline.state).not.toBe('available');
  });
  it('freezes an established baseline, requires sustained good observations, suppresses continuous duplicates', () => {
    const r = setup();
    baseline(r);
    expect(r.snapshot().baseline.state).toBe('available');
    const mean = r.snapshot().baseline.mean;
    r.ingest(obs(25, { energy: 4 }));
    expect(r.snapshot().events.filter((e) => e.type === 'movement-deviation')).toHaveLength(0);
    for (let i = 26; i < 150; i++) r.ingest(obs(i, { energy: 4 }));
    expect(r.snapshot().events.filter((e) => e.type === 'movement-deviation')).toHaveLength(1);
    expect(r.snapshot().baseline.mean).toBe(mean);
    expect(r.snapshot().events.at(-1)?.priority).toBe('review');
  });
  it('does not turn a burst of frames into temporal evidence', () => {
    const r = setup();
    baseline(r);
    for (let i = 0; i < 5; i++) r.ingest(obs(25 + i * 0.01, { energy: 5 }));
    expect(r.snapshot().events.filter((e) => e.type === 'movement-deviation')).toHaveLength(0);
  });
  it('does not treat occlusion, camera gaps or disconnection as inactivity', () => {
    const r = setup();
    baseline(r);
    r.ingest(obs(25, { energy: 4 }));
    r.ingest(obs(26, { quality: 'occluded', energy: null }));
    r.ingest(obs(27, { energy: 4 }));
    r.ingest(obs(40, { energy: 4 }));
    expect(r.snapshot().events.some((e) => e.type === 'movement-deviation')).toBe(false);
    r.disconnect(obs(41).at);
    r.disconnect(obs(42).at);
    for (let i = 43; i < 60; i++) r.ingest(obs(i, { energy: 0 }));
    expect(r.snapshot().events.filter((e) => e.type === 'camera-disconnected')).toHaveLength(1);
    expect(r.snapshot().health.observationQuality).toBe('disconnected');
    expect(r.snapshot().baseline.count).toBe(20);
  });
  it('invalidates baseline when observation room/time/source context changes', () => {
    const r = setup();
    baseline(r);
    r.ingest(obs(25, { localHour: 16 }));
    expect(r.snapshot().baseline.state).toBe('requires-review');
    const s = r.snapshot();
    s.baseline.state = 'available';
    s.health.camera.simulated = false;
    s.health.camera.integration = 'browser-webcam';
    s.health.gateway.mode = 'browser-camera';
    const actual = new MonitoringRuntime(s, () => 'x');
    actual.ingest(obs(26, { sourceMode: 'browser-camera' }));
    expect(actual.snapshot().baseline.state).toBe('requires-review');
  });
  it('retains acknowledgement, dismissal, notes and immutable review history across snapshot restore', () => {
    const r = setup();
    baseline(r);
    for (let i = 25; i < 28; i++) r.ingest(obs(i, { energy: 4 }));
    const e = r.snapshot().events.find((e) => e.type === 'movement-deviation')!;
    r.review(e.id, 'acknowledge', 'Checked room', obs(28).at);
    r.review(e.id, 'note', 'Context reviewed', obs(29).at);
    r.review(e.id, 'dismiss', 'Ordinary exercise', obs(30).at);
    const restored = new MonitoringRuntime(r.snapshot(), () => 'new');
    const result = restored.snapshot().events.find((x) => x.id === e.id)!;
    expect(result.status).toBe('dismissed');
    expect(result.history).toHaveLength(3);
    expect(result.acknowledgedAt).toBe(obs(28).at);
  });
  it('preserves source identity, rejects mismatched assignments and mixed demo/actual samples', () => {
    const r = setup();
    expect(() => r.ingest(obs(0, { individualId: 'wrong' }))).toThrow();
    expect(() => r.ingest(obs(0, { sourceMode: 'browser-camera' }))).toThrow();
  });
  it('respects explicit evaluation schedules', () => {
    const r = setup();
    baseline(r);
    const care = r.snapshot().care;
    care.schedules = [{ startHour: 12, endHour: 16 }];
    r.configure(care);
    for (let i = 25; i < 50; i++) r.ingest(obs(i, { energy: 4 }));
    expect(r.snapshot().events.some((e) => e.type === 'movement-deviation')).toBe(false);
  });
  it('only simulated adapters accept simulated observations; real IP input stays unavailable', async () => {
    const a = new SimulatedCameraAdapter();
    let n = 0;
    a.subscribe(() => n++);
    await a.start();
    a.push(obs(0));
    await a.stop();
    expect(n).toBe(1);
    expect(() => a.push(obs(1))).toThrow();
    await expect(new UnavailableIpCameraAdapter().start()).rejects.toThrow(/not implemented/);
  });
});

describe('monitoring recovery boundaries', () => {
  it('does not re-alert an existing continuous episode after restoring history', () => {
    const r = setup();
    baseline(r);
    for (let i = 25; i < 30; i++) r.ingest(obs(i, { energy: 4 }));
    const restored = new MonitoringRuntime(r.snapshot(), () => 'after-restart');
    restored.start(obs(100).at);
    for (let i = 100; i < 110; i++) restored.ingest(obs(i, { energy: 4 }));
    expect(restored.snapshot().events.filter((e) => e.type === 'movement-deviation')).toHaveLength(1);
  });
  it('cannot evaluate deviations after baseline context review is withdrawn', () => {
    const r = setup();
    baseline(r);
    const care = r.snapshot().care;
    care.baselineContextReviewed = false;
    r.configure(care);
    for (let i = 25; i < 35; i++) r.ingest(obs(i, { energy: 4 }));
    expect(r.snapshot().events.some((e) => e.type === 'movement-deviation')).toBe(false);
  });
  it('withdrawal of consent stops processing without erasing history', () => {
    const r = setup();
    baseline(r);
    const care = r.snapshot().care;
    care.consent.video = false;
    r.configure(care);
    const count = r.snapshot().events.length;
    r.ingest(obs(30, { energy: 4 }));
    expect(r.snapshot().health.gateway.state).toBe('stopped');
    expect(r.snapshot().events).toHaveLength(count);
  });
  it('changing environment invalidates the reference and requires a fresh explicit start', () => {
    const r = setup();
    baseline(r);
    const care = r.snapshot().care;
    care.environment.name = 'Another room';
    r.configure(care);
    expect(r.snapshot().baseline.state).toBe('requires-review');
    expect(r.snapshot().health.camera.state).toBe('disabled');
  });
});
