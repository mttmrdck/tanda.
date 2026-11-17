import type { HandShape } from './hands';
import { REST_L, REST_R, type V2 } from './skeleton';

/**
 * Gestures as pure functions of time. Body-frame units (shoulder widths, +x = image right = subject's left).
 * `u` = normalised progress through one performance (nominal 2 s), `t` = seconds, `amp` scales deviations.
 *
 * | gesture      | what the performer does                                                   | used for          |
 * |--------------|---------------------------------------------------------------------------|-------------------|
 * | idle         | forearms resting on the table, slight breathing                           | rejection, calm   |
 * | wave         | right hand raised beside the head, side-to-side at ~2 Hz, open hand       | teach / recognise |
 * | handToMouth  | right fist travels to the mouth, holds, returns                           | teach / recognise |
 * | coverEars    | both open hands to the ears, hold, return                                 | teach / recognise |
 * | armsUp       | both arms straight up above the head, hold, return                        | teach / recognise |
 * | pointRight   | right arm extends to the subject's right, index finger pointing           | teach / recognise |
 * | tapTable     | right fist lifts and drops onto the table twice                           | teach / recognise |
 * | rock         | whole upper body sways side to side at ~1 Hz, hands in the lap            | Calm Watch        |
 * | flap         | both open hands at chest height flapping up and down at ~3 Hz             | Calm Watch        |
 * | flail        | large, irregular arm and torso movement (multi-sine, test helper)         | Calm Watch tests  |
 */
export type GestureName =
  | 'idle'
  | 'wave'
  | 'handToMouth'
  | 'coverEars'
  | 'armsUp'
  | 'pointRight'
  | 'tapTable'
  | 'rock'
  | 'flap'
  | 'flail';

export const TEACHABLE_GESTURES: GestureName[] = ['wave', 'handToMouth', 'coverEars', 'armsUp', 'pointRight', 'tapTable'];
export const ALL_GESTURES: GestureName[] = [...TEACHABLE_GESTURES, 'idle', 'rock', 'flap'];

export interface HandState {
  wrist: V2;
  shape: HandShape;
  angle: number;
}

export interface GestureState {
  left: HandState;
  right: HandState;
  /** torso offset (body units) and roll (radians) */
  torso: { dx: number; dy: number; roll: number };
}

export interface GestureParams {
  /** progress through the performance: 0..1 (values outside → at rest) */
  u: number;
  /** seconds since start (for periodic motion) */
  t: number;
  amp: number;
  /** rate multiplier for periodic motion */
  rate: number;
}

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};
/** envelope: rise over [0.05, 0.3], hold, fall over [0.7, 0.95] */
const env = (u: number) => smooth((u - 0.05) / 0.25) * (1 - smooth((u - 0.7) / 0.25));
const mix = (a: V2, b: V2, k: number): V2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const bump = (u: number, a: number, b: number) => (u <= a || u >= b ? 0 : Math.sin((Math.PI * (u - a)) / (b - a)));

const rest = (shape: HandShape = 'open'): GestureState => ({
  left: { wrist: REST_L, shape, angle: -0.35 },
  right: { wrist: REST_R, shape, angle: 0.35 },
  torso: { dx: 0, dy: 0, roll: 0 },
});

/** Scale a target's deviation from rest by amplitude. */
const toward = (from: V2, to: V2, k: number, amp: number): V2 => mix(from, to, k * amp);

export function gestureState(name: GestureName, p: GestureParams): GestureState {
  const s = rest();
  const { u, t, amp, rate } = p;
  const k = env(u);
  const breath = 0.015 * Math.sin(2 * Math.PI * 0.25 * t);
  switch (name) {
    case 'idle':
      s.torso.dy = breath;
      return s;
    case 'wave': {
      const target: V2 = [-0.95 + 0.28 * amp * Math.sin(2 * Math.PI * 2 * rate * t), -0.7];
      s.right = { wrist: toward(REST_R, target, k, 1), shape: 'open', angle: k * 0.3 * Math.sin(2 * Math.PI * 2 * rate * t) };
      return s;
    }
    case 'handToMouth':
      s.right = { wrist: toward(REST_R, [-0.12, -0.55], k, amp), shape: 'fist', angle: 0.35 + 0.4 * k };
      return s;
    case 'coverEars':
      s.left = { wrist: toward(REST_L, [0.42, -0.75], k, amp), shape: 'open', angle: -0.35 + 0.15 * k };
      s.right = { wrist: toward(REST_R, [-0.42, -0.75], k, amp), shape: 'open', angle: 0.35 - 0.15 * k };
      return s;
    case 'armsUp':
      s.left = { wrist: toward(REST_L, [0.65, -1.75], k, amp), shape: 'open', angle: -0.35 + 0.25 * k };
      s.right = { wrist: toward(REST_R, [-0.65, -1.75], k, amp), shape: 'open', angle: 0.35 - 0.25 * k };
      return s;
    case 'pointRight':
      s.right = { wrist: toward(REST_R, [-1.7, -0.15], k, amp), shape: k > 0.4 ? 'point' : 'fist', angle: 0.35 - (Math.PI / 2 + 0.35) * k };
      return s;
    case 'tapTable': {
      const lift = 0.5 * amp * (bump(u, 0.12, 0.42) + bump(u, 0.5, 0.8));
      s.right = { wrist: [REST_R[0] + 0.15, REST_R[1] - lift], shape: 'fist', angle: 0.2 };
      return s;
    }
    case 'rock': {
      const ph = 2 * Math.PI * 1 * rate * t;
      s.torso = { dx: 0.2 * amp * Math.sin(ph), dy: 0.03 * amp * Math.sin(2 * ph), roll: 0.06 * amp * Math.sin(ph) };
      s.left = { wrist: [0.25, 0.95], shape: 'fist', angle: -0.9 };
      s.right = { wrist: [-0.25, 0.95], shape: 'fist', angle: 0.9 };
      return s;
    }
    case 'flap': {
      const ph = 2 * Math.PI * 3 * rate * t;
      const y = 0.3 + 0.28 * amp * Math.sin(ph);
      s.left = { wrist: [0.95, y], shape: 'open', angle: -0.6 + 0.4 * Math.sin(ph) };
      s.right = { wrist: [-0.95, y], shape: 'open', angle: 0.6 - 0.4 * Math.sin(ph) };
      return s;
    }
    case 'flail': {
      const w = (f: number, ph: number) => Math.sin(2 * Math.PI * f * rate * t + ph);
      s.left = { wrist: [0.9 + 0.6 * amp * w(1.7, 0.3), 0.2 + 0.9 * amp * w(2.3, 1.1)], shape: 'open', angle: w(2.9, 0) };
      s.right = { wrist: [-0.9 + 0.6 * amp * w(1.9, 2.0), 0.2 + 0.9 * amp * w(2.6, 0.4)], shape: 'open', angle: w(3.1, 1) };
      s.torso = { dx: 0.25 * amp * w(1.3, 0.7), dy: 0.08 * amp * w(2.1, 0.2), roll: 0.12 * amp * w(1.1, 0.5) };
      return s;
    }
  }
}
