import { RANGE_PRESENCE } from '../constants';
import { featureMotionEnergy, stillestSubWindow } from '../motion';
import type { FeatureFrame } from '../types';

/** Held handshapes are judged on a 1 s window; movement signs on the busiest 2 s. */
export const STILL_MS = 1000;
export const MOVE_MS = 2000;

const WRIST_Y = [2 * 7 + 1, 2 * 8 + 1] as const;

/** Height of the higher wrist (smaller y = higher), or null when neither wrist is present. */
function topWrist(f: FeatureFrame): number | null {
  let top: number | null = null;
  for (const i of WRIST_Y) {
    const y = f.v[i]!;
    if (y === 0 && f.v[i - 1] === 0) continue;
    top = top === null ? y : Math.min(top, y);
  }
  return top;
}

/**
 * The window a held handshape is shown in: among windows where a hand is in view (≥ 80 % of frames) and the
 * hands are in their raised half for this capture, the stillest one. A signer who starts at rest and raises
 * the hand late is therefore judged on the held shape, not on the resting hand. Falls back to the stillest
 * window overall.
 */
export function heldWindow(frames: readonly FeatureFrame[], windowMs = STILL_MS, stepMs = 100): FeatureFrame[] {
  const valid = frames.filter((f) => f.valid);
  if (valid.length === 0) return [];
  const t0 = valid[0]!.t;
  const tEnd = valid[valid.length - 1]!.t;
  if (tEnd - t0 <= windowMs) return valid;
  const cands: { win: FeatureFrame[]; top: number; energy: number }[] = [];
  for (let s = t0; s + windowMs <= tEnd + 1; s += stepMs) {
    const win = valid.filter((f) => f.t >= s && f.t <= s + windowMs);
    if (win.length < 4) continue;
    const handed = win.filter((f) => f.v[RANGE_PRESENCE[0]] === 1 || f.v[RANGE_PRESENCE[0] + 1] === 1).length;
    if (handed < win.length * 0.8) continue;
    const tops = win.map(topWrist).filter((y): y is number => y !== null);
    if (tops.length === 0) continue;
    cands.push({ win, top: tops.reduce((a, b) => a + b, 0) / tops.length, energy: featureMotionEnergy(win) });
  }
  if (cands.length === 0) return stillestSubWindow(valid, windowMs, stepMs);
  const sorted = cands.map((c) => c.top).sort((a, b) => a - b);
  const cut = sorted[Math.floor((sorted.length - 1) / 2)]!;
  return cands.filter((c) => c.top <= cut + 1e-6).reduce((a, b) => (b.energy < a.energy ? b : a)).win;
}
