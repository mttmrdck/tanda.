import { D, RANGE_HAND_L, RANGE_HAND_R, RANGE_PRESENCE } from '../constants';

/**
 * Static handshape classifier (fingerspelling and other held signs). Works on the 21 hand landmarks only:
 * wrist-relative, scale- and rotation-normalised (wrist→middle knuckle = 1, pointing up), and mirrored for a
 * left hand so left- and right-handed signers share templates. kNN with per-class rejection, the same scoring
 * rules as the dynamic classifier (mean of the two nearest, LOO-calibrated τ, margin check).
 */
export const HAND_POINTS = 21;
/** normalised vector: points 1..20 (the wrist is the origin and dropped) */
export const STATIC_DIM = (HAND_POINTS - 1) * 2;

export const STATIC_TAU_DEFAULT = 0.3;
export const STATIC_TAU_MIN = 0.12;
export const STATIC_TAU_MAX = 0.6;
export const STATIC_MARGIN_MIN = 0.1;

export type Side = 'left' | 'right';

/**
 * Normalise 21 (x, y) points given interleaved in any frame (image or feature space, y down).
 * Translation, scale, in-plane rotation and (for `side === 'left'`) mirroring are removed.
 */
export function normalizeHand(pts: ArrayLike<number>, side: Side): Float32Array {
  const ox = pts[0]!;
  const oy = pts[1]!;
  let mx = pts[18]! - ox;
  const my = pts[19]! - oy;
  if (side === 'left') mx = -mx;
  const len = Math.max(Math.hypot(mx, my), 1e-6);
  // rotate so wrist→middle knuckle points straight up (0, −1)
  const ang = Math.atan2(mx, -my);
  const c = Math.cos(-ang);
  const s = Math.sin(-ang);
  const out = new Float32Array(STATIC_DIM);
  for (let i = 1; i < HAND_POINTS; i++) {
    let x = pts[2 * i]! - ox;
    const y = pts[2 * i + 1]! - oy;
    if (side === 'left') x = -x;
    // rotate by −ang so the knuckle direction lands on (0, −1)
    const rx = (x * c - y * s) / len;
    const ry = (x * s + y * c) / len;
    out[2 * (i - 1)] = rx;
    out[2 * (i - 1) + 1] = ry;
  }
  return out;
}

/** Root-mean-square point distance between two normalised hands (hand units). */
export function handDistance(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < STATIC_DIM; i += 2) s += (a[i]! - b[i]!) ** 2 + (a[i + 1]! - b[i + 1]!) ** 2;
  return Math.sqrt(s / (HAND_POINTS - 1));
}

/** Pose feature slots (POSE_IDX order) of the subject's left / right wrist. */
const WRIST_SLOT: Record<Side, number> = { left: 7, right: 8 };

/**
 * The signing hand's normalised shape over a clip (CLIP_N × D features, or any run of D-sized frames):
 * per frame the raised hand (higher wrist) that is present; the side used most wins; the per-coordinate
 * median over those frames is returned. Null when no hand is present in at least half of the frames.
 */
export function handShapeOfClip(clip: Float32Array, d = D, forceSide?: Side): { shape: Float32Array; side: Side } | null {
  const n = Math.floor(clip.length / d);
  const per: Record<Side, Float32Array[]> = { left: [], right: [] };
  for (let f = 0; f < n; f++) {
    const o = f * d;
    const present = { left: clip[o + RANGE_PRESENCE[0]]! > 0.5, right: clip[o + RANGE_PRESENCE[0] + 1]! > 0.5 };
    let side: Side | null = forceSide && present[forceSide] ? forceSide : null;
    if (!side && !forceSide) {
      if (present.left && present.right) side = clip[o + 2 * WRIST_SLOT.left + 1]! < clip[o + 2 * WRIST_SLOT.right + 1]! ? 'left' : 'right';
      else side = present.left ? 'left' : present.right ? 'right' : null;
    }
    if (!side) continue;
    const start = o + (side === 'left' ? RANGE_HAND_L[0] : RANGE_HAND_R[0]);
    // hand features are already wrist-relative (wrist = 0,0); prepend nothing — normalizeHand handles it
    per[side].push(normalizeHand(clip.subarray(start, start + HAND_POINTS * 2), side));
  }
  const side: Side = per.left.length > per.right.length ? 'left' : 'right';
  const frames = per[side];
  if (frames.length < Math.max(2, n * 0.5)) return null;
  const shape = new Float32Array(STATIC_DIM);
  const col = new Float64Array(frames.length);
  for (let k = 0; k < STATIC_DIM; k++) {
    for (let i = 0; i < frames.length; i++) col[i] = frames[i]![k]!;
    col.sort();
    const m = col.length >> 1;
    shape[k] = col.length % 2 ? col[m]! : (col[m - 1]! + col[m]!) / 2;
  }
  return { shape, side };
}

export interface StaticModel {
  signId: string;
  shapes: Float32Array[];
  tau: number;
}

const meanOfTwoNearest = (ds: number[]): number => {
  if (ds.length === 0) return Infinity;
  const s = [...ds].sort((a, b) => a - b);
  return s.length === 1 ? s[0]! : (s[0]! + s[1]!) / 2;
};

export function staticScore(query: Float32Array, shapes: readonly Float32Array[]): number {
  return meanOfTwoNearest(shapes.map((s) => handDistance(query, s)));
}

/** τ = mean + 2·std of leave-one-out scores, clamped; fewer than 3 shapes → default. */
export function staticTau(shapes: readonly Float32Array[]): number {
  if (shapes.length < 3) return STATIC_TAU_DEFAULT;
  const loo = shapes.map((s, i) => staticScore(s, shapes.filter((_, j) => j !== i)));
  const mean = loo.reduce((a, b) => a + b, 0) / loo.length;
  const std = Math.sqrt(loo.reduce((a, b) => a + (b - mean) ** 2, 0) / loo.length);
  return Math.min(Math.max(mean + 2 * std, STATIC_TAU_MIN), STATIC_TAU_MAX);
}

export function buildStaticModel(signId: string, shapes: Float32Array[]): StaticModel {
  return { signId, shapes, tau: staticTau(shapes) };
}

export interface StaticResult {
  signId: string | null;
  confidence: number;
  distance: number;
  margin: number;
  reason?: 'unknown' | 'low-margin' | 'insufficient-data';
  /** best and runner-up candidates (for "looks similar to" feedback), even when rejected */
  best?: string;
  second?: string;
}

export function classifyStatic(query: Float32Array, models: readonly StaticModel[], sensitivity = 1): StaticResult {
  const usable = models.filter((m) => m.shapes.length > 0);
  if (usable.length === 0) return { signId: null, confidence: 0, distance: Infinity, margin: 0, reason: 'insufficient-data' };
  const scored = usable.map((m) => ({ m, s: staticScore(query, m.shapes) })).sort((a, b) => a.s - b.s);
  const top = scored[0]!;
  const runner = scored[1];
  const thr = top.m.tau * sensitivity;
  const margin = runner && runner.s > 0 ? (runner.s - top.s) / runner.s : 1;
  const names = { best: top.m.signId, ...(runner ? { second: runner.m.signId } : {}) };
  if (top.s > thr) return { signId: null, confidence: 0, distance: top.s, margin, reason: 'unknown', ...names };
  if (runner && margin < STATIC_MARGIN_MIN) return { signId: null, confidence: 0, distance: top.s, margin, reason: 'low-margin', ...names };
  const confidence = Math.min(Math.max(1 / (1 + (top.s / thr) ** 3), 0), 1);
  return { signId: top.m.signId, confidence, distance: top.s, margin, ...names };
}
