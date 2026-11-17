import { IDLE_ENERGY, MARGIN_MIN } from './constants';
import { classScore, computeTau } from './calibration';
import type { Category, Recognition, Urgency } from './types';

export interface ClassModel {
  signalId: string;
  urgency: Urgency;
  category: Category;
  examples: Float32Array[];
  /** calibrated threshold τ_c (before sensitivity) */
  tau: number;
}

export interface ClassifyOptions {
  n: number;
  d: number;
  /** 0.7–1.4, multiplies every τ */
  sensitivity: number;
  marginMin?: number;
  idleEnergy?: number;
}

export function buildModel(
  signal: { id: string; urgency: Urgency; category: Category },
  examples: Float32Array[],
  n: number,
  d: number,
): ClassModel {
  return { signalId: signal.id, urgency: signal.urgency, category: signal.category, examples, tau: computeTau(examples, n, d) };
}

const reject = (reason: Recognition['reason'], distance = Infinity, margin = 0): Recognition => ({
  signalId: null,
  confidence: 0,
  distance,
  margin,
  reason,
});

/**
 * Nearest-class prediction with calibrated rejection.
 * @param energy window motion energy; below `idleEnergy` → 'low-motion'.
 */
export function classify(query: Float32Array, models: readonly ClassModel[], opts: ClassifyOptions, energy?: number): Recognition {
  if (energy !== undefined && energy < (opts.idleEnergy ?? IDLE_ENERGY)) return reject('low-motion');
  const usable = models.filter((m) => m.examples.length > 0);
  if (usable.length === 0) return reject('insufficient-data');

  let best: ClassModel | null = null;
  let s1 = Infinity;
  let s2 = Infinity;
  let second: ClassModel | null = null;
  for (const m of usable) {
    const s = classScore(query, m.examples, opts.n, opts.d);
    if (s < s1) {
      s2 = s1;
      second = best;
      s1 = s;
      best = m;
    } else if (s < s2) {
      s2 = s;
      second = m;
    }
  }
  const top = best!;
  const thr = top.tau * opts.sensitivity;
  const margin = Number.isFinite(s2) && s2 > 0 ? (s2 - s1) / s2 : 1;
  if (s1 > thr) return reject('unknown', s1, margin);
  if (second && margin < (opts.marginMin ?? MARGIN_MIN) && (second.urgency !== top.urgency || second.category !== top.category)) {
    return reject('low-margin', s1, margin);
  }
  const confidence = Math.min(Math.max(1 / (1 + (s1 / thr) ** 3), 0), 1);
  return { signalId: top.signalId, confidence, distance: s1, margin };
}
