import { classScore } from '../calibration';
import { CLIP_N, D, IDLE_ENERGY } from '../constants';
import { STATIC_LOCATION_MAX, wristCentroid, type PackModels } from '../sign/models';
import { handFraction } from '../sign/quality';
import { handShapeOfClip, staticScore } from '../sign/staticHand';

/**
 * Word-level candidates for one captured sign, matched ONLY against a sign pack's models. Each sign is scored
 * against its own rejection threshold τ (ratio = distance ÷ τ·sensitivity); only signs within their threshold
 * are candidates, best first. No candidate → "not sure". Nothing is ever forced.
 */
export interface Candidate {
  signId: string;
  /** 0..1, same curve as the rest of the engine: 1 / (1 + ratio³) */
  confidence: number;
  ratio: number;
  kind: 'static' | 'dynamic';
}

export interface Window {
  clip: Float32Array | null;
  energy: number;
}

export interface RankResult {
  candidates: Candidate[];
  notSure: boolean;
  /** 'no-hands': the hands were not clearly in view — ask the person to move */
  quality: 'ok' | 'no-hands';
}

export interface RankOptions {
  k?: number;
  sensitivity?: number;
  /** restrict to some signs (e.g. the alphabet in fingerspelling) */
  only?: ReadonlySet<string>;
}

/** Held handshapes must be held: window energy below this. */
export const HELD_ENERGY_MAX = IDLE_ENERGY * 1.5;

export function rankCandidates(move: Window, held: Window, models: PackModels, opts: RankOptions = {}): RankResult {
  const k = opts.k ?? 3;
  const sens = opts.sensitivity ?? 1;
  const allowed = (id: string) => !opts.only || opts.only.has(id);
  const out: Candidate[] = [];

  if (move.clip && move.energy >= IDLE_ENERGY) {
    for (const m of models.dynamic) {
      if (!allowed(m.signalId)) continue;
      const ratio = classScore(move.clip, m.examples, CLIP_N, D) / (m.tau * sens);
      if (ratio <= 1) out.push({ signId: m.signalId, ratio, confidence: 1 / (1 + ratio ** 3), kind: 'dynamic' });
    }
  }
  const hand = held.clip && held.energy < HELD_ENERGY_MAX ? handShapeOfClip(held.clip) : null;
  if (hand && held.clip) {
    const at = wristCentroid(held.clip, hand.side);
    for (const m of models.static) {
      if (!allowed(m.signId)) continue;
      const refs = models.staticWrist.get(m.signId) ?? [];
      if (at && refs.length && !refs.some((w) => Math.hypot(w[0] - at[0], w[1] - at[1]) <= STATIC_LOCATION_MAX)) continue;
      const ratio = staticScore(hand.shape, m.shapes) / (m.tau * sens);
      if (ratio <= 1) out.push({ signId: m.signId, ratio, confidence: 1 / (1 + ratio ** 3), kind: 'static' });
    }
  }
  out.sort((a, b) => a.ratio - b.ratio);
  const noHands = !hand && (!move.clip || handFraction(move.clip) < 0.5) && (!held.clip || handFraction(held.clip) < 0.5);
  const candidates = out.slice(0, k);
  return { candidates, notSure: candidates.length === 0, quality: noHands ? 'no-hands' : 'ok' };
}
