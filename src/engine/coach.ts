import { TAU_DEFAULT } from './constants';
import { dtw } from './dtw';

/**
 * Distinctiveness coach — friendly, structured advice after teaching a signal.
 * The UI maps codes to translated sentences; we never say "fail".
 */
export type CoachCode = 'ok' | 'inconsistent' | 'too-similar' | 'too-few' | 'poor-visibility';

export interface CoachAdvice {
  code: CoachCode;
  /** for 'too-similar': the signal it resembles */
  similarTo?: string;
}

export interface CoachReport {
  advice: CoachAdvice[];
  /** mean pairwise distance ÷ TAU_DEFAULT (lower = more consistent) */
  consistency: number;
  /** nearest other-signal distance ÷ mean intra-class distance (higher = more distinct) */
  separation: number;
}

export const MIN_EXAMPLES = 3;
/** consistency above this → "try the gesture the same way each time" */
export const CONSISTENCY_MAX = 0.75;
/** separation below this → "looks like <other signal>" */
export const SEPARATION_MIN = 1.5;
/** fraction of invalid frames during recording above this → visibility advice */
export const VISIBILITY_MAX_INVALID = 0.15;

export interface CoachInput {
  examples: readonly Float32Array[];
  others: readonly { signalId: string; examples: readonly Float32Array[] }[];
  n: number;
  d: number;
  /** mean fraction of invalid frames across the recorded takes (0..1) */
  invalidFraction?: number;
}

export function coachSignal(input: CoachInput): CoachReport {
  const { examples, others, n, d } = input;
  const advice: CoachAdvice[] = [];
  if (examples.length < MIN_EXAMPLES) advice.push({ code: 'too-few' });
  if ((input.invalidFraction ?? 0) > VISIBILITY_MAX_INVALID) advice.push({ code: 'poor-visibility' });

  let intra = 0;
  let pairs = 0;
  for (let i = 0; i < examples.length; i++) {
    for (let j = i + 1; j < examples.length; j++) {
      intra += dtw(examples[i]!, examples[j]!, n, d);
      pairs++;
    }
  }
  const meanIntra = pairs > 0 ? intra / pairs : 0;
  const consistency = meanIntra / TAU_DEFAULT;
  if (pairs > 0 && consistency > CONSISTENCY_MAX) advice.push({ code: 'inconsistent' });

  let nearest = Infinity;
  let nearestId: string | undefined;
  for (const o of others) {
    for (const oe of o.examples) {
      for (const e of examples) {
        const dist = dtw(e, oe, n, d);
        if (dist < nearest) {
          nearest = dist;
          nearestId = o.signalId;
        }
      }
    }
  }
  const separation = Number.isFinite(nearest) ? nearest / Math.max(meanIntra, 0.05) : Infinity;
  if (nearestId && separation < SEPARATION_MIN) advice.push({ code: 'too-similar', similarTo: nearestId });

  if (advice.length === 0) advice.push({ code: 'ok' });
  return { advice, consistency, separation };
}
