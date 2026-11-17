import { create } from 'zustand';
import { type CareProfile, type MonitoringSnapshot, type Observation } from '../platform/contracts';
import { MonitoringRuntime } from '../platform/runtime';
import { loadMonitoring, saveMonitoring } from './monitoringRepo';
import { uid } from './repoBase';

interface MonitoringState {
  snapshot: MonitoringSnapshot | null;
  loading: boolean;
  error: boolean;
  load: (id: string) => Promise<void>;
  forget: () => void;
  configure: (care: CareProfile) => Promise<boolean>;
  action: (
    action: 'start' | 'stop' | 'baseline' | 'unusual' | 'ordinary' | 'disconnect' | 'reset' | 'collect-browser',
  ) => Promise<boolean>;
  review: (id: string, action: 'acknowledge' | 'dismiss' | 'note', note: string) => Promise<boolean>;
  ingestBrowser: (input: Observation) => Promise<boolean>;
}
let generation = 0;
let runtime: MonitoringRuntime | null = null;
let serial: Promise<unknown> = Promise.resolve();
let demoTime = 0;
export const useMonitoring = create<MonitoringState>((set) => {
  const mutate = (fn: (r: MonitoringRuntime) => void) => {
    const selected = runtime;
    const work = serial
      .catch(() => undefined)
      .then(async () => {
        if (!selected || selected !== runtime) return;
        fn(selected);
        const s = selected.snapshot();
        await saveMonitoring(s);
        if (selected === runtime)
          set((current) => ({
            snapshot: {
              ...s,
              care:
                current.snapshot && JSON.stringify(current.snapshot.care) === JSON.stringify(s.care)
                  ? current.snapshot.care
                  : s.care,
            },
            error: false,
          }));
      });
    serial = work;
    return work
      .then(() => true)
      .catch(() => {
        set({ error: true });
        return false;
      });
  };
  const sample = (r: MonitoringRuntime, energy: number) => {
    const s = r.snapshot();
    demoTime = Math.max(demoTime + 1000, Date.now());
    r.ingest({
      individualId: s.individualId,
      sourceId: s.health.camera.id,
      roomId: s.care.environment.id,
      at: new Date(demoTime).toISOString(),
      localHour: new Date(demoTime).getHours(),
      quality: 'good',
      energy,
      sourceMode: 'simulated',
      reviewedContext: s.care.baselineContextReviewed,
    });
  };
  return {
    snapshot: null,
    loading: false,
    error: false,
    forget: () => {
      generation++;
      runtime = null;
      demoTime = 0;
      set({ snapshot: null, loading: false, error: false });
    },
    load: async (id) => {
      const g = ++generation;
      runtime = null;
      set({ snapshot: null, loading: true, error: false });
      try {
        await serial.catch(() => undefined);
        const s = await loadMonitoring(id);
        // A restored snapshot is history, not proof that processing survived a browser reload.
        s.health.gateway.state = 'stopped';
        s.health.camera.state = s.care.consent.video ? 'disabled' : 'not-configured';
        if (g !== generation) return;
        runtime = new MonitoringRuntime(s, uid);
        set({ snapshot: s, loading: false });
      } catch {
        if (g === generation) set({ loading: false, error: true });
      }
    },
    configure: (care) => mutate((r) => r.configure(care)),
    action: (action) =>
      mutate((r) => {
        const now = new Date().toISOString();
        if (action === 'reset') {
          r.resetDemo();
          return;
        }
        if (action === 'collect-browser') {
          if (r.snapshot().health.gateway.mode !== 'browser-camera') throw new Error('Start browser capture first.');
          r.beginBaseline();
        }
        if (action === 'start') r.start(now);
        if (action === 'stop') r.stop();
        if (action === 'disconnect') r.disconnect(new Date(Math.max(Date.now(), demoTime + 1000)).toISOString());
        if (['baseline', 'ordinary', 'unusual'].includes(action)) {
          const s = r.snapshot();
          if (s.health.gateway.state !== 'running') throw new Error('Start the demonstration first.');
          if (action === 'baseline') {
            r.beginBaseline();
            for (let i = 0; i < 24; i++) sample(r, 0.2 + (i % 3) * 0.01);
          }
          if (action === 'unusual') for (let i = 0; i < 5; i++) sample(r, 2.5);
          if (action === 'ordinary') for (let i = 0; i < 5; i++) sample(r, 0.21);
        }
      }),
    review: (id, action, note) => mutate((r) => r.review(id, action, note, new Date().toISOString())),
    ingestBrowser: (o) =>
      mutate((r) => {
        const s = r.snapshot();
        if (!s.care.consent.video || !s.care.consent.authorityConfirmed) return;
        if (s.health.gateway.state !== 'running' || s.health.gateway.mode !== 'browser-camera')
          r.start(o.at, 'browser-camera');
        if (s.baseline.state === 'not-configured' && s.care.movementEnabled) r.beginBaseline();
        r.ingest(o);
      }),
  };
});
