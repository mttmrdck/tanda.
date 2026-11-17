import { D, DTW_BAND, D_HAND, D_POSE, RANGE_HAND_L, RANGE_HAND_R, RANGE_PRESENCE, W_HAND, W_PRESENCE } from './constants';

// Reusable scratch matrix (grown on demand) — no allocation in the hot path.
let cost = new Float64Array(0);

/**
 * Weighted distance between frame `i` of `a` and frame `j` of `b` (Section 5.6):
 * sqrt(Σ_pose Δ² + 0.35·Σ_hand Δ² + 0.5·Σ_presence Δ²).
 * Absent data must not poison the distance: a pose point that is absent (exactly 0,0) in either frame is
 * skipped, and a hand slot's shape is compared only when that hand is present in both frames — its
 * appearance/disappearance is captured by the presence term instead.
 */
export function frameDistance(a: Float32Array, i: number, b: Float32Array, j: number, d: number): number {
  const oa = i * d;
  const ob = j * d;
  let pose = 0;
  let hand = 0;
  let pres = 0;
  const poseEnd = Math.min(D_POSE, d);
  for (let k = 0; k < poseEnd; k += 2) {
    const ax = a[oa + k]!;
    const ay = a[oa + k + 1]!;
    const bx = b[ob + k]!;
    const by = b[ob + k + 1]!;
    if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) continue;
    pose += (ax - bx) ** 2 + (ay - by) ** 2;
  }
  if (d >= D) {
    const p0 = RANGE_PRESENCE[0];
    for (let slot = 0; slot < 2; slot++) {
      const pa = a[oa + p0 + slot]!;
      const pb = b[ob + p0 + slot]!;
      pres += (pa - pb) ** 2;
      if (pa < 0.5 || pb < 0.5) continue;
      const h0 = slot === 0 ? RANGE_HAND_L[0] : RANGE_HAND_R[0];
      for (let k = h0; k < h0 + D_HAND; k++) {
        const x = a[oa + k]! - b[ob + k]!;
        hand += x * x;
      }
    }
  }
  return Math.sqrt(pose + W_HAND * hand + W_PRESENCE * pres);
}

/**
 * Sakoe–Chiba banded DTW between two clips of `n` frames × `d` features, normalised by `n`.
 */
export function dtw(a: Float32Array, b: Float32Array, n: number, d: number, band = DTW_BAND): number {
  const w = n + 1;
  if (cost.length < w * w) cost = new Float64Array(w * w);
  cost.fill(Infinity, 0, w * w);
  cost[0] = 0;
  const r = Math.max(band, 0);
  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - r);
    const jEnd = Math.min(n, i + r);
    for (let j = jStart; j <= jEnd; j++) {
      const c = frameDistance(a, i - 1, b, j - 1, d);
      const up = cost[(i - 1) * w + j]!;
      const left = cost[i * w + j - 1]!;
      const diag = cost[(i - 1) * w + j - 1]!;
      cost[i * w + j] = c + Math.min(up, left, diag);
    }
  }
  return cost[n * w + n]! / n;
}
