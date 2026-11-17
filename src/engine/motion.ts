import { ENERGY_POSE_SLOTS, HAND_IDLE_SPREAD, IDLE_ENERGY, RANGE_HAND_L, RANGE_HAND_R, RANGE_PRESENCE } from './constants';
import type { FeatureFrame } from './types';

/** Displacement is measured over this lag rather than frame-to-frame, so landmark jitter adds little. */
export const ENERGY_LAG_MS = 200;
/** Positions are averaged over ±this many ms before differencing (reduces jitter further). */
export const ENERGY_AVG_MS = 70;

export interface PointSample {
  t: number;
  /** interleaved x,y in a common unit (shoulder widths) */
  xy: ArrayLike<number>;
  /** optional per-point presence (false → skip that point) */
  present?: ArrayLike<boolean>;
}

/**
 * Mean keypoint speed (units / second) over a sequence. Each sample is compared with the first sample at least
 * `lagMs` later; speeds of points present in both are averaged.
 */
export function motionEnergy(input: readonly PointSample[], lagMs = ENERGY_LAG_MS): number {
  const samples = averageSamples(input, ENERGY_AVG_MS);
  let sum = 0;
  let count = 0;
  let j = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i]!;
    if (j <= i) j = i + 1;
    while (j < samples.length && samples[j]!.t - a.t < lagMs) j++;
    if (j >= samples.length) break;
    const b = samples[j]!;
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0 || dt > (lagMs * 3) / 1000) continue;
    const pts = Math.min(a.xy.length, b.xy.length) / 2;
    let s = 0;
    let c = 0;
    for (let k = 0; k < pts; k++) {
      if (a.present && !a.present[k]) continue;
      if (b.present && !b.present[k]) continue;
      s += Math.hypot(b.xy[2 * k]! - a.xy[2 * k]!, b.xy[2 * k + 1]! - a.xy[2 * k + 1]!);
      c++;
    }
    if (c > 0) {
      sum += s / c / dt;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/** Short centred moving average of point positions (only over samples where the point is present). */
function averageSamples(samples: readonly PointSample[], halfMs: number): PointSample[] {
  if (halfMs <= 0 || samples.length < 3) return [...samples];
  return samples.map((s, i) => {
    const m = s.xy.length / 2;
    const xy = new Float64Array(s.xy.length);
    const cnt = new Float64Array(m);
    for (let j = i; j >= 0 && s.t - samples[j]!.t <= halfMs; j--) acc(samples[j]!, xy, cnt, m);
    for (let j = i + 1; j < samples.length && samples[j]!.t - s.t <= halfMs; j++) acc(samples[j]!, xy, cnt, m);
    const present: boolean[] = [];
    for (let k = 0; k < m; k++) {
      const ok = cnt[k]! > 0 && (!s.present || s.present[k] === true);
      present.push(ok);
      if (cnt[k]! > 0) {
        xy[2 * k] = xy[2 * k]! / cnt[k]!;
        xy[2 * k + 1] = xy[2 * k + 1]! / cnt[k]!;
      }
    }
    return { t: s.t, xy, present };
  });
}

function acc(s: PointSample, xy: Float64Array, cnt: Float64Array, m: number): void {
  for (let k = 0; k < m; k++) {
    if (s.present && !s.present[k]) continue;
    xy[2 * k] = xy[2 * k]! + s.xy[2 * k]!;
    xy[2 * k + 1] = xy[2 * k + 1]! + s.xy[2 * k + 1]!;
    cnt[k] = cnt[k]! + 1;
  }
}

/**
 * Window motion energy: the larger of body energy (nose, elbows, wrists) and finger activity, rescaled so that
 * HAND_IDLE_SPREAD lands exactly on IDLE_ENERGY. Finger-only signals — squeezing a hand, wiggling fingers — move no body point, so without
 * the hand term they read as "still" and are refused.
 */
export function featureMotionEnergy(frames: readonly FeatureFrame[]): number {
  return Math.max(bodyMotionEnergy(frames), (IDLE_ENERGY * handShapeSpread(frames)) / HAND_IDLE_SPREAD);
}

/** Body motion energy in feature space (nose, elbows, wrists relative to the shoulders), in shoulder widths / s. */
export function bodyMotionEnergy(frames: readonly FeatureFrame[]): number {
  const samples: PointSample[] = [];
  for (const f of frames) {
    if (!f.valid) continue;
    const xy = new Float32Array(ENERGY_POSE_SLOTS.length * 2);
    const present: boolean[] = [];
    ENERGY_POSE_SLOTS.forEach((slot, k) => {
      const x = f.v[2 * slot]!;
      const y = f.v[2 * slot + 1]!;
      xy[2 * k] = x;
      xy[2 * k + 1] = y;
      present.push(x !== 0 || y !== 0);
    });
    samples.push({ t: f.t, xy, present });
  }
  return motionEnergy(samples);
}

/** Pick the contiguous sub-window of `windowMs` with the highest motion energy (used to trim teach recordings). */
export function bestSubWindow(frames: readonly FeatureFrame[], windowMs: number, stepMs = 100): FeatureFrame[] {
  if (frames.length === 0) return [];
  const t0 = frames[0]!.t;
  const tEnd = frames[frames.length - 1]!.t;
  if (tEnd - t0 <= windowMs) return [...frames];
  let best: FeatureFrame[] = [];
  let bestE = -1;
  for (let s = t0; s + windowMs <= tEnd + 1; s += stepMs) {
    const win = frames.filter((f) => f.t >= s && f.t <= s + windowMs);
    const e = featureMotionEnergy(win);
    if (e > bestE) {
      bestE = e;
      best = win;
    }
  }
  return best;
}

/** Fingertips + finger middle joints (MediaPipe hand indices) — the points that move when the hand changes shape. */
const HAND_SHAPE_POINTS = [4, 6, 8, 10, 12, 14, 16, 18, 20] as const;
/** Positions are averaged over ±this many ms before measuring the spread (hand landmarks jitter more than pose). */
const HAND_AVG_MS = 100;
/** Spread = this quantile of each point's distance from its median position (ignores brief tracking glitches). */
const SPREAD_QUANTILE = 0.75;

/**
 * Finger activity: how far the hand-shape points (relative to the wrist, in hand units) spread over the window
 * after smoothing — per point, the 75th-percentile distance from its median position; mean over points, max over
 * the two hands. A robust spread rather than a speed, because per-landmark jitter inflates speeds and a few
 * mis-tracked frames inflate a standard deviation.
 */
export function handShapeSpread(frames: readonly FeatureFrame[]): number {
  return Math.max(handSpread(frames, 'left'), handSpread(frames, 'right'));
}

/** Finger activity of one hand (the subject's left or right) — see `handShapeSpread`. */
export function handSpread(frames: readonly FeatureFrame[], side: 'left' | 'right'): number {
  const range = side === 'left' ? RANGE_HAND_L : RANGE_HAND_R;
  const presence = RANGE_PRESENCE[0] + (side === 'left' ? 0 : 1);
  const raw: PointSample[] = [];
  for (const f of frames) {
    if (!f.valid || f.v[presence] !== 1) continue;
    const xy = new Float32Array(HAND_SHAPE_POINTS.length * 2);
    HAND_SHAPE_POINTS.forEach((p, k) => {
      xy[2 * k] = f.v[range[0] + 2 * p]!;
      xy[2 * k + 1] = f.v[range[0] + 2 * p + 1]!;
    });
    raw.push({ t: f.t, xy });
  }
  // need the hand for most of the window, or a brief detection blip would read as motion
  if (raw.length < Math.max(6, frames.length * 0.5)) return 0;
  const samples = averageSamples(raw, HAND_AVG_MS);
  let sum = 0;
  for (let k = 0; k < HAND_SHAPE_POINTS.length; k++) {
    const mx = median(samples.map((s) => s.xy[2 * k]!));
    const my = median(samples.map((s) => s.xy[2 * k + 1]!));
    const dev = samples.map((s) => Math.hypot(s.xy[2 * k]! - mx, s.xy[2 * k + 1]! - my)).sort((a, b) => a - b);
    sum += dev[Math.floor((dev.length - 1) * SPREAD_QUANTILE)]!;
  }
  return sum / HAND_SHAPE_POINTS.length;
}

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}
