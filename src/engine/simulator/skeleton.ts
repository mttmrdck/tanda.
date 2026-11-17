/**
 * Canonical front-facing upper-body skeleton for a child seated at a table, in a BODY frame:
 * origin = shoulder midpoint, unit = shoulder width, +x = image right (the subject's LEFT side in
 * un-mirrored video), +y = down. Indices follow MediaPipe Pose (33 landmarks).
 */
export type V2 = readonly [number, number];

export const UPPER_ARM = 0.8;
export const FOREARM = 0.75;

export const CANONICAL: Record<number, V2> = {
  0: [0, -0.85], // nose
  1: [0.06, -0.95],
  2: [0.1, -0.96],
  3: [0.14, -0.95],
  4: [-0.06, -0.95],
  5: [-0.1, -0.96],
  6: [-0.14, -0.95],
  7: [0.28, -0.9], // left ear
  8: [-0.28, -0.9], // right ear
  9: [0.06, -0.72],
  10: [-0.06, -0.72],
  11: [0.5, 0], // left shoulder
  12: [-0.5, 0], // right shoulder
  23: [0.3, 1.9], // left hip (below the table / frame)
  24: [-0.3, 1.9],
  25: [0.3, 2.9],
  26: [-0.3, 2.9],
  27: [0.3, 3.8],
  28: [-0.3, 3.8],
  29: [0.3, 3.9],
  30: [-0.3, 3.9],
  31: [0.35, 4.0],
  32: [-0.35, 4.0],
};

/** Resting wrist positions (forearms on the table). */
export const REST_L: V2 = [0.55, 1.35];
export const REST_R: V2 = [-0.55, 1.35];

/** Two-bone IK: elbow position for shoulder → wrist, bending outward (away from the body midline). */
export function solveElbow(s: V2, w: V2): { elbow: V2; wrist: V2 } {
  let dx = w[0] - s[0];
  let dy = w[1] - s[1];
  let d = Math.hypot(dx, dy);
  const maxD = UPPER_ARM + FOREARM - 0.01;
  const minD = 0.2;
  if (d < 1e-6) {
    dx = 0;
    dy = 1;
    d = 1;
  }
  const ux = dx / d;
  const uy = dy / d;
  const dc = Math.min(Math.max(d, minD), maxD);
  const wrist: V2 = [s[0] + ux * dc, s[1] + uy * dc];
  const cosA = (UPPER_ARM ** 2 + dc ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * dc);
  const a = Math.acos(Math.min(Math.max(cosA, -1), 1));
  const cand = (sign: number): V2 => {
    const c = Math.cos(sign * a);
    const sn = Math.sin(sign * a);
    return [s[0] + UPPER_ARM * (ux * c - uy * sn), s[1] + UPPER_ARM * (ux * sn + uy * c)];
  };
  const e1 = cand(1);
  const e2 = cand(-1);
  const outward = Math.sign(s[0]) || 1;
  const elbow = e1[0] * outward > e2[0] * outward ? e1 : e2;
  return { elbow, wrist };
}
