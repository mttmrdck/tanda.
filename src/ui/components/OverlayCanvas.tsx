import { useEffect, useRef } from 'react';
import type { Pt, SlottedFrame } from '../../engine/types';
import { session } from '../../store/useSession';

const BONES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [7, 0],
  [0, 8],
];
const POINTS = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24];
const HAND_BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#0B6E6E';
}

/**
 * Draws the tracked pose points, bones and hands over the stage. `figure` = draw the demo performer as the
 * picture itself (paper background, table edge). Nothing is drawn for an invalid frame. Never persists pixels.
 */
export function OverlayCanvas({ figure, skeleton }: { figure: boolean; skeleton: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef<{ f: SlottedFrame; valid: boolean } | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let dirty = true;
    const unsub = session.subscribeFrame((f, valid) => {
      latest.current = { f, valid };
      dirty = true;
    });

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!dirty) return;
      dirty = false;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const ink = cssVar('--ink');
      const primary = cssVar('--primary');
      const paper = cssVar('--surface-2');
      const muted = cssVar('--border');
      if (figure) {
        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = muted;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, H * 0.86, W, H * 0.14);
        ctx.globalAlpha = 1;
      }
      const cur = latest.current;
      if (!cur || !cur.valid || !cur.f.pose) return;
      if (!figure && !skeleton) return;
      // contain-fit of the frame's aspect into the canvas
      const fa = cur.f.aspect;
      const ca = W / H;
      const w = ca > fa ? H * fa : W;
      const h = ca > fa ? H : W / fa;
      const ox = (W - w) / 2;
      const oy = (H - h) / 2;
      const P = (p: Pt) => [ox + p.x * w, oy + p.y * h] as const;
      const vis = (p: Pt | undefined): p is Pt => !!p && (p.v ?? 1) >= 0.3;
      const unit = Math.max(2, w / 160);

      const pose = cur.f.pose;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = figure ? ink : primary;
      ctx.lineWidth = figure ? unit * 2.2 : unit * 1.2;
      for (const [a, b] of BONES) {
        const pa = pose[a];
        const pb = pose[b];
        if (!vis(pa) || !vis(pb)) continue;
        ctx.beginPath();
        ctx.moveTo(...P(pa));
        ctx.lineTo(...P(pb));
        ctx.stroke();
      }
      if (figure && vis(pose[0]) && vis(pose[11]) && vis(pose[12])) {
        // head
        const sw = Math.hypot((pose[11].x - pose[12].x) * w, (pose[11].y - pose[12].y) * h);
        const [hx, hy] = P(pose[0]);
        ctx.beginPath();
        ctx.arc(hx, hy - sw * 0.05, sw * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = paper;
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = figure ? ink : primary;
      for (const i of POINTS) {
        const p = pose[i];
        if (!vis(p) || (figure && i <= 8)) continue;
        const [x, y] = P(p);
        ctx.beginPath();
        ctx.arc(x, y, unit * (figure ? 1.4 : 1.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = figure ? primary : ink;
      ctx.lineWidth = unit * (figure ? 1.1 : 0.8);
      for (const hand of [cur.f.left, cur.f.right]) {
        if (!hand) continue;
        for (const [a, b] of HAND_BONES) {
          ctx.beginPath();
          ctx.moveTo(...P(hand[a]!));
          ctx.lineTo(...P(hand[b]!));
          ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
    };
  }, [figure, skeleton]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
