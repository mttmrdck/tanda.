import { describe, expect, it } from 'vitest';
import { D, RANGE_PRESENCE } from '../../src/engine/constants';
import { extractFeatures } from '../../src/engine/features';
import { assignHands } from '../../src/engine/handMatching';
import { createRng, renderFrame, DEFAULT_PLACEMENT } from '../../src/engine/simulator';
import type { Pt, RawFrame, SlottedFrame } from '../../src/engine/types';

const ASPECT = 4 / 3;

function baseFrame(): RawFrame {
  return renderFrame('wave', { u: 0.5, tSec: 1.1, amp: 1, rate: 1 }, DEFAULT_PLACEMENT, 0, createRng(1), { noise: 0, dropout: 0 });
}

/** Apply a similarity transform in aspect-corrected space (x, y/aspect) about the image centre. */
function transform(f: RawFrame, tx: number, ty: number, s: number, rot: number): RawFrame {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const tp = (p: Pt): Pt => {
    const x = p.x - 0.5;
    const y = p.y / ASPECT - 0.5 / ASPECT;
    return { ...p, x: 0.5 + tx + s * (x * c - y * sn), y: (0.5 / ASPECT + ty + s * (x * sn + y * c)) * ASPECT };
  };
  return { ...f, pose: f.pose!.map(tp), hands: f.hands.map((h) => ({ ...h, pts: h.pts.map(tp) })) };
}

const feats = (f: RawFrame) => extractFeatures(assignHands(f));
const dist = (a: Float32Array, b: Float32Array) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]!) ** 2, 0));

describe('features', () => {
  it('produces D = 108 values and is valid with visible shoulders', () => {
    const f = feats(baseFrame());
    expect(D).toBe(108);
    expect(f.v.length).toBe(108);
    expect(f.valid).toBe(true);
    expect(f.v[RANGE_PRESENCE[0]]).toBe(1);
    expect(f.v[RANGE_PRESENCE[0] + 1]).toBe(1);
  });

  it('is invariant to translation, uniform scale and in-plane roll', () => {
    const a = feats(baseFrame()).v;
    for (const [tx, ty, s, r] of [
      [0.08, -0.03, 1, 0],
      [0, 0, 0.7, 0],
      [0, 0, 1, 0.25],
      [-0.05, 0.04, 1.2, -0.2],
    ] as const) {
      const b = feats(transform(baseFrame(), tx, ty, s, r)).v;
      expect(dist(a, b)).toBeLessThan(1e-3);
    }
  });

  it('is invalid when a shoulder is not visible (< 0.5)', () => {
    const f = baseFrame();
    f.pose![11] = { ...f.pose![11]!, v: 0.4 };
    const r = feats(f);
    expect(r.valid).toBe(false);
    expect(r.v.every((x) => x === 0)).toBe(true);
  });

  it('zeroes low-visibility points (hips) without invalidating the frame', () => {
    const f = baseFrame();
    f.pose![23] = { ...f.pose![23]!, v: 0.1 };
    f.pose![24] = { ...f.pose![24]!, v: 0.1 };
    const r = feats(f);
    expect(r.valid).toBe(true);
    // hips are POSE_IDX slots 9 and 10 → indices 18..21
    expect([r.v[18], r.v[19], r.v[20], r.v[21]]).toEqual([0, 0, 0, 0]);
  });

  it('is invalid with no pose', () => {
    expect(extractFeatures({ t: 0, pose: null, left: null, right: null, aspect: ASPECT } satisfies SlottedFrame).valid).toBe(false);
  });
});

describe('hand matching', () => {
  const frame = baseFrame();
  const left = frame.pose![15]!;
  const right = frame.pose![16]!;
  const handAt = (w: Pt, label?: 'Left' | 'Right') => ({ pts: Array.from({ length: 21 }, (_, i) => ({ x: w.x + i * 0.001, y: w.y - i * 0.001 })), ...(label ? { label } : {}) });

  it('assigns by wrist proximity regardless of (wrong) labels', () => {
    const s = assignHands({ ...frame, hands: [handAt(left, 'Left'), handAt(right, 'Right')] });
    expect(s.left![0]!.x).toBeCloseTo(left.x);
    expect(s.right![0]!.x).toBeCloseTo(right.x);
  });

  it('handles crossed hands (each hand near the opposite side) by wrist position', () => {
    const crossed = { ...frame, pose: frame.pose!.map((p, i) => (i === 15 ? { ...right } : i === 16 ? { ...left } : p)) };
    const s = assignHands({ ...crossed, hands: [handAt(right), handAt(left)] });
    expect(s.left![0]!.x).toBeCloseTo(right.x);
    expect(s.right![0]!.x).toBeCloseTo(left.x);
  });

  it('falls back to the label, accounting for un-mirrored input', () => {
    const far = { x: 0.5, y: 0.1 };
    const s = assignHands({ ...frame, hands: [handAt(far, 'Left')] });
    expect(s.right).not.toBeNull(); // 'Left' on un-mirrored video = subject's right
    expect(s.left).toBeNull();
    const m = assignHands({ ...frame, hands: [handAt(far, 'Left')] }, true);
    expect(m.left).not.toBeNull();
  });

  it('never assigns two hands to one slot and drops unmatchable hands', () => {
    const s = assignHands({ ...frame, hands: [handAt(left), handAt({ x: left.x + 0.01, y: left.y })] });
    expect(s.left).not.toBeNull();
    expect(s.right).toBeNull();
  });
});
