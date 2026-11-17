import { CLIP_N, D } from '../../src/engine/constants';
import { clipFeatures } from '../../src/engine/processor';
import { resampleClip } from '../../src/engine/resample';
import { createRng, simulateClip, type GestureName } from '../../src/engine/simulator';
import { featureMotionEnergy } from '../../src/engine/motion';

export interface ClipVec {
  v: Float32Array;
  energy: number;
}

/** One synthetic 2 s clip → resampled vector + motion energy. Noise drawn from [0.006, 0.012] by seed. */
export function clipVector(g: GestureName, seed: number, noise?: number): ClipVec {
  const nz = noise ?? 0.006 + createRng(seed * 7919 + 13).next() * 0.006;
  const feats = clipFeatures(simulateClip(g, { seed, noise: nz, durationMs: 2000, dropout: 0.02 }));
  const v = resampleClip(feats, CLIP_N, D);
  if (!v) throw new Error(`clip ${g}/${seed} invalid`);
  return { v, energy: featureMotionEnergy(feats) };
}
