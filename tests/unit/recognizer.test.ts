import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { buildModel } from '../../src/engine/classifier';
import { FrameProcessor } from '../../src/engine/processor';
import { Recognizer, type Evaluation } from '../../src/engine/recognizer';
import { createRng, DEFAULT_PLACEMENT, renderFrame, type GestureName } from '../../src/engine/simulator';
import { clipVector } from './benchmark.helpers';

const models = [
  buildModel({ id: 'wave', urgency: 'normal', category: 'need' }, [1, 2, 3, 4, 5].map((s) => clipVector('wave', 500 + s).v), CLIP_N, D),
  buildModel({ id: 'tap', urgency: 'normal', category: 'need' }, [1, 2, 3, 4, 5].map((s) => clipVector('tapTable', 600 + s).v), CLIP_N, D),
];

/** Perform a script; each gesture repeats its 2 s performance for its duration. */
function perform(script: [GestureName, number][], seed = 1): Evaluation[] {
  const rec = new Recognizer({ windowMs: 2000, sensitivity: 1 });
  rec.setModels(models);
  const proc = new FrameProcessor();
  const rng = createRng(seed);
  const out: Evaluation[] = [];
  let t = 0;
  for (const [g, secs] of script) {
    const start = t;
    for (; t < start + secs * 1000; t += 1000 / 15) {
      const local = (t - start) / 1000;
      const raw = renderFrame(g, { u: (local % 2) / 2, tSec: local, amp: 1, rate: 1 }, DEFAULT_PLACEMENT, Math.round(t), rng, { noise: 0.006, dropout: 0.02 });
      const ev = rec.push(proc.process(raw).features);
      if (ev) out.push(ev);
    }
  }
  return out;
}

const emissions = (evs: Evaluation[]) => evs.filter((e) => e.emitted).map((e) => ({ t: e.t, id: e.emitted!.signalId }));

describe('recognizer', () => {
  it('evaluates every 400 ms and is deterministic for the same input', () => {
    const a = perform([['idle', 3], ['wave', 3]], 9);
    const b = perform([['idle', 3], ['wave', 3]], 9);
    expect(a.map((e) => e.result)).toEqual(b.map((e) => e.result));
    for (let i = 1; i < a.length; i++) expect(a[i]!.t - a[i - 1]!.t).toBeGreaterThanOrEqual(400);
  });

  it('a still child produces no emission (low-motion gate)', () => {
    const evs = perform([['idle', 8]]);
    expect(emissions(evs)).toEqual([]);
    expect(evs.filter((e) => e.t > 2500).every((e) => e.result.reason === 'low-motion')).toBe(true);
  });

  it('emits only after two consecutive agreeing evaluations', () => {
    const evs = perform([['idle', 3], ['wave', 4]]);
    const em = evs.findIndex((e) => e.emitted);
    expect(em).toBeGreaterThan(0);
    expect(evs[em - 1]!.result.signalId).toBe('wave');
    expect(evs[em]!.emitted!.window.length).toBe(CLIP_N * D);
  });

  it('a sustained gesture emits once (cooldown + needs stillness or another signal to re-arm)', () => {
    const evs = perform([['idle', 3], ['wave', 10]]);
    expect(emissions(evs).filter((e) => e.id === 'wave')).toHaveLength(1);
  });

  it('re-arms after the child is still and the cooldown has passed', () => {
    const evs = perform([['idle', 3], ['wave', 3], ['idle', 4], ['wave', 3]]);
    expect(emissions(evs).filter((e) => e.id === 'wave').length).toBe(2);
  });

  it('a different signal can be emitted during another signal’s cooldown', () => {
    const evs = perform([['idle', 3], ['wave', 2.4], ['tapTable', 4]]);
    const ids = emissions(evs).map((e) => e.id);
    expect(ids).toContain('wave');
    expect(ids).toContain('tap');
  });
});
