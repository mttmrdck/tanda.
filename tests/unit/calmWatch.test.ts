import { describe, expect, it } from 'vitest';
import { CalmWatch, periodicity } from '../../src/engine/calmWatch';
import { FrameProcessor } from '../../src/engine/processor';
import { createRng, renderFrame, DEFAULT_PLACEMENT, type GestureName } from '../../src/engine/simulator';
import type { CalmState, CalmUpdate } from '../../src/engine/calmWatch';

/** Drive CalmWatch with a scripted sequence of [gesture, seconds] at 15 fps through the real smoother. */
function run(script: [GestureName, number][], seed = 1, amp = 1) {
  const cw = new CalmWatch();
  const proc = new FrameProcessor();
  const rng = createRng(seed);
  const updates: CalmUpdate[] = [];
  let t = 0;
  for (const [g, secs] of script) {
    const start = t;
    for (; t < start + secs * 1000; t += 1000 / 15) {
      const local = (t - start) / 1000;
      const raw = renderFrame(g, { u: local / 2, tSec: t / 1000, amp, rate: 1 }, DEFAULT_PLACEMENT, Math.round(t), rng, { noise: 0.006, dropout: 0.02 });
      const s = proc.smooth(raw);
      const u = cw.push(Math.round(t), s.pose, s.aspect);
      if (u) updates.push(u);
    }
  }
  return updates;
}

const firstTime = (ups: CalmUpdate[], pred: (s: CalmState) => boolean) => ups.find((u) => pred(u.state))?.state.t ?? Infinity;

describe('periodicity', () => {
  it('finds a 1 Hz sine', () => {
    const x = Array.from({ length: 120 }, (_, i) => Math.sin((2 * Math.PI * i) / 15));
    const r = periodicity(x);
    expect(r.p).toBeGreaterThan(0.8);
    expect(1 / r.lagS).toBeCloseTo(1, 1);
  });
  it('returns 0 for a constant', () => {
    expect(periodicity(Array(120).fill(0.5)).p).toBe(0);
  });
});

describe('CalmWatch (synthetic)', () => {
  it('a still child stays calm', () => {
    const ups = run([['idle', 60]]);
    expect(ups.every((u) => u.state.tier === 'calm')).toBe(true);
    expect(ups.some((u) => u.tierChanged)).toBe(false);
  });

  it('1 Hz rocking: periodicity > 0.6 at ≈1 Hz and reaches rising within 15 s', () => {
    const ups = run([['rock', 20]], 3);
    const late = ups.filter((u) => u.state.t >= 8000);
    const best = late.reduce((a, b) => (b.state.periodicity > a.state.periodicity ? b : a));
    expect(best.state.periodicity).toBeGreaterThan(0.6);
    expect(Math.abs(best.state.frequencyHz - 1)).toBeLessThanOrEqual(0.15);
    expect(firstTime(ups, (s) => s.tier !== 'calm')).toBeLessThanOrEqual(15000);
    expect(late.some((u) => u.state.reasons.includes('repetitive-rhythm'))).toBe(true);
  });

  it('random fast flailing reaches high within 10 s', () => {
    const ups = run([['flail', 12]], 5, 1.2);
    expect(firstTime(ups, (s) => s.tier === 'high')).toBeLessThanOrEqual(10000);
  });

  it('a one-off gesture does not change the tier', () => {
    const ups = run([['idle', 20], ['handToMouth', 2], ['idle', 20]], 7);
    expect(ups.some((u) => u.tierChanged)).toBe(false);
  });

  it('hysteresis: after rising, it takes ≥ 8 s of calm to return', () => {
    const ups = run([['rock', 20], ['idle', 30]], 3);
    const rockEnd = 20000;
    const back = ups.find((u) => u.state.t > rockEnd && u.tierChanged === 'calm');
    expect(back).toBeDefined();
    expect(back!.state.t - rockEnd).toBeGreaterThanOrEqual(8000);
  });

  it('baseline adapts only while calm', () => {
    const cw = new CalmWatch();
    const proc = new FrameProcessor();
    const rng = createRng(11);
    let t = 0;
    const feed = (g: GestureName, secs: number) => {
      const start = t;
      for (; t < start + secs * 1000; t += 1000 / 15) {
        const raw = renderFrame(g, { u: 0.5, tSec: t / 1000, amp: 1.2, rate: 1 }, DEFAULT_PLACEMENT, Math.round(t), rng, { noise: 0.006, dropout: 0 });
        const s = proc.smooth(raw);
        cw.push(Math.round(t), s.pose, s.aspect);
      }
    };
    feed('idle', 20);
    const afterCalm = cw.baselineSamples().length;
    expect(afterCalm).toBeGreaterThan(10);
    feed('flail', 15);
    expect(cw.state!.tier).not.toBe('calm');
    const maxCalm = Math.max(...cw.baselineSamples());
    expect(maxCalm).toBeLessThan(1);
    // nothing added while not calm (allow the bins before escalation)
    expect(cw.baselineSamples().length - afterCalm).toBeLessThanOrEqual(3);
  });
});
