/**
 * Test/development hooks. Installed only when `import.meta.env.DEV` or the `e2e` build mode is active —
 * never in the production build (see main.tsx).
 */
import { CLIP_N, D } from './engine/constants';
import { buildModel } from './engine/classifier';
import { clipFeatures } from './engine/processor';
import { resampleClip } from './engine/resample';
import { simulateClip, type GestureName } from './engine/simulator';
import * as repo from './store/repo';
import { session, useSession } from './store/useSession';

function simulatedExamples(g: GestureName, k: number, base: number): Float32Array[] {
  const out: Float32Array[] = [];
  for (let s = 0; out.length < k && s < k * 3; s++) {
    const v = resampleClip(clipFeatures(simulateClip(g, { seed: base + s, durationMs: 2000 })), CLIP_N, D);
    if (v) out.push(v);
  }
  return out;
}

export function install(): void {
  const api = {
    session,
    state: () => useSession.getState(),
    repo,
    /** Teach gestures to the in-memory recogniser directly from the simulator (no UI). */
    teachSimulated(gestures: GestureName[], k = 5) {
      session.setModels(gestures.map((g, i) => buildModel({ id: g, urgency: 'normal', category: 'need' }, simulatedExamples(g, k, 1000 * (i + 1)), CLIP_N, D)));
    },
    perform: (g: GestureName) => session.performDemo(g),
    /** Seed the active profile with simulator-taught signals and a day of events (for screenshots / e2e). */
    async seed(profileId: string, withEvents = true, gestures: GestureName[] = ['tapTable', 'coverEars', 'handToMouth']) {
      const catalog: { g: GestureName; en: string; ms: string; mEn: string; mMs: string; icon: string; urgency: 'low' | 'normal' | 'high' }[] = [
        { g: 'tapTable', en: 'Water', ms: 'Air', mEn: 'I want water, please.', mMs: 'Saya mahu air.', icon: 'water', urgency: 'normal' },
        { g: 'coverEars', en: 'Too loud', ms: 'Terlalu bising', mEn: 'It is too loud. I need a break.', mMs: 'Terlalu bising. Saya perlu rehat.', icon: 'quiet', urgency: 'high' },
        { g: 'handToMouth', en: 'Hungry', ms: 'Lapar', mEn: 'I am hungry.', mMs: 'Saya lapar.', icon: 'food', urgency: 'normal' },
        { g: 'wave', en: 'Hello', ms: 'Helo', mEn: 'Hello! Look at me.', mMs: 'Helo! Tengok saya.', icon: 'hug', urgency: 'low' },
        { g: 'armsUp', en: 'Finished', ms: 'Sudah', mEn: 'I am finished.', mMs: 'Saya sudah selesai.', icon: 'finished', urgency: 'normal' },
      ];
      const defs = gestures.map((g) => catalog.find((c) => c.g === g)!).filter(Boolean);
      const ids: string[] = [];
      const k0 = (k: number) => Math.min(k, defs.length - 1);
      for (const [i, d] of defs.entries()) {
        const sig = await repo.createSignal({ profileId, name: { en: d.en, ms: d.ms }, meaning: { en: d.mEn, ms: d.mMs }, category: 'need', urgency: d.urgency, icon: d.icon });
        ids.push(sig.id);
        for (const ex of simulatedExamples(d.g, 5, 7000 + i * 100)) await repo.addExample({ signalId: sig.id, n: CLIP_N, d: D, data: ex, source: 'teach' });
      }
      if (withEvents) {
        // place the day's events in the past, ending ~10 minutes ago, keeping their relative spacing
        const now = Date.now();
        const at = (h: number, m: number) => new Date(now - 10 * 60_000 - ((15 * 60 + 2) - (h * 60 + m)) * 60_000).toISOString();
        const plan: [number, number, number, 'yes' | 'no' | undefined][] = [
          [9, 5, 0, 'yes'], [10, 12, 0, 'yes'], [10, 40, 0, 'yes'], [10, 55, 2, undefined], [11, 30, 1, 'no'], [13, 15, 2, 'yes'], [15, 2, 0, 'yes'],
        ];
        for (const [h, m, k, fb] of plan) {
          await repo.addEvent({ profileId, ts: at(h, m), kind: 'signal', signalId: ids[k0(k)]!, confidence: 0.7 + (m % 20) / 100, ...(fb ? { feedback: fb } : {}) });
        }
        await repo.addEvent({ profileId, ts: at(11, 20), kind: 'calm-tier', tier: 'rising', score: 0.48 });
        await repo.addEvent({ profileId, ts: at(11, 34), kind: 'calm-tier', tier: 'calm', score: 0.2 });
      }
      return ids;
    },
    liveTracks: () => session.liveTracks(),
  };
  (window as unknown as { __isyaratDebug: typeof api }).__isyaratDebug = api;
}
