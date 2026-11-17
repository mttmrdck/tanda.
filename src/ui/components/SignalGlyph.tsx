import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { D, D_HAND, RANGE_HAND_L, RANGE_HAND_R, RANGE_PRESENCE } from '../../engine/constants';

/** Feature-slot order of POSE_IDX: nose, L ear, R ear, L sh, R sh, L el, R el, L wr, R wr, L hip, R hip */
export const BONES: [number, number][] = [
  [3, 4],
  [3, 5],
  [5, 7],
  [4, 6],
  [6, 8],
  [3, 9],
  [4, 10],
];
const HAND_BONES: [number, number][] = [
  [0, 4], [0, 8], [0, 12], [0, 16], [0, 20],
];
/** palm length in shoulder widths, for drawing hand shapes at the wrists */
export const PALM = 0.36;
const FRAME_MS = 125;

export interface Frame {
  pts: ([number, number] | null)[];
  hands: ([number, number][] | null)[];
}

export function decode(data: Float32Array, n: number): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * D;
    const pts: ([number, number] | null)[] = [];
    for (let k = 0; k < 11; k++) {
      const x = data[o + 2 * k]!;
      const y = data[o + 2 * k + 1]!;
      pts.push(x === 0 && y === 0 && k !== 0 ? null : [x, y]);
    }
    const hands: ([number, number][] | null)[] = [RANGE_HAND_L[0], RANGE_HAND_R[0]].map((h0, side) => {
      const present = data[o + RANGE_PRESENCE[0] + side]! >= 0.5;
      const wrist = pts[side === 0 ? 7 : 8];
      if (!present || !wrist) return null;
      const out: [number, number][] = [];
      for (let j = 0; j < D_HAND / 2; j++) out.push([wrist[0] + data[o + h0 + 2 * j]! * PALM, wrist[1] + data[o + h0 + 2 * j + 1]! * PALM]);
      return out;
    });
    frames.push({ pts, hands });
  }
  return frames;
}

/** Index of the most expressive frame (wrists furthest from their mean position) for the static view. */
function keyFrame(frames: Frame[]): number {
  let best = Math.floor(frames.length / 2);
  let bestD = -1;
  const mean = [7, 8].map((k) => {
    const v = frames.map((f) => f.pts[k]).filter((p): p is [number, number] => !!p);
    return v.length ? [v.reduce((a, p) => a + p[0], 0) / v.length, v.reduce((a, p) => a + p[1], 0) / v.length] : [0, 0];
  });
  frames.forEach((f, i) => {
    let d = 0;
    [7, 8].forEach((k, j) => {
      const p = f.pts[k];
      if (p) d += Math.hypot(p[0] - mean[j]![0]!, p[1] - mean[j]![1]!);
    });
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * Animated stick-figure replay of a stored example (the app stores no video, so this is how a signal "looks").
 * Mirrored like the camera preview. Static when not playing or when reduced motion is preferred.
 */
export function SignalGlyph({ data, n, playing, label, size = 'md' }: { data: Float32Array; n: number; playing: boolean; label: string; size?: 'sm' | 'md' }) {
  const frames = useMemo(() => decode(data, n), [data, n]);
  const still = useMemo(() => keyFrame(frames), [frames]);
  const reduce = useReducedMotion();
  const [i, setI] = useState(still);
  const animate = playing && !reduce;

  useEffect(() => {
    if (!animate) return;
    let k = 0;
    setI(0);
    const id = setInterval(() => {
      k = (k + 1) % (frames.length + 4); // short pause at the end of each loop
      setI(Math.min(k, frames.length - 1));
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [animate, frames.length]);

  const f = frames[animate ? i : still] ?? frames[0];
  if (!f) return null;
  const head = f.pts[0];
  return (
    <svg role="img" aria-label={label} viewBox="-2.3 -2.4 4.6 4.3" className={size === 'sm' ? 'h-20 w-auto' : 'h-32 w-auto'}>
      <g transform="scale(-1 1)" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="-2.2" x2="2.2" y1="1.55" y2="1.55" stroke="var(--border-soft)" strokeWidth="0.05" />
        {BONES.map(([a, b]) => {
          const pa = f.pts[a];
          const pb = f.pts[b];
          return pa && pb ? <line key={`${a}-${b}`} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke="var(--ink)" strokeWidth="0.11" /> : null;
        })}
        {head && <circle cx={head[0]} cy={head[1] - 0.05} r="0.3" stroke="var(--ink)" strokeWidth="0.1" fill="var(--surface)" />}
        {f.hands.map((h, s) =>
          h ? (
            <g key={s}>
              {HAND_BONES.map(([a, b]) => (
                <line key={b} x1={h[a]![0]} y1={h[a]![1]} x2={h[b]![0]} y2={h[b]![1]} stroke="var(--primary)" strokeWidth="0.06" />
              ))}
            </g>
          ) : null,
        )}
      </g>
    </svg>
  );
}
