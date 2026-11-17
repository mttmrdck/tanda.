/**
 * Accuracy gates on the synthetic performer (Section 9.2).
 * SYNTHETIC BENCHMARK — not a clinical or real-child result.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { buildModel, classify, type ClassModel } from '../../src/engine/classifier';
import { TEACHABLE_GESTURES, type GestureName } from '../../src/engine/simulator';
import { clipVector } from './benchmark.helpers';

const UNTAUGHT: GestureName[] = ['flap', 'rock', 'idle'];
const TEST_PER_GESTURE = 20;

function teach(examplesPerSignal: number): ClassModel[] {
  return TEACHABLE_GESTURES.map((g, gi) =>
    buildModel(
      { id: g, urgency: 'normal', category: 'need' },
      Array.from({ length: examplesPerSignal }, (_, s) => clipVector(g, 10_000 + gi * 100 + s).v),
      CLIP_N,
      D,
    ),
  );
}

function evaluate(models: ClassModel[]) {
  const labels = [...TEACHABLE_GESTURES, 'rejected'];
  const confusion: Record<string, Record<string, number>> = {};
  let correct = 0;
  let total = 0;
  for (const [gi, g] of TEACHABLE_GESTURES.entries()) {
    confusion[g] = Object.fromEntries(labels.map((l) => [l, 0]));
    for (let s = 0; s < TEST_PER_GESTURE; s++) {
      const q = clipVector(g, 90_000 + gi * 1000 + s);
      const r = classify(q.v, models, { n: CLIP_N, d: D, sensitivity: 1 }, q.energy);
      const k = r.signalId ?? 'rejected';
      confusion[g]![k]!++;
      if (k === g) correct++;
      total++;
    }
  }
  let rejected = 0;
  let unTotal = 0;
  const rejection: Record<string, { rejected: number; total: number }> = {};
  for (const [gi, g] of UNTAUGHT.entries()) {
    rejection[g] = { rejected: 0, total: 0 };
    for (let s = 0; s < TEST_PER_GESTURE; s++) {
      const q = clipVector(g, 70_000 + gi * 1000 + s);
      const r = classify(q.v, models, { n: CLIP_N, d: D, sensitivity: 1 }, q.energy);
      if (!r.signalId) {
        rejected++;
        rejection[g]!.rejected++;
      }
      rejection[g]!.total++;
      unTotal++;
    }
  }
  return { accuracy: correct / total, rejectionRate: rejected / unTotal, confusion, rejection };
}

function printConfusion(title: string, c: Record<string, Record<string, number>>) {
  const cols = [...TEACHABLE_GESTURES, 'rejected'];
  const lines = [title, ['true \\ pred'.padEnd(12), ...cols.map((x) => x.slice(0, 8).padStart(9))].join('')];
  for (const [g, row] of Object.entries(c)) lines.push([g.padEnd(12), ...cols.map((x) => String(row[x] ?? 0).padStart(9))].join(''));
  console.log(lines.join('\n'));
}

describe('synthetic benchmark (not a clinical or real-child result)', () => {
  const report: Record<string, unknown> = {
    label: 'synthetic benchmark — not a clinical or real-child result',
    setup: {
      gestures: TEACHABLE_GESTURES,
      untaught: UNTAUGHT,
      testClipsPerGesture: TEST_PER_GESTURE,
      noise: '0.006–0.012',
      speed: '±20%',
      amplitude: '±15%',
      dropout: 0.02,
      clipMs: 2000,
    },
  };

  it('5 examples per signal: closed-set accuracy ≥ 92% and rejection of untaught movements ≥ 80%', () => {
    const r = evaluate(teach(5));
    printConfusion(`5 examples — accuracy ${(r.accuracy * 100).toFixed(1)}%, rejection ${(r.rejectionRate * 100).toFixed(1)}%`, r.confusion);
    console.log('rejection by gesture', JSON.stringify(r.rejection));
    report.fiveExamples = r;
    expect(r.accuracy).toBeGreaterThanOrEqual(0.92);
    expect(r.rejectionRate).toBeGreaterThanOrEqual(0.8);
  });

  it('3 examples per signal: closed-set accuracy ≥ 85%', () => {
    const r = evaluate(teach(3));
    printConfusion(`3 examples — accuracy ${(r.accuracy * 100).toFixed(1)}%`, r.confusion);
    report.threeExamples = { accuracy: r.accuracy, rejectionRate: r.rejectionRate, confusion: r.confusion };
    expect(r.accuracy).toBeGreaterThanOrEqual(0.85);
  });

  it('classifies a window against 6 signals × 10 examples in < 15 ms on average', () => {
    const models = teach(10);
    const queries = TEACHABLE_GESTURES.map((g, i) => clipVector(g, 123_000 + i));
    for (const q of queries) classify(q.v, models, { n: CLIP_N, d: D, sensitivity: 1 }, q.energy); // warm-up
    const reps = 30;
    const t0 = performance.now();
    for (let r = 0; r < reps; r++) for (const q of queries) classify(q.v, models, { n: CLIP_N, d: D, sensitivity: 1 }, q.energy);
    const avg = (performance.now() - t0) / (reps * queries.length);
    console.log(`classify latency: ${avg.toFixed(3)} ms / window (6 signals × 10 examples)`);
    report.latencyMsPerWindow = Number(avg.toFixed(3));
    expect(avg).toBeLessThan(15);
    // regenerate the committed report only on request (WRITE_BENCHMARK=1 npm test), so a normal run never edits docs/
    if (process.env.WRITE_BENCHMARK) writeFileSync('docs/benchmark-synthetic.json', JSON.stringify({ ...report, generatedBy: 'tests/unit/accuracy.test.ts' }, null, 2) + '\n');
  });
});
