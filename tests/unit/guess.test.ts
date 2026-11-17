import { describe, expect, it } from 'vitest';
import { CLIP_N, COOLDOWN_MS, D, RANGE_HAND_R } from '../../src/engine/constants';
import { buildModel } from '../../src/engine/classifier';
import { describeWindow, frameShape, guessKey } from '../../src/engine/guess';
import { FrameProcessor, clipFeatures } from '../../src/engine/processor';
import { Recognizer, type Evaluation } from '../../src/engine/recognizer';
import { createRng, DEFAULT_PLACEMENT, renderFrame, simulateClip, type GestureName } from '../../src/engine/simulator';
import { localHand, placeHand, type HandShape } from '../../src/engine/simulator/hands';
import { clipVector } from './benchmark.helpers';

/** 42 hand features for a hand shape, as features.ts writes them (wrist-relative, hand units). */
function handVec(shape: HandShape, angle: number): Float32Array {
  const pts = placeHand(shape, [0, 0], 1, angle, 'right');
  const v = new Float32Array(D);
  pts.forEach(([x, y], i) => {
    v[RANGE_HAND_R[0] + 2 * i] = x;
    v[RANGE_HAND_R[0] + 2 * i + 1] = y;
  });
  return v;
}

describe('guess — hand shape per frame', () => {
  it('recognises the four simulator hand shapes across tilts', () => {
    expect(localHand('open')).toHaveLength(21);
    for (const angle of [-0.5, 0, 0.35, 0.6]) {
      expect(frameShape(handVec('open', angle), RANGE_HAND_R[0])).toBe('open');
      expect(frameShape(handVec('fist', angle), RANGE_HAND_R[0])).toBe('fist');
      expect(frameShape(handVec('point', angle), RANGE_HAND_R[0])).toBe('point');
      expect(frameShape(handVec('thumbsUp', angle), RANGE_HAND_R[0])).toBe('thumbsUp');
    }
  });
});

describe('guess — describing a window (synthetic, noise 0.006)', () => {
  const expected: [GestureName, string | null][] = [
    ['idle', null],
    ['rock', null],
    ['wave', 'right:open:high'],
    ['coverEars', 'both:open:high'],
    ['armsUp', 'both:open:high'],
    ['flap', 'both:open:mid'],
    ['squeeze', 'right:changing:low'],
  ];
  for (const [g, want] of expected) {
    it(`${g} → ${want ?? 'nothing'}`, () => {
      let hits = 0;
      for (let s = 1; s <= 20; s++) {
        const r = describeWindow(clipFeatures(simulateClip(g, { seed: 300 + s, noise: 0.006, durationMs: 2000, dropout: 0.02 })));
        if ((r ? guessKey(r) : null) === want) hits++;
      }
      expect(hits).toBeGreaterThanOrEqual(17); // ≥ 85% (synthetic)
    });
  }
  it('pointRight → right hand pointing; handToMouth → right fist', () => {
    let point = 0;
    let fist = 0;
    for (let s = 1; s <= 20; s++) {
      const p = describeWindow(clipFeatures(simulateClip('pointRight', { seed: 400 + s, noise: 0.006, durationMs: 2000, dropout: 0.02 })));
      if (p?.hand === 'right' && p.shape === 'point') point++;
      const m = describeWindow(clipFeatures(simulateClip('handToMouth', { seed: 400 + s, noise: 0.006, durationMs: 2000, dropout: 0.02 })));
      if (m?.hand === 'right' && m.shape === 'fist') fist++;
    }
    expect(point).toBeGreaterThanOrEqual(17);
    expect(fist).toBeGreaterThanOrEqual(17);
  });
});

describe('recognizer sightings', () => {
  const models = [buildModel({ id: 'wave', urgency: 'normal', category: 'need' }, [1, 2, 3, 4, 5].map((s) => clipVector('wave', 500 + s).v), CLIP_N, D)];
  function perform(g: GestureName, secs: number): Evaluation[] {
    const rec = new Recognizer({ windowMs: 2000, sensitivity: 1 });
    rec.setModels(models);
    const proc = new FrameProcessor();
    const rng = createRng(3);
    const out: Evaluation[] = [];
    for (let t = 0; t < secs * 1000; t += 1000 / 15) {
      const local = t / 1000;
      const raw = renderFrame(g, { u: (local % 2) / 2, tSec: local, amp: 1, rate: 1 }, DEFAULT_PLACEMENT, Math.round(t), rng, { noise: 0.006, dropout: 0.02 });
      const ev = rec.push(proc.process(raw).features);
      if (ev) out.push(ev);
    }
    return out;
  }

  it('an untaught gesture is described (with its window), never emitted', () => {
    const evs = perform('coverEars', 6);
    expect(evs.some((e) => e.emitted)).toBe(false);
    const s = evs.find((e) => e.sighting)?.sighting;
    expect(s && guessKey(s)).toBe('both:open:high');
    expect(s?.window).toHaveLength(CLIP_N * D);
  });

  it('a taught gesture is emitted, and its tail is never called "not taught yet"', () => {
    const evs = perform('wave', 8);
    const first = evs.find((e) => e.emitted?.signalId === 'wave');
    expect(first).toBeDefined();
    let lastEmit = -Infinity;
    for (const e of evs) {
      if (e.emitted) lastEmit = e.t;
      if (e.t - lastEmit < COOLDOWN_MS) expect(e.sighting).toBeNull();
    }
    expect(evs.filter((e) => e.t < first!.t).some((e) => e.sighting)).toBe(false);
  });

  it('stillness produces no sighting', () => {
    expect(perform('idle', 6).some((e) => e.sighting)).toBe(false);
  });
});
