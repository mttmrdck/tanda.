import { MAX_EXAMPLES_PER_SIGNAL, TAU_DEFAULT, TAU_MAX, TAU_MIN } from './constants';
import { dtw } from './dtw';

/** Class score: mean of the two smallest distances (or the single distance with one example). */
export function scoreFromDistances(dists: readonly number[]): number {
  if (dists.length === 0) return Infinity;
  if (dists.length === 1) return dists[0]!;
  let a = Infinity;
  let b = Infinity;
  for (const x of dists) {
    if (x < a) {
      b = a;
      a = x;
    } else if (x < b) b = x;
  }
  return (a + b) / 2;
}

export function classScore(query: Float32Array, examples: readonly Float32Array[], n: number, d: number): number {
  return scoreFromDistances(examples.map((e) => dtw(query, e, n, d)));
}

/** Symmetric pairwise DTW matrix (row-major, k×k). */
export function pairwise(examples: readonly Float32Array[], n: number, d: number): Float64Array {
  const k = examples.length;
  const m = new Float64Array(k * k);
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const v = dtw(examples[i]!, examples[j]!, n, d);
      m[i * k + j] = v;
      m[j * k + i] = v;
    }
  }
  return m;
}

/**
 * Per-class rejection threshold τ_c. Leave-one-out: score each example against the others using the same
 * class-score rule as classification, then τ = mean + 2·std, clamped to [TAU_MIN, TAU_MAX].
 * Fewer than 3 examples → TAU_DEFAULT.
 */
export function computeTau(examples: readonly Float32Array[], n: number, d: number): number {
  const k = examples.length;
  if (k < 3) return TAU_DEFAULT;
  const m = pairwise(examples, n, d);
  const loo: number[] = [];
  for (let i = 0; i < k; i++) {
    const row: number[] = [];
    for (let j = 0; j < k; j++) if (j !== i) row.push(m[i * k + j]!);
    loo.push(scoreFromDistances(row));
  }
  const mean = loo.reduce((s, x) => s + x, 0) / k;
  const std = Math.sqrt(loo.reduce((s, x) => s + (x - mean) ** 2, 0) / k);
  return Math.min(Math.max(mean + 2 * std, TAU_MIN), TAU_MAX);
}

/**
 * When a class exceeds the cap, return the index of the example to evict: the one most similar to another
 * example of the same class (smallest nearest-neighbour distance). Returns -1 when under the cap.
 */
export function evictionIndex(examples: readonly Float32Array[], n: number, d: number, cap = MAX_EXAMPLES_PER_SIGNAL): number {
  const k = examples.length;
  if (k <= cap) return -1;
  const m = pairwise(examples, n, d);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < k; i++) {
    let nn = Infinity;
    for (let j = 0; j < k; j++) if (j !== i) nn = Math.min(nn, m[i * k + j]!);
    if (nn < bestD) {
      bestD = nn;
      best = i;
    }
  }
  return best;
}
