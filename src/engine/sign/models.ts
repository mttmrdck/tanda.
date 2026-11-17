import { classScore } from '../calibration';
import { buildModel, classify, type ClassModel } from '../classifier';
import { CLIP_N, D, MARGIN_MIN } from '../constants';
import type { Recognition } from '../types';
import { decodeTemplate, type Sign, type SignPack } from './pack';
import { buildStaticModel, classifyStatic, handShapeOfClip, type StaticModel, type StaticResult } from './staticHand';

/**
 * Matching models for one pack. Dynamic signs reuse the existing engine unchanged (time-resampled banded DTW,
 * kNN, per-class τ, confidence); static signs use the handshape classifier. Templates of the wrong size are
 * skipped (a pack made with a different feature layout cannot match this engine).
 */
export interface PackModels {
  packId: string;
  signs: Map<string, Sign>;
  clips: Map<string, Float32Array[]>;
  dynamic: ClassModel[];
  static: StaticModel[];
  /** where the signing hand's wrist was in each static template (shoulder widths, body frame) */
  staticWrist: Map<string, [number, number][]>;
}

/** A held handshape only counts near where the reference signer held it (shoulder widths). */
export const STATIC_LOCATION_MAX = 0.6;
const WRIST_SLOT = { left: 7, right: 8 } as const;

/** Mean wrist position of one side over a clip (frames where the wrist is present). */
export function wristCentroid(clip: Float32Array, side: 'left' | 'right'): [number, number] | null {
  const n = Math.floor(clip.length / D);
  let x = 0;
  let y = 0;
  let k = 0;
  for (let f = 0; f < n; f++) {
    const px = clip[f * D + 2 * WRIST_SLOT[side]]!;
    const py = clip[f * D + 2 * WRIST_SLOT[side] + 1]!;
    if (px === 0 && py === 0) continue;
    x += px;
    y += py;
    k++;
  }
  return k ? [x / k, y / k] : null;
}

export function signClips(sign: Sign): Float32Array[] {
  return sign.templates.filter((t) => t.n === CLIP_N && t.d === D).map(decodeTemplate);
}

export function buildPackModels(pack: SignPack): PackModels {
  const signs = new Map(pack.signs.map((s) => [s.id, s]));
  const clips = new Map<string, Float32Array[]>();
  const dynamic: ClassModel[] = [];
  const stat: StaticModel[] = [];
  const staticWrist = new Map<string, [number, number][]>();
  for (const s of pack.signs) {
    const cs = signClips(s);
    clips.set(s.id, cs);
    if (cs.length === 0) continue;
    if (s.type === 'dynamic') {
      // urgency/category are child-signal concepts; signs use one shared value and their own margin rule below
      dynamic.push(buildModel({ id: s.id, urgency: 'normal', category: 'request' }, cs, CLIP_N, D));
    } else {
      const hands = cs.map((c, i) => ({ c, h: handShapeOfClip(c, D, s.templates[i]?.hand) })).filter((x) => !!x.h);
      if (hands.length) stat.push(buildStaticModel(s.id, hands.map((x) => x.h!.shape)));
      staticWrist.set(
        s.id,
        hands.map((x) => wristCentroid(x.c, x.h!.side)).filter((w): w is [number, number] => !!w),
      );
    }
  }
  return { packId: pack.id, signs, clips, dynamic, static: stat, staticWrist };
}

/** Dynamic recognition with the shared classifier, plus a margin rule between any two signs. */
export function recogniseDynamic(clip: Float32Array, models: PackModels, energy: number, sensitivity = 1): Recognition {
  const r = classify(clip, models.dynamic, { n: CLIP_N, d: D, sensitivity }, energy);
  if (r.signalId && models.dynamic.length > 1 && r.margin < MARGIN_MIN) return { signalId: null, confidence: 0, distance: r.distance, margin: r.margin, reason: 'low-margin' };
  return r;
}

export function recogniseStatic(clip: Float32Array, models: PackModels, sensitivity = 1): StaticResult {
  const hand = handShapeOfClip(clip);
  if (!hand) return { signId: null, confidence: 0, distance: Infinity, margin: 0, reason: 'insufficient-data' };
  const r = classifyStatic(hand.shape, models.static, sensitivity);
  if (!r.signId) return r;
  const at = wristCentroid(clip, hand.side);
  const refs = models.staticWrist.get(r.signId) ?? [];
  const near = !at || refs.length === 0 || refs.some((w) => Math.hypot(w[0] - at[0], w[1] - at[1]) <= STATIC_LOCATION_MAX);
  return near ? r : { ...r, signId: null, confidence: 0, reason: 'unknown' };
}

export function dynamicScore(clip: Float32Array, signId: string, models: PackModels): number {
  return classScore(clip, models.clips.get(signId) ?? [], CLIP_N, D);
}
