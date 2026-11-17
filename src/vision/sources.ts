import { DEFAULT_PLACEMENT, PERFORMANCE_MS, createRng, renderFrame, type GestureName, type Placement } from '../engine/simulator';
import type { Rng } from '../engine/simulator/rng';
import type { RawFrame } from '../engine/types';
import { openCamera, stopStream, CameraError, mapCameraError } from './camera';
import { loadLandmarkers } from './loader';
import { CameraPipeline, type PipelineStats } from './pipeline';

export interface FrameSource {
  start(): Promise<void>;
  stop(): void;
  onFrame(cb: (f: RawFrame) => void): () => void;
  readonly kind: 'camera' | 'demo';
  readonly videoEl?: HTMLVideoElement;
}

abstract class BaseSource {
  protected listeners = new Set<(f: RawFrame) => void>();
  onFrame(cb: (f: RawFrame) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  protected emit(f: RawFrame) {
    for (const l of this.listeners) l(f);
  }
}

/** Webcam → MediaPipe Pose + Hands. Frames are processed in memory and never stored. */
export class CameraSource extends BaseSource implements FrameSource {
  readonly kind = 'camera' as const;
  readonly videoEl: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private pipeline: CameraPipeline | null = null;
  private stopped = false;

  constructor(
    private readonly opts: {
      deviceId?: string;
      targetFps: number;
      onStats: (s: PipelineStats) => void;
      onError: (e: CameraError | Error) => void;
    },
  ) {
    super();
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.setAttribute('aria-hidden', 'true');
    this.videoEl = v;
  }

  async start(): Promise<void> {
    this.stopped = false;
    const [lm, stream] = await Promise.all([loadLandmarkers(), openCamera(this.opts.deviceId)]);
    if (this.stopped) {
      stopStream(stream);
      return;
    }
    this.stream = stream;
    for (const track of stream.getVideoTracks()) {
      track.addEventListener('ended', () => {
        if (!this.stopped) this.opts.onError(new CameraError('unplugged'));
      });
    }
    this.videoEl.srcObject = stream;
    try {
      await this.videoEl.play();
    } catch (err) {
      // autoplay of a muted inline video should not fail; surface it as a camera problem if it does
      throw mapCameraError(err);
    }
    this.pipeline = new CameraPipeline(this.videoEl, lm, this.opts.targetFps, (f) => this.emit(f), this.opts.onStats, (e) =>
      this.opts.onError(e instanceof Error ? e : new Error(String(e))),
    );
    this.pipeline.start();
  }

  setTargetFps(fps: number) {
    this.pipeline?.setTargetFps(fps);
  }

  stop(): void {
    this.stopped = true;
    this.pipeline?.stop();
    this.pipeline = null;
    stopStream(this.stream);
    this.stream = null;
    this.videoEl.srcObject = null;
  }

  /** for tests: are any tracks still live? */
  liveTracks(): number {
    return this.stream?.getTracks().filter((t) => t.readyState === 'live').length ?? 0;
  }
}

/** Gestures the demo performer loops continuously (others are performed once, then the performer rests). */
export const CONTINUOUS: ReadonlySet<GestureName> = new Set(['rock', 'flap', 'idle']);

/**
 * Synthetic performer: the same RawFrame stream a camera would produce, generated from the simulator.
 * Everything downstream (smoothing → features → recognizer → Calm Watch → UI) is identical.
 */
export class DemoSource extends BaseSource implements FrameSource {
  readonly kind = 'demo' as const;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rng: Rng;
  private gesture: GestureName = 'idle';
  private startedAt = 0;
  private perf = { speed: 1, amp: 1, rate: 1, phase: 0 };
  private place: Placement = DEFAULT_PLACEMENT;
  private t0 = 0;

  constructor(
    private readonly fps = 15,
    seed = 7,
  ) {
    super();
    this.rng = createRng(seed);
  }

  get current(): GestureName {
    return this.gesture;
  }

  /** Start performing `g`. Discrete gestures play once (≈2 s), then the performer rests. */
  perform(g: GestureName): void {
    this.gesture = g;
    this.startedAt = performance.now();
    this.perf = {
      speed: this.rng.range(0.85, 1.15),
      amp: this.rng.range(0.9, 1.1),
      rate: this.rng.range(0.92, 1.08),
      phase: this.rng.range(-0.04, 0.04),
    };
  }

  async start(): Promise<void> {
    if (this.timer) return;
    this.t0 = performance.now();
    this.place = { ...DEFAULT_PLACEMENT, cx: 0.5 + this.rng.range(-0.02, 0.02) };
    this.timer = setInterval(() => this.tick(), 1000 / this.fps);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const now = performance.now();
    const local = now - this.startedAt;
    const discreteDone = !CONTINUOUS.has(this.gesture) && local * this.perf.speed > PERFORMANCE_MS * 1.05;
    const g: GestureName = discreteDone ? 'idle' : this.gesture;
    const u = (local / PERFORMANCE_MS) * this.perf.speed + this.perf.phase;
    const frame = renderFrame(
      g,
      { u, tSec: (now - this.t0) / 1000, amp: this.perf.amp, rate: this.perf.rate },
      this.place,
      Math.round(now),
      this.rng,
      { noise: 0.004, dropout: 0.01 },
    );
    this.emit(frame);
  }
}
