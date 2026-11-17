import { create } from 'zustand';
import { FrameProcessor } from '../engine/processor';
import type { GestureName } from '../engine/simulator';
import type { FeatureFrame, RawFrame, SlottedFrame } from '../engine/types';
import { CameraError, type CameraErrorCode } from '../vision/camera';
import { CameraSource, DemoSource, type FrameSource } from '../vision/sources';
import { useSettings } from './useApp';

/**
 * Translate's own camera session. It is deliberately separate from the Live session (`useSession.ts`): its own
 * source, frame processor, subscribers and capture — no recogniser, no cooldowns, no Calm Watch, no events.
 * It only exists while a Translate tab that needs the camera is open; `stop()` releases every track.
 */
export type TranslateSourceKind = 'camera' | 'demo';

export interface TranslateCamState {
  kind: TranslateSourceKind | null;
  phase: 'idle' | 'starting' | 'running' | 'error';
  error: CameraErrorCode | 'vision' | null;
  /** shoulders seen within the last second */
  seeing: boolean;
  mirrored: boolean;
}

export const useTranslateCam = create<TranslateCamState>(() => ({ kind: null, phase: 'idle', error: null, seeing: false, mirrored: true }));

interface Capture {
  until: number;
  frames: FeatureFrame[];
  resolve: (frames: FeatureFrame[]) => void;
}

class TranslateSession {
  private source: FrameSource | null = null;
  private unsub: (() => void) | null = null;
  private processor = new FrameProcessor();
  private frameSubs = new Set<(f: SlottedFrame, valid: boolean) => void>();
  private featureSubs = new Set<(f: FeatureFrame) => void>();
  private captures: Capture[] = [];
  private token = 0;
  private lastValid = -Infinity;
  private seeingTimer: ReturnType<typeof setInterval> | null = null;

  get video(): HTMLVideoElement | undefined {
    return this.source?.videoEl;
  }

  get demo(): DemoSource | null {
    return this.source instanceof DemoSource ? this.source : null;
  }

  async start(kind: TranslateSourceKind): Promise<void> {
    const token = ++this.token;
    this.release();
    useTranslateCam.setState({ kind, phase: 'starting', error: null, seeing: false });
    const s = useSettings.getState();
    const src: FrameSource =
      kind === 'demo'
        ? new DemoSource()
        : new CameraSource({
            ...(s.cameraDeviceId ? { deviceId: s.cameraDeviceId } : { facing: s.cameraFacing }),
            targetFps: s.batterySaver ? 10 : s.targetFps,
            onStats: () => undefined,
            onError: (e) => this.fail(e),
          });
    this.source = src;
    this.processor.reset();
    this.lastValid = -Infinity;
    this.unsub = src.onFrame((raw) => this.handle(raw));
    try {
      await src.start();
    } catch (err) {
      if (token === this.token) this.fail(err);
      return;
    }
    if (token !== this.token) return;
    const facing = src instanceof CameraSource ? src.info().facing : null;
    useTranslateCam.setState({ phase: 'running', mirrored: facing !== 'environment' });
    this.seeingTimer = setInterval(() => {
      const seeing = performance.now() - this.lastValid < 1000;
      if (useTranslateCam.getState().seeing !== seeing) useTranslateCam.setState({ seeing });
    }, 250);
  }

  stop(): void {
    this.token++;
    this.release();
    useTranslateCam.setState({ kind: null, phase: 'idle', error: null, seeing: false });
  }

  performDemo(g: GestureName): void {
    this.demo?.perform(g);
  }

  /** Processed frames for the next `ms` (one sign capture). Resolves early with what it has if stopped. */
  capture(ms: number): Promise<FeatureFrame[]> {
    return new Promise((resolve) => this.captures.push({ until: performance.now() + ms, frames: [], resolve }));
  }

  subscribeFrame(cb: (f: SlottedFrame, valid: boolean) => void): () => void {
    this.frameSubs.add(cb);
    return () => this.frameSubs.delete(cb);
  }

  subscribeFeatures(cb: (f: FeatureFrame) => void): () => void {
    this.featureSubs.add(cb);
    return () => this.featureSubs.delete(cb);
  }

  /** live camera tracks (tests: 0 after leaving Translate) */
  liveTracks(): number {
    return this.source instanceof CameraSource ? this.source.liveTracks() : 0;
  }

  private release() {
    this.unsub?.();
    this.unsub = null;
    this.source?.stop();
    this.source = null;
    if (this.seeingTimer) clearInterval(this.seeingTimer);
    this.seeingTimer = null;
    for (const c of this.captures) c.resolve(c.frames);
    this.captures = [];
  }

  private fail(err: unknown) {
    this.release();
    useTranslateCam.setState({ phase: 'error', error: err instanceof CameraError ? err.code : 'vision' });
  }

  private handle(raw: RawFrame) {
    const now = performance.now();
    const { slotted, features } = this.processor.process(raw);
    if (features.valid) this.lastValid = now;
    for (const s of this.frameSubs) s(slotted, features.valid);
    for (const s of this.featureSubs) s(features);
    for (const c of this.captures) c.frames.push(features);
    const done = this.captures.filter((c) => now >= c.until);
    if (done.length) {
      this.captures = this.captures.filter((c) => now < c.until);
      for (const c of done) c.resolve(c.frames);
    }
  }
}

export const translateSession = new TranslateSession();
