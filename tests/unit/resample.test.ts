import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { dtw } from '../../src/engine/dtw';
import { invalidFraction, resampleClip } from '../../src/engine/resample';
import type { FeatureFrame } from '../../src/engine/types';
import { clipVector } from './benchmark.helpers';

const frame = (t: number, val: number, valid = true): FeatureFrame => ({ t, v: new Float32Array(D).fill(val), valid });

describe('resampleClip', () => {
  it('preserves a constant signal', () => {
    const frames = Array.from({ length: 30 }, (_, i) => frame(i * 66, 0.7));
    const r = resampleClip(frames)!;
    expect(r.length).toBe(CLIP_N * D);
    expect(Array.from(r).every((x) => Math.abs(x - 0.7) < 1e-6)).toBe(true);
  });

  it('interpolates across short invalid gaps', () => {
    const frames = Array.from({ length: 30 }, (_, i) => frame(i * 66, i < 15 ? 0 : 1, !(i >= 12 && i <= 14)));
    const r = resampleClip(frames);
    expect(r).not.toBeNull();
  });

  it('returns null when more than 30% of the duration is invalid', () => {
    const frames = Array.from({ length: 30 }, (_, i) => frame(i * 66, 0.5, i % 3 !== 0));
    expect(invalidFraction(frames)).toBeCloseTo(1 / 3, 1);
    expect(resampleClip(frames)).toBeNull();
  });

  it('is timing-independent: the same gesture at 0.8× and 1.2× speed is closer than a different gesture', async () => {
    const { clipFeatures } = await import('../../src/engine/processor');
    const { simulateClip } = await import('../../src/engine/simulator');
    const slow = resampleClip(clipFeatures(simulateClip('handToMouth', { seed: 3, speed: 0.85, noise: 0.004, durationMs: 2600 })))!;
    const fast = resampleClip(clipFeatures(simulateClip('handToMouth', { seed: 3, speed: 1.2, noise: 0.004, durationMs: 1700 })))!;
    const other = clipVector('coverEars', 3, 0.004).v;
    const same = dtw(slow, fast, CLIP_N, D);
    const diff = dtw(slow, other, CLIP_N, D);
    expect(same).toBeLessThan(diff * 0.6);
  });
});
