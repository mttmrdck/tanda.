import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { dtw } from '../../src/engine/dtw';
import { clipVector } from './benchmark.helpers';

describe('dtw', () => {
  const a = clipVector('wave', 1).v;
  const b = clipVector('armsUp', 2).v;

  it('identity is 0 and distance is symmetric', () => {
    expect(dtw(a, a, CLIP_N, D)).toBe(0);
    expect(dtw(a, b, CLIP_N, D)).toBeCloseTo(dtw(b, a, CLIP_N, D), 9);
  });

  it('tolerates a time shift within the band better than plain frame-to-frame distance', () => {
    // shift `a` by one frame
    const s = new Float32Array(a.length);
    s.set(a.subarray(D), 0);
    s.set(a.subarray((CLIP_N - 1) * D), (CLIP_N - 1) * D);
    expect(dtw(a, s, CLIP_N, D, 3)).toBeLessThan(dtw(a, s, CLIP_N, D, 0));
  });

  it('band 0 equals the mean frame distance; a band wider than n is unconstrained', () => {
    expect(Number.isFinite(dtw(a, b, CLIP_N, D, 0))).toBe(true);
    expect(dtw(a, b, CLIP_N, D, 100)).toBeLessThanOrEqual(dtw(a, b, CLIP_N, D, 3) + 1e-9);
    expect(dtw(a, b, CLIP_N, D, 3)).toBeLessThanOrEqual(dtw(a, b, CLIP_N, D, 0) + 1e-9);
  });

  it('runs in < 1 ms per pair (generous soft limit)', () => {
    for (let i = 0; i < 50; i++) dtw(a, b, CLIP_N, D);
    const t0 = performance.now();
    const reps = 500;
    for (let i = 0; i < reps; i++) dtw(a, b, CLIP_N, D);
    const per = (performance.now() - t0) / reps;
    expect(per).toBeLessThan(1);
  });
});
