import { useEffect, useRef, useState } from 'react';
import { CLIP_N, D } from '../../../engine/constants';
import { bestSubWindow, featureMotionEnergy } from '../../../engine/motion';
import { resampleClip } from '../../../engine/resample';
import { heldWindow, MOVE_MS } from '../../../engine/sign/window';
import type { GestureName } from '../../../engine/simulator';
import type { FeatureFrame } from '../../../engine/types';
import type { Window } from '../../../engine/translate/candidates';
import { translateSession } from '../../../store/translateSession';

export const CAPTURE_MS = 2500;

/** The two views of a capture used for matching: busiest 2 s (movement) and the held 1 s (handshape). */
export function windowsOf(frames: readonly FeatureFrame[]): { move: Window; held: Window } {
  const mv = bestSubWindow(frames, MOVE_MS);
  const hd = heldWindow(frames);
  return {
    move: { clip: resampleClip(mv, CLIP_N, D), energy: featureMotionEnergy(mv) },
    held: { clip: resampleClip(hd, CLIP_N, D), energy: featureMotionEnergy(hd) },
  };
}

/** 3-2-1, then capture one sign with Translate's own session. `endedAt` = when the sign window closed. */
export function useTranslateCapture() {
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

  const capture = async (performer: GestureName | null): Promise<{ frames: FeatureFrame[]; endedAt: number } | null> => {
    setPhase('countdown');
    for (const n of [3, 2, 1]) {
      setCount(n);
      await wait(1000);
      if (!alive.current) return null;
    }
    setPhase('recording');
    setProgress(0);
    if (performer) translateSession.performDemo(performer);
    const started = performance.now();
    const tick = setInterval(() => setProgress(Math.min((performance.now() - started) / CAPTURE_MS, 1)), 100);
    const frames = await translateSession.capture(CAPTURE_MS);
    const endedAt = performance.now();
    clearInterval(tick);
    if (!alive.current) return null;
    setPhase('idle');
    return { frames, endedAt };
  };
  return { phase, count, progress, busy: phase !== 'idle', capture };
}
