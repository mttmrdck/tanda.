import { useEffect, useRef, useState } from 'react';
import { CLIP_N, D, MAX_INVALID_FRACTION } from '../../engine/constants';
import { heldWindow, MOVE_MS } from '../../engine/sign/window';
import { bestSubWindow, featureMotionEnergy } from '../../engine/motion';
import { resampleClip } from '../../engine/resample';
import type { GestureName } from '../../engine/simulator';
import { session } from '../../store/useSession';

export const CAPTURE_MS = 2500;

export interface Window {
  /** resampled window, or null when too many frames were invalid */
  clip: Float32Array | null;
  energy: number;
}

/** A capture seen two ways: the busiest 2 s (movement signs) and the held 1 s window (handshapes). */
export interface Captured extends Window {
  still: Window;
}

/** The window a sign of this type is judged on. */
export const windowFor = (c: Captured, type: 'static' | 'dynamic'): Window => (type === 'static' ? c.still : c);

/** 3-2-1 countdown, then capture processed frames (same processing as Teach). */
export function useSignCapture() {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'recording'>('idle');
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const alive = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    alive.current = true;
    const list = timers.current;
    return () => {
      alive.current = false;
      list.forEach(clearTimeout);
    };
  }, []);
  const wait = (ms: number) => new Promise<void>((r) => timers.current.push(setTimeout(r, ms)));

  const capture = async (performer: GestureName | null): Promise<Captured | null> => {
    setPhase('countdown');
    for (const n of [3, 2, 1]) {
      setCount(n);
      await wait(1000);
      if (!alive.current) return null;
    }
    setPhase('recording');
    setProgress(0);
    if (performer) session.performDemo(performer);
    const started = performance.now();
    const tick = setInterval(() => setProgress(Math.min((performance.now() - started) / CAPTURE_MS, 1)), 100);
    const res = await session.capture(CAPTURE_MS);
    clearInterval(tick);
    if (!alive.current) return null;
    setPhase('idle');
    const ok = res.invalidFraction <= MAX_INVALID_FRACTION;
    const win = bestSubWindow(res.frames, MOVE_MS);
    const still = heldWindow(res.frames);
    return {
      clip: ok ? resampleClip(win, CLIP_N, D) : null,
      energy: featureMotionEnergy(win),
      still: { clip: ok ? resampleClip(still, CLIP_N, D) : null, energy: featureMotionEnergy(still) },
    };
  };
  return { phase, count, progress, busy: phase !== 'idle', capture };
}
