import { DEFAULT_ASPECT, L_WRIST, R_WRIST } from './constants';
import type { Pt, RawFrame, SlottedFrame } from './types';

/** Max wrist-to-wrist distance (normalised image units) for proximity matching. */
export const MATCH_MAX_DIST = 0.15;

/**
 * Assign detected hands to the subject's left / right slot.
 * 1. Greedy nearest match of each hand's wrist (landmark 0) to pose wrists 15 (left) / 16 (right), if < 0.15.
 * 2. Otherwise fall back to the handedness label. MediaPipe's label assumes a mirrored (selfie) image; our
 *    data is un-mirrored, so by default 'Left' means the subject's right hand. Pass `mirroredInput` if the
 *    frames were mirrored before inference.
 * 3. Otherwise drop the hand. Never assigns two hands to one slot.
 */
export function assignHands(frame: RawFrame, mirroredInput = false): SlottedFrame {
  const out: SlottedFrame = { t: frame.t, pose: frame.pose, left: null, right: null, aspect: frame.aspect ?? DEFAULT_ASPECT };
  if (frame.hands.length === 0) return out;

  const poseWrists: { slot: 'left' | 'right'; p: Pt }[] = [];
  if (frame.pose) {
    const lw = frame.pose[L_WRIST];
    const rw = frame.pose[R_WRIST];
    if (lw && (lw.v ?? 1) >= 0.1) poseWrists.push({ slot: 'left', p: lw });
    if (rw && (rw.v ?? 1) >= 0.1) poseWrists.push({ slot: 'right', p: rw });
  }

  // All (hand, wrist) pairs sorted by distance → greedy assignment.
  const pairs: { h: number; slot: 'left' | 'right'; d: number }[] = [];
  frame.hands.forEach((hand, h) => {
    const w = hand.pts[0];
    if (!w) return;
    for (const pw of poseWrists) pairs.push({ h, slot: pw.slot, d: Math.hypot(w.x - pw.p.x, w.y - pw.p.y) });
  });
  pairs.sort((a, b) => a.d - b.d);

  const usedHand = new Set<number>();
  for (const pr of pairs) {
    if (pr.d >= MATCH_MAX_DIST || usedHand.has(pr.h) || out[pr.slot]) continue;
    out[pr.slot] = frame.hands[pr.h]!.pts;
    usedHand.add(pr.h);
  }

  frame.hands.forEach((hand, h) => {
    if (usedHand.has(h) || !hand.label) return;
    const subjectLeft = mirroredInput ? hand.label === 'Left' : hand.label === 'Right';
    const slot = subjectLeft ? 'left' : 'right';
    if (!out[slot]) {
      out[slot] = hand.pts;
      usedHand.add(h);
    }
  });
  return out;
}
