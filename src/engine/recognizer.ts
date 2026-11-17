import { BUFFER_MS, CLIP_N, COOLDOWN_MS, D, EMIT_CONFIDENCE, EVAL_INTERVAL_MS, IDLE_ENERGY } from './constants';
import { classify, type ClassModel } from './classifier';
import { featureMotionEnergy } from './motion';
import { resampleClip } from './resample';
import type { FeatureFrame, Recognition } from './types';

export interface RecognizerOptions {
  windowMs: number;
  sensitivity: number;
}

export interface Emission {
  t: number;
  signalId: string;
  confidence: number;
  distance: number;
  /** the resampled window (CLIP_N × D) — can become a new example when the caregiver confirms */
  window: Float32Array;
}

export interface Evaluation {
  t: number;
  energy: number;
  result: Recognition;
  emitted: Emission | null;
}

/**
 * Streaming recogniser. Feed one FeatureFrame at a time (timestamps injected, never read from a clock).
 * Evaluates every 400 ms over the last `windowMs`; emits only after two consecutive agreeing evaluations
 * with confidence ≥ 0.55, then holds that signal for a 3 s cooldown and until the child was still or another
 * signal was emitted.
 */
export class Recognizer {
  private buf: FeatureFrame[] = [];
  private models: readonly ClassModel[] = [];
  private lastEval = -Infinity;
  private prevCandidate: string | null = null;
  private readonly lastEmit = new Map<string, number>();
  private readonly armed = new Map<string, boolean>();

  constructor(private opts: RecognizerOptions) {}

  setModels(models: readonly ClassModel[]): void {
    this.models = models;
    this.prevCandidate = null;
  }

  setOptions(opts: Partial<RecognizerOptions>): void {
    this.opts = { ...this.opts, ...opts };
  }

  reset(): void {
    this.buf = [];
    this.lastEval = -Infinity;
    this.prevCandidate = null;
    this.lastEmit.clear();
    this.armed.clear();
  }

  push(frame: FeatureFrame): Evaluation | null {
    this.buf.push(frame);
    const cutoff = frame.t - BUFFER_MS;
    while (this.buf.length && this.buf[0]!.t < cutoff) this.buf.shift();
    if (frame.t - this.lastEval < EVAL_INTERVAL_MS) return null;
    this.lastEval = frame.t;
    return this.evaluate(frame.t);
  }

  private evaluate(t: number): Evaluation {
    const win = this.buf.filter((f) => f.t >= t - this.opts.windowMs);
    const energy = featureMotionEnergy(win);
    if (energy < IDLE_ENERGY) {
      // Stillness re-arms every signal.
      for (const k of this.lastEmit.keys()) this.armed.set(k, true);
    }
    const span = win.length ? win[win.length - 1]!.t - win[0]!.t : 0;
    const clip = span >= this.opts.windowMs * 0.6 ? resampleClip(win, CLIP_N, D) : null;
    let result: Recognition;
    if (!clip) {
      result = { signalId: null, confidence: 0, distance: Infinity, margin: 0, reason: 'insufficient-data' };
    } else {
      result = classify(clip, this.models, { n: CLIP_N, d: D, sensitivity: this.opts.sensitivity }, energy);
    }

    let emitted: Emission | null = null;
    const cand = result.signalId && result.confidence >= EMIT_CONFIDENCE ? result.signalId : null;
    if (cand && cand === this.prevCandidate && clip && this.canEmit(cand, t)) {
      emitted = { t, signalId: cand, confidence: result.confidence, distance: result.distance, window: clip };
      this.lastEmit.set(cand, t);
      this.armed.set(cand, false);
      // A different signal appearing re-arms the others.
      for (const k of this.lastEmit.keys()) if (k !== cand) this.armed.set(k, true);
    }
    this.prevCandidate = cand;
    return { t, energy, result, emitted };
  }

  private canEmit(id: string, t: number): boolean {
    const last = this.lastEmit.get(id);
    if (last === undefined) return true;
    return t - last >= COOLDOWN_MS && this.armed.get(id) === true;
  }
}
