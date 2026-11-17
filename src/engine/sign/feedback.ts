import { IDLE_ENERGY, RANGE_HAND_L, RANGE_HAND_R, RANGE_PRESENCE } from '../constants';
import { D, CLIP_N } from '../constants';
import { dynamicScore, recogniseDynamic, type PackModels } from './models';
import { handDistance, handShapeOfClip, normalizeHand, staticScore } from './staticHand';

/**
 * Practice feedback: "close" or "try again", plus which part differed most — handshape, movement or location —
 * from per-component distances, each scaled by how much the reference signer's own takes vary in that part.
 * Feedback never scores the person; the UI words it encouragingly.
 */
export type Component = 'handshape' | 'movement' | 'location';
export const COMPONENTS: readonly Component[] = ['handshape', 'movement', 'location'];

export interface PracticeFeedback {
  verdict: 'close' | 'try-again' | 'not-seen';
  /** the part that differed most (only when trying again) */
  component: Component | null;
  /** distance ÷ the reference's own variation; ≤ 1 = within how the reference signer varies */
  ratios: Record<Component, number>;
  /** another sign in the pack the attempt was nearer to */
  lookedLike?: string;
}

const WRIST = { left: 7, right: 8 } as const;
/** floors for the reference variation, so near-identical takes do not make every attempt "far" */
const FLOOR: Record<Component, number> = { handshape: 0.08, movement: 0.06, location: 0.08 };

function frameCount(clip: Float32Array): number {
  return Math.floor(clip.length / D);
}

/** Per-component distances between two clips sampled on the same time grid (CLIP_N frames). */
export function componentDistances(a: Float32Array, b: Float32Array): Record<Component, number> {
  const n = Math.min(frameCount(a), frameCount(b));
  let hs = 0;
  let hsN = 0;
  const centroid = (c: Float32Array, side: 'left' | 'right') => {
    let x = 0;
    let y = 0;
    let k = 0;
    for (let f = 0; f < n; f++) {
      const px = c[f * D + 2 * WRIST[side]]!;
      const py = c[f * D + 2 * WRIST[side] + 1]!;
      if (px === 0 && py === 0) continue;
      x += px;
      y += py;
      k++;
    }
    return k ? [x / k, y / k] : null;
  };
  let loc = 0;
  let locN = 0;
  let mov = 0;
  let movN = 0;
  for (const side of ['left', 'right'] as const) {
    const ca = centroid(a, side);
    const cb = centroid(b, side);
    if (ca && cb) {
      loc += Math.hypot(ca[0]! - cb[0]!, ca[1]! - cb[1]!);
      locN++;
      for (let f = 0; f < n; f++) {
        const o = f * D + 2 * WRIST[side];
        if ((a[o] === 0 && a[o + 1] === 0) || (b[o] === 0 && b[o + 1] === 0)) continue;
        mov += Math.hypot(a[o]! - ca[0]! - (b[o]! - cb[0]!), a[o + 1]! - ca[1]! - (b[o + 1]! - cb[1]!));
        movN++;
      }
    }
    const range = side === 'left' ? RANGE_HAND_L : RANGE_HAND_R;
    const pres = RANGE_PRESENCE[0] + (side === 'left' ? 0 : 1);
    for (let f = 0; f < n; f++) {
      const pa = a[f * D + pres]! > 0.5;
      const pb = b[f * D + pres]! > 0.5;
      if (!pa && !pb) continue;
      hsN++;
      if (pa !== pb) {
        hs += 1; // a hand in one and not the other is a large handshape difference
        continue;
      }
      const s = f * D + range[0];
      hs += handDistance(normalizeHand(a.subarray(s, s + 42), side), normalizeHand(b.subarray(s, s + 42), side));
    }
  }
  return { handshape: hsN ? hs / hsN : 0, movement: movN ? mov / movN : 0, location: locN ? loc / locN : 0 };
}

/** How much the reference signer's own takes vary per component (mean pairwise, floored). */
export function referenceSpread(clips: readonly Float32Array[]): Record<Component, number> {
  const sum = { handshape: 0, movement: 0, location: 0 };
  let pairs = 0;
  for (let i = 0; i < clips.length; i++) {
    for (let j = i + 1; j < clips.length; j++) {
      const c = componentDistances(clips[i]!, clips[j]!);
      for (const k of COMPONENTS) sum[k] += c[k];
      pairs++;
    }
  }
  const out = { ...FLOOR };
  for (const k of COMPONENTS) out[k] = Math.max(pairs ? sum[k] / pairs : 0, FLOOR[k]);
  return out;
}

function ratiosAgainst(attempt: Float32Array, clips: readonly Float32Array[]): Record<Component, number> {
  const spread = referenceSpread(clips);
  const best = { handshape: Infinity, movement: Infinity, location: Infinity };
  for (const c of clips) {
    const d = componentDistances(attempt, c);
    for (const k of COMPONENTS) best[k] = Math.min(best[k], d[k]);
  }
  const out = { handshape: 0, movement: 0, location: 0 };
  for (const k of COMPONENTS) out[k] = Number.isFinite(best[k]) ? best[k] / spread[k] : 0;
  return out;
}

const worst = (r: Record<Component, number>): Component => COMPONENTS.reduce((a, b) => (r[b] > r[a] ? b : a));

/**
 * Feedback for one attempt at `signId`. `clip` is the resampled attempt (CLIP_N × D), `energy` its window motion
 * energy (static signs should be held still).
 */
export function practiceFeedback(clip: Float32Array, energy: number, signId: string, models: PackModels, sensitivity = 1): PracticeFeedback {
  const sign = models.signs.get(signId);
  const clips = models.clips.get(signId) ?? [];
  const none: Record<Component, number> = { handshape: 0, movement: 0, location: 0 };
  if (!sign || clips.length === 0 || frameCount(clip) < CLIP_N) return { verdict: 'not-seen', component: null, ratios: none };
  const ratios = ratiosAgainst(clip, clips);

  if (sign.type === 'static') {
    const model = models.static.find((m) => m.signId === signId);
    const hand = handShapeOfClip(clip);
    if (!model || !hand) return { verdict: 'not-seen', component: null, ratios };
    const score = staticScore(hand.shape, model.shapes);
    ratios.handshape = score / model.tau;
    ratios.movement = energy / IDLE_ENERGY;
    let nearest = signId;
    let nearestScore = score;
    for (const m of models.static) {
      const s = staticScore(hand.shape, m.shapes);
      if (s < nearestScore) [nearest, nearestScore] = [m.signId, s];
    }
    const close = score <= model.tau * sensitivity && nearest === signId && ratios.movement < 1.5;
    if (close) return { verdict: 'close', component: null, ratios };
    const component: Component = ratios.handshape > 1 || nearest !== signId ? 'handshape' : ratios.movement >= 1.5 ? 'movement' : worst(ratios);
    return { verdict: 'try-again', component, ratios, ...(nearest !== signId ? { lookedLike: nearest } : {}) };
  }

  const model = models.dynamic.find((m) => m.signalId === signId);
  const score = dynamicScore(clip, signId, models);
  const best = recogniseDynamic(clip, models, Math.max(energy, IDLE_ENERGY), sensitivity);
  const close = !!model && score <= model.tau * sensitivity && energy >= IDLE_ENERGY && (best.signalId === null || best.signalId === signId);
  if (close) return { verdict: 'close', component: null, ratios };
  if (energy < IDLE_ENERGY) return { verdict: 'try-again', component: 'movement', ratios };
  return { verdict: 'try-again', component: worst(ratios), ratios, ...(best.signalId && best.signalId !== signId ? { lookedLike: best.signalId } : {}) };
}
