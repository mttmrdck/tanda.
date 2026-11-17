import { HAND_RESET_MS, ONE_EURO, POINT_VIS_MIN } from './constants';
import { extractFeatures } from './features';
import { assignHands } from './handMatching';
import { PointFilterBank, type OneEuroParams } from './oneEuro';
import type { FeatureFrame, Pt, RawFrame, SlottedFrame } from './types';

/**
 * Per-stream processing chain shared by camera and demo sources:
 * RawFrame → hand-slot assignment → short-dropout hold → 1€ smoothing (per landmark, per axis) → 108-D FeatureFrame.
 *
 * Hold: a hand or pose landmark that disappears for ≤ HAND_RESET_MS keeps its last smoothed position, so a single
 * dropped detection does not snap coordinates to zero (which would dominate DTW distance and motion energy).
 */
export class FrameProcessor {
  private readonly pose: PointFilterBank;
  private readonly hands: { left: PointFilterBank; right: PointFilterBank };
  private lastSeen = { left: -Infinity, right: -Infinity };
  private lastHand: { left: Pt[] | null; right: Pt[] | null } = { left: null, right: null };
  private poseSeen = -Infinity;
  private lastPose: Pt[] | null = null;
  private pointSeen = new Float64Array(33).fill(-Infinity);

  constructor(params: OneEuroParams = ONE_EURO) {
    this.pose = new PointFilterBank(33, params);
    this.hands = { left: new PointFilterBank(21, params), right: new PointFilterBank(21, params) };
  }

  reset(): void {
    this.pose.reset();
    this.hands.left.reset();
    this.hands.right.reset();
    this.lastSeen = { left: -Infinity, right: -Infinity };
    this.lastHand = { left: null, right: null };
    this.poseSeen = -Infinity;
    this.lastPose = null;
    this.pointSeen.fill(-Infinity);
  }

  /** Smoothed, slotted frame (useful for overlays and Calm Watch). */
  smooth(raw: RawFrame): SlottedFrame {
    const s = assignHands(raw);
    let pose: Pt[] | null = null;
    if (s.pose) {
      if (raw.t - this.poseSeen > HAND_RESET_MS) {
        this.pose.reset();
        this.lastPose = null;
        this.pointSeen.fill(-Infinity);
      }
      this.poseSeen = raw.t;
      const prev = this.lastPose;
      const input = s.pose.map((p, i) => {
        if ((p.v ?? 1) >= POINT_VIS_MIN) {
          this.pointSeen[i] = raw.t;
          return p;
        }
        const held = prev?.[i];
        return held && raw.t - this.pointSeen[i]! <= HAND_RESET_MS ? { ...held } : p;
      });
      pose = this.pose.apply(input, raw.t);
      this.lastPose = pose;
    } else if (this.lastPose && raw.t - this.poseSeen <= HAND_RESET_MS) {
      pose = this.lastPose;
    }
    const side = (k: 'left' | 'right'): Pt[] | null => {
      const pts = s[k];
      if (!pts) {
        // short dropout → hold the last smoothed hand
        return this.lastHand[k] && raw.t - this.lastSeen[k] <= HAND_RESET_MS ? this.lastHand[k] : null;
      }
      if (raw.t - this.lastSeen[k] > HAND_RESET_MS) this.hands[k].reset();
      this.lastSeen[k] = raw.t;
      const out = this.hands[k].apply(pts, raw.t);
      this.lastHand[k] = out;
      return out;
    };
    return { t: raw.t, pose, left: side('left'), right: side('right'), aspect: s.aspect };
  }

  process(raw: RawFrame): { slotted: SlottedFrame; features: FeatureFrame } {
    const slotted = this.smooth(raw);
    return { slotted, features: extractFeatures(slotted) };
  }
}

/** Convenience: run a whole clip through a fresh processor. */
export function clipFeatures(frames: readonly RawFrame[]): FeatureFrame[] {
  const p = new FrameProcessor();
  return frames.map((f) => p.process(f).features);
}
