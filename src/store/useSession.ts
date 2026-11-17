import { create } from 'zustand';
import { CalmWatch, type CalmState, type CalmUpdate } from '../engine/calmWatch';
import type { ClassModel } from '../engine/classifier';
import { FrameProcessor } from '../engine/processor';
import { Recognizer, type Emission, type Evaluation, type Sighting } from '../engine/recognizer';
import { invalidFraction } from '../engine/resample';
import type { GestureName } from '../engine/simulator';
import type { FeatureFrame, SlottedFrame } from '../engine/types';
import { CameraError, type CameraErrorCode } from '../vision/camera';
import type { PipelineStats } from '../vision/pipeline';
import { CameraSource, DemoSource, type FrameSource } from '../vision/sources';

export type SourceKind = 'camera' | 'demo';
export type SessionMode = 'live' | 'teach' | 'debug';
/** waiting = no frame yet · ok = shoulders visible · lost = no shoulders for > 1 s */
export type Seeing = 'waiting' | 'ok' | 'lost';

export interface SessionUiState {
  kind: SourceKind | null;
  phase: 'idle' | 'starting' | 'running' | 'error';
  error: CameraErrorCode | 'vision' | null;
  stats: PipelineStats | null;
  seeing: Seeing;
  lastEval: Evaluation | null;
  calm: CalmState | null;
  demoGesture: GestureName;
  /** source to offer first on Live/Teach (set from onboarding) */
  preferredSource: SourceKind;
}

export const useSession = create<SessionUiState>(() => ({
  kind: null,
  phase: 'idle',
  error: null,
  stats: null,
  seeing: 'waiting',
  lastEval: null,
  calm: null,
  demoGesture: 'idle',
  preferredSource: 'demo',
}));

const LOST_MS = 1000;

interface Capture {
  until: number;
  frames: FeatureFrame[];
  resolve: (r: { frames: FeatureFrame[]; invalidFraction: number }) => void;
}

/**
 * Imperative session controller (singleton). Owns the active FrameSource and the processing chain.
 * React reads low-rate state from `useSession`; per-frame data goes to subscribers (overlay canvas).
 */
class Session {
  private source: FrameSource | null = null;
  private unsub: (() => void) | null = null;
  private processor = new FrameProcessor();
  private recognizer = new Recognizer({ windowMs: 2000, sensitivity: 1 });
  private calm = new CalmWatch();
  private mode: SessionMode = 'live';
  private lastValid = -Infinity;
  private firstFrameAt = -Infinity;
  private lostTimer: ReturnType<typeof setInterval> | null = null;
  private captures: Capture[] = [];
  private frameSubs = new Set<(f: SlottedFrame, valid: boolean) => void>();
  private emissionSubs = new Set<(e: Emission) => void>();
  private sightingSubs = new Set<(s: Sighting) => void>();
  private calmSubs = new Set<(u: CalmUpdate) => void>();
  private startToken = 0;
  private targetFps = 15;
  private deviceId = '';

  get demo(): DemoSource | null {
    return this.source instanceof DemoSource ? this.source : null;
  }

  get video(): HTMLVideoElement | undefined {
    return this.source?.videoEl;
  }

  setMode(mode: SessionMode) {
    this.mode = mode;
  }

  setModels(models: readonly ClassModel[]) {
    this.recognizer.setModels(models);
  }

  setRecognizerOptions(o: { windowMs?: number; sensitivity?: number }) {
    this.recognizer.setOptions(o);
  }

  setCameraOptions(o: { targetFps?: number; deviceId?: string }) {
    if (o.targetFps !== undefined) {
      this.targetFps = o.targetFps;
      if (this.source instanceof CameraSource) this.source.setTargetFps(o.targetFps);
    }
    if (o.deviceId !== undefined) this.deviceId = o.deviceId;
  }

  /** Replace the Calm Watch baseline (per profile) and reset its state. */
  setCalmBaseline(samples: readonly number[]) {
    this.calm = new CalmWatch(samples);
    useSession.setState({ calm: null });
  }

  calmBaseline(): number[] {
    return this.calm.baselineSamples();
  }

  async start(kind: SourceKind): Promise<void> {
    const token = ++this.startToken;
    this.stopSource();
    useSession.setState({ kind, phase: 'starting', error: null, stats: null, seeing: 'waiting', lastEval: null, demoGesture: 'idle' });
    const src: FrameSource =
      kind === 'demo'
        ? new DemoSource()
        : new CameraSource({
            ...(this.deviceId ? { deviceId: this.deviceId } : {}),
            targetFps: this.targetFps,
            onStats: (s) => useSession.setState({ stats: s }),
            onError: (e) => this.fail(e),
          });
    this.source = src;
    this.processor.reset();
    this.recognizer.reset();
    this.calm.reset();
    this.lastValid = -Infinity;
    this.firstFrameAt = -Infinity;
    this.unsub = src.onFrame((raw) => this.handle(raw));
    try {
      await src.start();
    } catch (err) {
      if (token === this.startToken) this.fail(err);
      return;
    }
    if (token !== this.startToken) return;
    useSession.setState({ phase: 'running' });
    this.lostTimer = setInterval(() => this.updateSeeing(performance.now()), 250);
  }

  stop(): void {
    this.startToken++;
    this.stopSource();
    useSession.setState({ kind: null, phase: 'idle', stats: null, seeing: 'waiting', lastEval: null });
  }

  private stopSource() {
    this.unsub?.();
    this.unsub = null;
    this.source?.stop();
    this.source = null;
    if (this.lostTimer) clearInterval(this.lostTimer);
    this.lostTimer = null;
    for (const c of this.captures) c.resolve({ frames: c.frames, invalidFraction: invalidFraction(c.frames) });
    this.captures = [];
  }

  private fail(err: unknown) {
    this.stopSource();
    const code = err instanceof CameraError ? err.code : 'vision';
    useSession.setState({ phase: 'error', error: code });
  }

  performDemo(g: GestureName) {
    const d = this.demo;
    if (!d) return;
    d.perform(g);
    useSession.setState({ demoGesture: g });
  }

  /** Collect processed frames for `ms` (teach recording). */
  capture(ms: number): Promise<{ frames: FeatureFrame[]; invalidFraction: number }> {
    return new Promise((resolve) => {
      this.captures.push({ until: performance.now() + ms, frames: [], resolve });
    });
  }

  subscribeFrame(cb: (f: SlottedFrame, valid: boolean) => void): () => void {
    this.frameSubs.add(cb);
    return () => this.frameSubs.delete(cb);
  }
  onEmission(cb: (e: Emission) => void): () => void {
    this.emissionSubs.add(cb);
    return () => this.emissionSubs.delete(cb);
  }
  /** "Not taught yet — looks like …" descriptions (Live only). */
  onSighting(cb: (s: Sighting) => void): () => void {
    this.sightingSubs.add(cb);
    return () => this.sightingSubs.delete(cb);
  }
  onCalm(cb: (u: CalmUpdate) => void): () => void {
    this.calmSubs.add(cb);
    return () => this.calmSubs.delete(cb);
  }

  /** number of live camera tracks (0 when stopped) — used by tests */
  liveTracks(): number {
    return this.source instanceof CameraSource ? this.source.liveTracks() : 0;
  }

  private handle(raw: Parameters<Parameters<FrameSource['onFrame']>[0]>[0]) {
    const now = performance.now();
    if (this.firstFrameAt === -Infinity) this.firstFrameAt = now;
    const { slotted, features } = this.processor.process(raw);
    if (features.valid) this.lastValid = now;
    this.updateSeeing(now);
    for (const s of this.frameSubs) s(slotted, features.valid);

    for (const c of this.captures) c.frames.push(features);
    const done = this.captures.filter((c) => now >= c.until);
    if (done.length) {
      this.captures = this.captures.filter((c) => now < c.until);
      for (const c of done) c.resolve({ frames: c.frames, invalidFraction: invalidFraction(c.frames) });
    }

    if (this.mode === 'live' || this.mode === 'debug') {
      const ev = this.recognizer.push(features);
      if (ev) {
        useSession.setState({ lastEval: ev });
        if (ev.emitted) for (const s of this.emissionSubs) s(ev.emitted);
        if (ev.sighting) for (const s of this.sightingSubs) s(ev.sighting);
      }
      const cu = this.calm.push(raw.t, slotted.pose, slotted.aspect);
      if (cu) {
        useSession.setState({ calm: cu.state });
        for (const s of this.calmSubs) s(cu);
      }
    }
  }

  private updateSeeing(now: number) {
    if (this.firstFrameAt === -Infinity) return;
    const ref = Number.isFinite(this.lastValid) ? this.lastValid : this.firstFrameAt;
    const seeing: Seeing = now - ref <= LOST_MS ? (Number.isFinite(this.lastValid) ? 'ok' : 'waiting') : 'lost';
    if (useSession.getState().seeing !== seeing) useSession.setState({ seeing });
  }
}

export const session = new Session();
