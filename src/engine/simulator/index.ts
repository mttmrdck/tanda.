import { DEFAULT_ASPECT } from '../constants';
import type { Pt, RawFrame } from '../types';
import { gestureState, type GestureName } from './gestures';
import { placeHand } from './hands';
import { createRng, type Rng } from './rng';
import { CANONICAL, solveElbow, type V2 } from './skeleton';

export { ALL_GESTURES, SHAPE_GESTURES, TEACHABLE_GESTURES, type GestureName } from './gestures';
export { createRng } from './rng';

/** Where the body sits in the image for a session/clip. */
export interface Placement {
  cx: number;
  cy: number;
  /** shoulder width in image-width units */
  sw: number;
  roll: number;
}

export const DEFAULT_PLACEMENT: Placement = { cx: 0.5, cy: 0.42, sw: 0.22, roll: 0 };

/** Hand size (wrist → middle-MCP) in shoulder widths. */
const HAND_SCALE = 0.36;
/** Probability that the simulated handedness label is wrong (MediaPipe labels are unreliable). */
const LABEL_FLIP = 0.1;

export interface RenderOptions {
  noise: number;
  dropout: number;
  aspect?: number;
}

/**
 * Render one RawFrame of `gesture` at progress `u` / time `tSec`, as MediaPipe would report it for
 * un-mirrored video (subject's right hand labelled 'Left' most of the time).
 */
export function renderFrame(
  gesture: GestureName,
  params: { u: number; tSec: number; amp: number; rate: number },
  place: Placement,
  tMs: number,
  rng: Rng,
  opts: RenderOptions,
): RawFrame {
  const aspect = opts.aspect ?? DEFAULT_ASPECT;
  const st = gestureState(gesture, { u: params.u, t: params.tSec, amp: params.amp, rate: params.rate });
  const roll = place.roll + st.torso.roll;
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  // body → image (x in width units, y in normalised height units)
  const toImg = ([bx, by]: V2): [number, number] => {
    const x = bx + st.torso.dx;
    const y = by + st.torso.dy;
    const ix = place.cx + (x * c - y * s) * place.sw;
    const iyW = place.cy / aspect + (x * s + y * c) * place.sw;
    return [ix, iyW * aspect];
  };
  // Wrists are world-anchored (not rotated with the torso) except when the torso moves them (rock/flail).
  const noisy = (p: [number, number], v: number): Pt => ({
    x: p[0] + rng.gauss() * opts.noise,
    y: p[1] + rng.gauss() * opts.noise,
    z: 0,
    v: rng.next() < opts.dropout ? 0.1 : v,
  });

  const pose: Pt[] = [];
  const ls = CANONICAL[11]!;
  const rs = CANONICAL[12]!;
  const armL = solveElbow(ls, st.left.wrist);
  const armR = solveElbow(rs, st.right.wrist);
  const body: Record<number, V2> = { ...CANONICAL, 13: armL.elbow, 14: armR.elbow, 15: armL.wrist, 16: armR.wrist };
  const handL = placeHand(st.left.shape, armL.wrist, HAND_SCALE, st.left.angle, 'left');
  const handR = placeHand(st.right.shape, armR.wrist, HAND_SCALE, st.right.angle, 'right');
  // Pose's own hand points (pinky/index/thumb) approximate from the hand model.
  body[17] = handL[17]!;
  body[18] = handR[17]!;
  body[19] = handL[5]!;
  body[20] = handR[5]!;
  body[21] = handL[2]!;
  body[22] = handR[2]!;

  for (let i = 0; i < 33; i++) {
    const p = toImg(body[i]!);
    const offscreen = p[1] > 1.02 || p[0] < -0.02 || p[0] > 1.02;
    const v = i >= 25 ? 0.05 : offscreen ? 0.2 : 0.99;
    pose.push(noisy(p, v));
  }

  const hands: RawFrame['hands'] = [];
  const addHand = (pts: V2[], subjectSide: 'left' | 'right') => {
    if (rng.next() < opts.dropout) return;
    const img = pts.map((p) => toImg(p));
    const w = img[0]!;
    if (w[0] < 0 || w[0] > 1 || w[1] < 0 || w[1] > 1) return;
    const truth: 'Left' | 'Right' = subjectSide === 'left' ? 'Right' : 'Left'; // un-mirrored → flipped label
    const label = rng.next() < LABEL_FLIP ? (truth === 'Left' ? 'Right' : 'Left') : truth;
    hands.push({ pts: img.map((p) => noisy(p, 1)), label });
  };
  addHand(handL, 'left');
  addHand(handR, 'right');
  if (rng.next() < 0.5) hands.reverse();

  const lostPose = rng.next() < opts.dropout / 4;
  return { t: tMs, pose: lostPose ? null : pose, hands, aspect };
}

export interface SimulateOptions {
  durationMs?: number;
  fps?: number;
  seed?: number;
  noise?: number;
  speed?: number;
  amplitude?: number;
  dropout?: number;
  /** randomise placement in the image (distance / position / roll) — default true */
  jitterPlacement?: boolean;
  /** time of the first frame (ms) */
  t0?: number;
}

/** Nominal duration of one performance. */
export const PERFORMANCE_MS = 2000;

/**
 * Generate a deterministic clip of one gesture. Per call: speed ±20%, amplitude ±15%, phase ±0.08,
 * placement jitter, Gaussian landmark noise and random landmark / hand dropout.
 */
export function simulateClip(gesture: GestureName, o: SimulateOptions = {}): RawFrame[] {
  const rng = createRng(o.seed ?? 1);
  const fps = o.fps ?? 15;
  const duration = o.durationMs ?? PERFORMANCE_MS;
  const speed = (o.speed ?? 1) * rng.range(0.8, 1.2);
  const amp = (o.amplitude ?? 1) * rng.range(0.85, 1.15);
  const phase = rng.range(-0.08, 0.08);
  const rate = rng.range(0.9, 1.1);
  const jitter = o.jitterPlacement ?? true;
  const place: Placement = jitter
    ? {
        cx: 0.5 + rng.range(-0.05, 0.05),
        cy: 0.42 + rng.range(-0.03, 0.03),
        sw: 0.22 * rng.range(0.88, 1.12),
        roll: rng.range(-0.06, 0.06),
      }
    : DEFAULT_PLACEMENT;
  const frames: RawFrame[] = [];
  const step = 1000 / fps;
  const t0 = o.t0 ?? 0;
  for (let i = 0; i * step <= duration + 1e-6; i++) {
    const ms = i * step;
    const u = (ms / PERFORMANCE_MS) * speed + phase;
    frames.push(
      renderFrame(gesture, { u, tSec: (ms / 1000) * speed, amp, rate }, place, Math.round(t0 + ms), rng, {
        noise: o.noise ?? 0.006,
        dropout: o.dropout ?? 0.02,
      }),
    );
  }
  return frames;
}
