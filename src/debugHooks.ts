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
    liveTracks: () => session.liveTracks(),
  };
  (window as unknown as { __isyaratDebug: typeof api }).__isyaratDebug = api;
}
