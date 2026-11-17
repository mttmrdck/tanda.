import { CLIP_N, D, RANGE_PRESENCE } from '../constants';
import { dtw } from '../dtw';
import { handDistance, handShapeOfClip } from './staticHand';

/**
 * Authoring quality checks for a reference signer's takes. Advice only — the signer decides what to keep.
 * - hands-out: a hand was missing in too many frames of the take
 * - inconsistent: the take is far from the other takes
 * - speed: the takes were performed at very different speeds (dynamic signs)
 * - too-similar: the takes are near-identical (some natural variation helps matching)
 * - too-few: fewer than MIN_TAKES takes
 */
export const MIN_TAKES = 5;
export type TakeIssue = 'hands-out' | 'inconsistent';
export type SetIssue = 'too-few' | 'speed' | 'too-similar';

export interface TakeInput {
  clip: Float32Array;
  /** window motion energy at record time */
  energy: number;
}

export function handFraction(clip: Float32Array): number {
  const n = Math.floor(clip.length / D);
  let k = 0;
  for (let f = 0; f < n; f++) if (clip[f * D + RANGE_PRESENCE[0]]! > 0.5 || clip[f * D + RANGE_PRESENCE[0] + 1]! > 0.5) k++;
  return n ? k / n : 0;
}

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
};

export function checkTakes(takes: readonly TakeInput[], type: 'static' | 'dynamic'): { perTake: TakeIssue[][]; set: SetIssue[] } {
  const perTake: TakeIssue[][] = takes.map((t) => (handFraction(t.clip) < 0.8 ? ['hands-out'] : []));
  const set: SetIssue[] = takes.length < MIN_TAKES ? ['too-few'] : [];
  if (takes.length < 3) return { perTake, set };

  const shapes = type === 'static' ? takes.map((t) => handShapeOfClip(t.clip)?.shape ?? null) : [];
  const dist = (i: number, j: number) => {
    if (type === 'dynamic') return dtw(takes[i]!.clip, takes[j]!.clip, CLIP_N, D);
    const a = shapes[i];
    const b = shapes[j];
    return a && b ? handDistance(a, b) : Infinity;
  };
  const meanTo = takes.map((_, i) => {
    const ds = takes.map((__, j) => (j === i ? null : dist(i, j))).filter((x): x is number => x !== null && Number.isFinite(x));
    return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : Infinity;
  });
  const typical = median(meanTo.filter(Number.isFinite));
  meanTo.forEach((m, i) => {
    if (m > typical * 1.75 && m > (type === 'dynamic' ? 0.6 : 0.12)) perTake[i]!.push('inconsistent');
  });
  if (typical < (type === 'dynamic' ? 0.03 : 0.005)) set.push('too-similar');
  if (type === 'dynamic') {
    const es = takes.map((t) => t.energy);
    const mean = es.reduce((a, b) => a + b, 0) / es.length;
    const sd = Math.sqrt(es.reduce((a, b) => a + (b - mean) ** 2, 0) / es.length);
    if (mean > 0 && sd / mean > 0.45) set.push('speed');
  }
  return { perTake, set };
}
