import type { V2 } from './skeleton';

export type HandShape = 'open' | 'fist' | 'point' | 'thumbsUp';

/*
 * 21 hand landmarks in a local frame for a RIGHT hand seen palm-on: wrist at origin, fingers pointing up (−y),
 * wrist→middle-MCP distance = 1. Left hands mirror x. Order follows MediaPipe Hands:
 * 0 wrist · 1–4 thumb · 5–8 index · 9–12 middle · 13–16 ring · 17–20 pinky.
 */
const MCP: Record<string, V2> = { index: [0.32, -0.95], middle: [0.08, -1], ring: [-0.14, -0.95], pinky: [-0.34, -0.83] };
const FAN: Record<string, number> = { index: 0.12, middle: 0.03, ring: -0.06, pinky: -0.16 };

function finger(name: string, extended: boolean): V2[] {
  const m = MCP[name]!;
  const f = FAN[name]!;
  if (extended) {
    const seg = name === 'pinky' ? [0.32, 0.2, 0.16] : [0.45, 0.28, 0.22];
    const pts: V2[] = [m];
    let [x, y] = m;
    for (const s of seg) {
      x += f * s * 2;
      y -= s;
      pts.push([x, y]);
    }
    return pts;
  }
  // curled toward the palm (projected): knuckles forward, tips fold back down
  return [m, [m[0] + f * 0.3, m[1] - 0.28], [m[0] + f * 0.2, m[1] - 0.14], [m[0] + f * 0.1, m[1] + 0.04]];
}

function thumb(mode: 'open' | 'tucked' | 'up'): V2[] {
  if (mode === 'open') return [[0.3, -0.22], [0.55, -0.42], [0.72, -0.62], [0.86, -0.8]];
  if (mode === 'up') return [[0.3, -0.25], [0.42, -0.62], [0.48, -0.98], [0.52, -1.28]];
  return [[0.28, -0.22], [0.42, -0.42], [0.32, -0.6], [0.18, -0.68]];
}

export function localHand(shape: HandShape): V2[] {
  const ext = {
    open: { index: true, middle: true, ring: true, pinky: true, thumb: 'open' as const },
    fist: { index: false, middle: false, ring: false, pinky: false, thumb: 'tucked' as const },
    point: { index: true, middle: false, ring: false, pinky: false, thumb: 'tucked' as const },
    thumbsUp: { index: false, middle: false, ring: false, pinky: false, thumb: 'up' as const },
  }[shape];
  return [
    [0, 0],
    ...thumb(ext.thumb),
    ...finger('index', ext.index),
    ...finger('middle', ext.middle),
    ...finger('ring', ext.ring),
    ...finger('pinky', ext.pinky),
  ];
}

/**
 * Place a hand: `wrist` position, `scale` (wrist→middle-MCP length, same units as wrist), `angle` (radians,
 * 0 = fingers up, positive = clockwise on screen), `side` mirrors the thumb for the subject's left hand.
 */
export function placeHand(shape: HandShape, wrist: V2, scale: number, angle: number, side: 'left' | 'right'): V2[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const mx = side === 'left' ? -1 : 1;
  return localHand(shape).map(([x0, y0]) => {
    const x = x0 * mx;
    return [wrist[0] + scale * (x * c - y0 * s), wrist[1] + scale * (x * s + y0 * c)] as V2;
  });
}
