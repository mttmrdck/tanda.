import { CLIP_N, D, MAX_INVALID_FRACTION } from './constants';
import type { FeatureFrame } from './types';

/** Fraction of the clip's duration covered by invalid frames (each frame owns half of each adjacent interval). */
export function invalidFraction(frames: readonly FeatureFrame[]): number {
  if (frames.length === 0) return 1;
  if (frames.length === 1) return frames[0]!.valid ? 0 : 1;
  const total = frames[frames.length - 1]!.t - frames[0]!.t;
  if (total <= 0) return frames.every((f) => f.valid) ? 0 : 1;
  let bad = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i]!.valid) continue;
    const prev = i > 0 ? (frames[i]!.t - frames[i - 1]!.t) / 2 : 0;
    const next = i < frames.length - 1 ? (frames[i + 1]!.t - frames[i]!.t) / 2 : 0;
    bad += prev + next;
  }
  return bad / total;
}

/**
 * Time-normalise a clip to `n` frames over valid frames only. Each output frame is the mean of the valid input
 * frames inside its time bin (this also averages out landmark jitter); empty bins are linearly interpolated
 * from the neighbouring valid frames, which bridges short gaps. Returns null if more than 30% of the clip's
 * duration is invalid or fewer than 2 valid frames exist.
 */
export function resampleClip(frames: readonly FeatureFrame[], n = CLIP_N, d = D): Float32Array | null {
  if (invalidFraction(frames) > MAX_INVALID_FRACTION) return null;
  const valid = frames.filter((f) => f.valid);
  if (valid.length < 2) return null;
  const t0 = valid[0]!.t;
  const t1 = valid[valid.length - 1]!.t;
  if (t1 <= t0) return null;
  const out = new Float32Array(n * d);
  const step = (t1 - t0) / (n - 1);
  const half = step / 2;
  let j = 0; // interpolation cursor
  let lo = 0; // bin cursor
  for (let i = 0; i < n; i++) {
    const t = t0 + step * i;
    const o = i * d;
    while (lo < valid.length && valid[lo]!.t < t - half) lo++;
    let cnt = 0;
    for (let k = lo; k < valid.length && valid[k]!.t <= t + half; k++) {
      const v = valid[k]!.v;
      for (let q = 0; q < d; q++) out[o + q] = out[o + q]! + v[q]!;
      cnt++;
    }
    if (cnt > 0) {
      for (let q = 0; q < d; q++) out[o + q] = out[o + q]! / cnt;
      continue;
    }
    while (j < valid.length - 2 && valid[j + 1]!.t < t) j++;
    const a = valid[j]!;
    const b = valid[j + 1]!;
    const span = b.t - a.t;
    const w = span > 0 ? Math.min(Math.max((t - a.t) / span, 0), 1) : 0;
    for (let q = 0; q < d; q++) out[o + q] = a.v[q]! + (b.v[q]! - a.v[q]!) * w;
  }
  return out;
}
