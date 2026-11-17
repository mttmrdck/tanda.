import { describe, expect, it } from 'vitest';
import { buildModel, classify } from '../../src/engine/classifier';
import { CLIP_N, D, HAND_IDLE_SPREAD, IDLE_ENERGY } from '../../src/engine/constants';
import { bodyMotionEnergy, featureMotionEnergy, handShapeSpread } from '../../src/engine/motion';
import { clipFeatures } from '../../src/engine/processor';
import { simulateClip, type GestureName } from '../../src/engine/simulator';
import { clipVector } from './benchmark.helpers';

const feats = (g: GestureName, seed: number) => clipFeatures(simulateClip(g, { seed, noise: 0.006, durationMs: 2000, dropout: 0.02 }));
const seeds = Array.from({ length: 20 }, (_, i) => 900 + i);

describe('motion energy — minimal (fingers-only) movement', () => {
  it('a hand opening and closing moves no body point, but counts as movement', () => {
    for (const s of seeds) {
      const f = feats('squeeze', s);
      expect(featureMotionEnergy(f)).toBeGreaterThanOrEqual(IDLE_ENERGY);
      expect(handShapeSpread(f)).toBeGreaterThan(handShapeSpread(feats('idle', s)));
    }
    // the body term alone would have called most of these takes "still"
    const bodyStill = seeds.filter((s) => bodyMotionEnergy(feats('squeeze', s)) < IDLE_ENERGY).length;
    expect(bodyStill).toBeGreaterThan(seeds.length / 4);
  });

  it('resting hands stay below the finger threshold', () => {
    for (const s of seeds) expect(handShapeSpread(feats('idle', s))).toBeLessThan(HAND_IDLE_SPREAD);
  });

  it('a taught finger-only signal is recognised (synthetic benchmark)', () => {
    const model = (id: string, g: GestureName, base: number) =>
      buildModel({ id, urgency: 'normal', category: 'need' }, [1, 2, 3, 4, 5].map((s) => clipVector(g, base + s).v), CLIP_N, D);
    const models = [model('squeeze', 'squeeze', 100), model('wave', 'wave', 200), model('tap', 'tapTable', 300)];
    let hits = 0;
    for (const s of seeds) {
      const q = clipVector('squeeze', s);
      if (classify(q.v, models, { n: CLIP_N, d: D, sensitivity: 1 }, q.energy).signalId === 'squeeze') hits++;
    }
    expect(hits / seeds.length).toBeGreaterThanOrEqual(0.85);
  });
});
