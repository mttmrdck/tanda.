import { describe, expect, it } from 'vitest';
import { CLIP_N, D, TAU_DEFAULT, TAU_MAX, TAU_MIN } from '../../src/engine/constants';
import { buildModel, classify, type ClassModel } from '../../src/engine/classifier';
import { classScore, computeTau, evictionIndex, scoreFromDistances } from '../../src/engine/calibration';
import { dtw } from '../../src/engine/dtw';
import { clipVector } from './benchmark.helpers';

const ex = (g: Parameters<typeof clipVector>[0], base: number, k: number) => Array.from({ length: k }, (_, i) => clipVector(g, base + i).v);
const opts = { n: CLIP_N, d: D, sensitivity: 1 };

describe('calibration', () => {
  it('class score is the mean of the two smallest distances', () => {
    expect(scoreFromDistances([3, 1, 2])).toBe(1.5);
    expect(scoreFromDistances([4])).toBe(4);
    expect(scoreFromDistances([])).toBe(Infinity);
  });

  it('uses TAU_DEFAULT with fewer than 3 examples', () => {
    expect(computeTau(ex('wave', 1, 2), CLIP_N, D)).toBe(TAU_DEFAULT);
  });

  it('computes LOO τ = mean + 2·std, clamped', () => {
    const e = ex('wave', 1, 5);
    const loo = e.map((q, i) => classScore(q, e.filter((_, j) => j !== i), CLIP_N, D));
    const m = loo.reduce((a, b) => a + b, 0) / loo.length;
    const sd = Math.sqrt(loo.reduce((a, b) => a + (b - m) ** 2, 0) / loo.length);
    expect(computeTau(e, CLIP_N, D)).toBeCloseTo(Math.min(Math.max(m + 2 * sd, TAU_MIN), TAU_MAX), 9);
  });

  it('eviction picks the most redundant example only when over the cap', () => {
    const e = ex('wave', 1, 4);
    expect(evictionIndex(e, CLIP_N, D, 4)).toBe(-1);
    const withDup = [...e, e[2]!.slice()];
    const idx = evictionIndex(withDup, CLIP_N, D, 4);
    expect([2, 4]).toContain(idx);
  });
});

describe('classify', () => {
  const models: ClassModel[] = [
    buildModel({ id: 'wave', urgency: 'normal', category: 'need' }, ex('wave', 100, 5), CLIP_N, D),
    buildModel({ id: 'mouth', urgency: 'normal', category: 'need' }, ex('handToMouth', 200, 5), CLIP_N, D),
  ];

  it('chooses the correct class', () => {
    const q = clipVector('wave', 999);
    const r = classify(q.v, models, opts, q.energy);
    expect(r.signalId).toBe('wave');
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.margin).toBeGreaterThan(0);
  });

  it('returns unknown for an unseen gesture', () => {
    const q = clipVector('armsUp', 999);
    expect(classify(q.v, models, opts, q.energy)).toMatchObject({ signalId: null, reason: 'unknown' });
  });

  it('returns low-motion when the window is still', () => {
    const q = clipVector('wave', 5);
    expect(classify(q.v, models, opts, 0.01).reason).toBe('low-motion');
  });

  it('returns insufficient-data with no examples', () => {
    expect(classify(clipVector('wave', 1).v, [], opts, 1).reason).toBe('insufficient-data');
  });

  it('sensitivity scales the acceptance threshold', () => {
    const q = clipVector('wave', 4242);
    const tight = classify(q.v, models, { ...opts, sensitivity: 0.01 }, q.energy);
    const loose = classify(q.v, models, { ...opts, sensitivity: 1.4 }, q.energy);
    expect(tight.signalId).toBeNull();
    expect(loose.signalId).toBe('wave');
  });

  it('low-margin rule applies only when urgency or category differ', () => {
    const e = ex('wave', 300, 4);
    const twin = e.map((x) => x.slice());
    twin[0]![0] = twin[0]![0]! + 0.0001;
    const q = clipVector('wave', 777);
    const sameKind = [
      buildModel({ id: 'a', urgency: 'normal', category: 'need' }, e, CLIP_N, D),
      buildModel({ id: 'b', urgency: 'normal', category: 'need' }, twin, CLIP_N, D),
    ];
    expect(classify(q.v, sameKind, { ...opts, sensitivity: 1.4 }, q.energy).reason).toBeUndefined();
    const differentUrgency = [sameKind[0]!, { ...sameKind[1]!, urgency: 'high' as const }];
    expect(classify(q.v, differentUrgency, { ...opts, sensitivity: 1.4 }, q.energy).reason).toBe('low-margin');
  });

  it('distance is the DTW-based class score', () => {
    const q = clipVector('wave', 31337);
    const r = classify(q.v, models, opts, q.energy);
    const ds = models[0]!.examples.map((e) => dtw(q.v, e, CLIP_N, D));
    expect(r.distance).toBeCloseTo(scoreFromDistances(ds), 9);
  });
});
