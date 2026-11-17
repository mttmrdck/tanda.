import {
  D,
  D_HAND,
  D_POSE,
  HIP_IDX,
  L_SHOULDER,
  MIN_SCALE,
  POINT_VIS_MIN,
  POSE_IDX,
  R_SHOULDER,
  RANGE_HAND_L,
  RANGE_HAND_R,
  RANGE_PRESENCE,
  SHOULDER_VIS_MIN,
} from './constants';
import type { FeatureFrame, Pt, SlottedFrame } from './types';

export { D, D_HAND, D_POSE };

export interface BodyFrame {
  ox: number;
  oy: number;
  cos: number;
  sin: number;
  scale: number;
}

/**
 * Body-normalisation frame: origin at shoulder midpoint, rotation that makes the shoulder line horizontal,
 * scale = shoulder width (≥ MIN_SCALE). Coordinates are aspect-corrected (y converted to width units).
 * Returns null when the shoulders are not both visible (≥ 0.5).
 */
export function bodyFrame(pose: readonly Pt[], aspect: number): BodyFrame | null {
  const l = pose[L_SHOULDER];
  const r = pose[R_SHOULDER];
  if (!l || !r || (l.v ?? 1) < SHOULDER_VIS_MIN || (r.v ?? 1) < SHOULDER_VIS_MIN) return null;
  const lx = l.x;
  const ly = l.y / aspect;
  const rx = r.x;
  const ry = r.y / aspect;
  // Subject's left shoulder appears on the image right in un-mirrored video, so (l - r) points to +x.
  const vx = lx - rx;
  const vy = ly - ry;
  const ang = Math.atan2(vy, vx);
  return {
    ox: (lx + rx) / 2,
    oy: (ly + ry) / 2,
    cos: Math.cos(-ang),
    sin: Math.sin(-ang),
    scale: Math.max(Math.hypot(vx, vy), MIN_SCALE),
  };
}

/** Write the 108-D feature vector for one slotted frame into `out`. Returns validity. */
export function extractInto(frame: SlottedFrame, out: Float32Array): boolean {
  out.fill(0);
  if (!frame.pose) return false;
  const bf = bodyFrame(frame.pose, frame.aspect);
  if (!bf) return false;
  const a = frame.aspect;

  POSE_IDX.forEach((idx, k) => {
    const p = frame.pose![idx];
    if (!p || (p.v ?? 1) < POINT_VIS_MIN) return; // zeroed (hips: treated as absent)
    if (HIP_IDX.has(idx) && (p.v ?? 1) < POINT_VIS_MIN) return;
    const dx = p.x - bf.ox;
    const dy = p.y / a - bf.oy;
    out[2 * k] = (dx * bf.cos - dy * bf.sin) / bf.scale;
    out[2 * k + 1] = (dx * bf.sin + dy * bf.cos) / bf.scale;
  });

  writeHand(frame.left, a, bf, out, RANGE_HAND_L[0]);
  writeHand(frame.right, a, bf, out, RANGE_HAND_R[0]);
  out[RANGE_PRESENCE[0]] = frame.left ? 1 : 0;
  out[RANGE_PRESENCE[0] + 1] = frame.right ? 1 : 0;
  return true;
}

function writeHand(pts: readonly Pt[] | null, a: number, bf: BodyFrame, out: Float32Array, offset: number): void {
  if (!pts || pts.length < 21) return;
  const w = pts[0]!;
  const m = pts[9]!;
  const hs = Math.max(Math.hypot(m.x - w.x, (m.y - w.y) / a), 1e-3);
  for (let i = 0; i < 21; i++) {
    const p = pts[i]!;
    const dx = p.x - w.x;
    const dy = (p.y - w.y) / a;
    out[offset + 2 * i] = (dx * bf.cos - dy * bf.sin) / hs;
    out[offset + 2 * i + 1] = (dx * bf.sin + dy * bf.cos) / hs;
  }
}

export function extractFeatures(frame: SlottedFrame): FeatureFrame {
  const v = new Float32Array(D);
  const valid = extractInto(frame, v);
  return { t: frame.t, v, valid };
}
