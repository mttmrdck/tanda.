import { IDLE_ENERGY, HAND_IDLE_SPREAD, RANGE_HAND_L, RANGE_HAND_R, RANGE_PRESENCE } from './constants';
import { handSpread, motionEnergy, type PointSample } from './motion';
import type { FeatureFrame } from './types';

/**
 * "Guess before teaching": a plain description of what the hands are doing — which hand, its shape, how high —
 * built from the same feature frames the recogniser uses. It never names a meaning; the caregiver supplies that.
 * Rule-based (finger extension from the 21 hand landmarks), so it needs no extra model and no training data.
 */
export type HandShapeName = 'open' | 'fist' | 'point' | 'thumbsUp' | 'changing';
export type GuessHand = 'left' | 'right' | 'both';
export type GuessHeight = 'high' | 'mid' | 'low';

export interface Guess {
  hand: GuessHand;
  shape: HandShapeName;
  height: GuessHeight;
}

export const guessKey = (g: Guess): string => `${g.hand}:${g.shape}:${g.height}`;

/** Pose feature slots (POSE_IDX order) of the subject's left / right wrist. */
const WRIST_SLOT = { left: 7, right: 8 } as const;
const HAND = {
  left: { range: RANGE_HAND_L, presence: RANGE_PRESENCE[0] },
  right: { range: RANGE_HAND_R, presence: RANGE_PRESENCE[0] + 1 },
} as const;

/** finger → [middle joint (PIP), tip] in MediaPipe hand indices */
const FINGERS = { index: [6, 8], middle: [10, 12], ring: [14, 16], pinky: [18, 20] } as const;
/** A finger is extended when its tip is this much farther from the wrist than its middle joint. */
const EXTENDED_RATIO = 1.12;
/** Thumb counts as out when its tip is this far (hand units) from the middle-finger knuckle. */
const THUMB_OUT = 0.45;
/** Shape flips (after a 3-frame mode filter) at or above which the hand is "changing" (opening and closing). */
const CHANGING_FLIPS = 3;
/** One wrist is noisier than the five-point body average, so its speed counts at half weight. */
const WRIST_WEIGHT = 0.5;
/** Wrist height bands, shoulder widths below (+) / above (−) the shoulder line. */
const HIGH_Y = -0.3;
const LOW_Y = 0.9;

type FrameShape = Exclude<HandShapeName, 'changing'> | null;

/** Hand shape of one frame from the 42 hand-feature values (wrist-relative, hand units, body-aligned, y down). */
export function frameShape(v: ArrayLike<number>, offset: number): FrameShape {
  const pt = (i: number): [number, number] => [v[offset + 2 * i]!, v[offset + 2 * i + 1]!];
  const len = ([x, y]: [number, number]) => Math.hypot(x, y);
  const ext = Object.values(FINGERS).map(([pip, tip]) => len(pt(tip)) > len(pt(pip)) * EXTENDED_RATIO);
  const n = ext.filter(Boolean).length;
  const thumbTip = pt(4);
  const midKnuckle = pt(9);
  const thumbOut = Math.hypot(thumbTip[0] - midKnuckle[0], thumbTip[1] - midKnuckle[1]) > THUMB_OUT;
  if (n >= 3) return 'open';
  if (n === 1 && ext[0]) return 'point';
  if (n === 0) return thumbOut && thumbTip[1] < pt(5)[1] ? 'thumbsUp' : 'fist';
  return null;
}

interface HandActivity {
  side: 'left' | 'right';
  activity: number;
  shape: HandShapeName | null;
  height: GuessHeight | null;
}

function handActivity(frames: readonly FeatureFrame[], side: 'left' | 'right'): HandActivity {
  const slot = WRIST_SLOT[side];
  const { range, presence } = HAND[side];
  const wrist: PointSample[] = [];
  const ys: number[] = [];
  const seq: Exclude<FrameShape, null>[] = [];
  for (const f of frames) {
    if (!f.valid) continue;
    const x = f.v[2 * slot]!;
    const y = f.v[2 * slot + 1]!;
    if (x !== 0 || y !== 0) {
      wrist.push({ t: f.t, xy: [x, y] });
      ys.push(y);
    }
    if (f.v[presence] === 1) {
      const s = frameShape(f.v, range[0]);
      if (s) seq.push(s);
    }
  }
  const fingers = (IDLE_ENERGY * handSpread(frames, side)) / HAND_IDLE_SPREAD;
  const activity = Math.max(motionEnergy(wrist) * WRIST_WEIGHT, fingers);

  const shape = seq.length >= Math.max(4, frames.length * 0.5) ? summariseShapes(seq) : null;
  let height: GuessHeight | null = null;
  if (ys.length) {
    const top = Math.min(...ys);
    height = top < HIGH_Y ? 'high' : top < LOW_Y ? 'mid' : 'low';
  }
  return { side, activity, shape, height };
}

/** Mode-filter the per-frame shapes (3 frames), then: many flips → "changing", else the longest-held shape. */
function summariseShapes(seq: readonly Exclude<FrameShape, null>[]): HandShapeName {
  const sm = seq.map((s, i) => {
    const a = seq[i - 1];
    const b = seq[i + 1];
    return a && a === b ? a : s;
  });
  let flips = 0;
  let best = sm[0]!;
  let bestLen = 0;
  let runStart = 0;
  for (let i = 1; i <= sm.length; i++) {
    if (i < sm.length && sm[i] === sm[i - 1]) continue;
    if (i - runStart > bestLen) [best, bestLen] = [sm[runStart]!, i - runStart];
    if (i < sm.length) flips++;
    runStart = i;
  }
  return flips >= CHANGING_FLIPS ? 'changing' : best;
}

/**
 * Describe the active hand(s) in a window, or null when nothing is moving or no hand is clearly seen.
 * A hand is active when it moves at least as much as the stillness threshold and at least half as much as the
 * busier hand; both hands active with the same shape → "both".
 */
export function describeWindow(frames: readonly FeatureFrame[]): Guess | null {
  const hands = [handActivity(frames, 'left'), handActivity(frames, 'right')];
  const top = Math.max(...hands.map((h) => h.activity));
  if (top < IDLE_ENERGY) return null;
  const active = hands.filter((h) => h.activity >= Math.max(IDLE_ENERGY, top * 0.5) && h.shape && h.height);
  if (active.length === 0) return null;
  const lead = active.reduce((a, b) => (b.activity > a.activity ? b : a));
  const both = active.length === 2 && active[0]!.shape === active[1]!.shape;
  const height = both ? (active.some((h) => h.height === 'high') ? 'high' : active.some((h) => h.height === 'mid') ? 'mid' : 'low') : lead.height!;
  return { hand: both ? 'both' : lead.side, shape: lead.shape!, height };
}
