import type { HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { Pt, RawFrame } from '../engine/types';
import type { Landmarkers } from './loader';

/** fps steps used when adapting to slow devices (never below 8) */
export const FPS_STEPS = [30, 20, 15, 10, 8] as const;
const SLOW_MS = 60;
const RECOVER_MS = 35;
const RECOVER_AFTER_MS = 4000;
const MAX_FAILURES = 5;

export interface PipelineStats {
  fps: number;
  targetFps: number;
  inferenceMs: number;
  lowPower: boolean;
}

/** Copy MediaPipe results into our own plain objects immediately (never retain result objects). */
export function toRawFrame(t: number, pose: PoseLandmarkerResult, hands: HandLandmarkerResult, aspect: number): RawFrame {
  const p = pose.landmarks[0];
  const posePts: Pt[] | null = p ? p.map((l) => ({ x: l.x, y: l.y, z: l.z, v: l.visibility })) : null;
  const handList: RawFrame['hands'] = hands.landmarks.map((h, i) => {
    const label = hands.handedness[i]?.[0]?.categoryName;
    return {
      pts: h.map((l) => ({ x: l.x, y: l.y, z: l.z })),
      ...(label === 'Left' || label === 'Right' ? { label } : {}),
    };
  });
  return { t, pose: posePts, hands: handList, aspect };
}

/**
 * The camera inference loop: requestAnimationFrame, capped at `targetFps`, adapting down one step when the
 * average inference time exceeds 60 ms. detectForVideo is synchronous and blocks the main thread, so the
 * cap matters. Pauses while the tab is hidden.
 */
export class CameraPipeline {
  private raf = 0;
  private running = false;
  private lastRun = 0;
  private lastVideoTime = -1;
  private tsPose = 0;
  private tsHands = 0;
  private ema = 0;
  private failures = 0;
  private fastSince: number | null = null;
  private frames: number[] = [];
  private target: number;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly lm: Landmarkers,
    private userFps: number,
    private readonly onFrame: (f: RawFrame) => void,
    private readonly onStats: (s: PipelineStats) => void,
    private readonly onFatal: (err: unknown) => void,
  ) {
    this.target = userFps;
  }

  setTargetFps(fps: number): void {
    this.userFps = fps;
    this.target = fps;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden) return;
    if (now - this.lastRun < 1000 / this.target - 2) return;
    const v = this.video;
    if (v.readyState < 2 || v.videoWidth === 0 || v.currentTime === this.lastVideoTime) return;
    this.lastRun = now;
    this.lastVideoTime = v.currentTime;

    const base = Math.round(performance.now());
    this.tsPose = Math.max(this.tsPose + 1, base);
    this.tsHands = Math.max(this.tsHands + 1, base);
    const t0 = performance.now();
    let frame: RawFrame;
    try {
      const pose = this.lm.pose.detectForVideo(v, this.tsPose);
      const hands = this.lm.hands.detectForVideo(v, this.tsHands);
      frame = toRawFrame(base, pose, hands, v.videoWidth / v.videoHeight);
      this.failures = 0;
    } catch (err) {
      this.failures++;
      if (this.failures >= MAX_FAILURES) {
        this.stop();
        this.onFatal(err);
      }
      return;
    }
    const dt = performance.now() - t0;
    this.ema = this.ema === 0 ? dt : this.ema * 0.85 + dt * 0.15;
    this.adapt(now);
    this.frames.push(now);
    while (this.frames.length && this.frames[0]! < now - 1000) this.frames.shift();
    this.onStats({ fps: this.frames.length, targetFps: this.target, inferenceMs: this.ema, lowPower: this.target < this.userFps });
    this.onFrame(frame);
  };

  private adapt(now: number) {
    const idx = FPS_STEPS.findIndex((f) => f <= this.target);
    if (this.ema > SLOW_MS && this.target > 8) {
      this.target = FPS_STEPS[Math.min(idx + 1, FPS_STEPS.length - 1)]!;
      this.fastSince = null;
      return;
    }
    if (this.target < this.userFps && this.ema < RECOVER_MS) {
      this.fastSince ??= now;
      if (now - this.fastSince > RECOVER_AFTER_MS) {
        const up = FPS_STEPS[Math.max(idx - 1, 0)]!;
        this.target = Math.min(up, this.userFps);
        this.fastSince = null;
      }
    } else {
      this.fastSince = null;
    }
  }
}
