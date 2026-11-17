import { DEFAULT_ASPECT, IDLE_ENERGY, L_SHOULDER, R_SHOULDER, SHOULDER_VIS_MIN } from './constants';
import { motionEnergy, type PointSample } from './motion';
import type { CalmTier, Pt } from './types';

/**
 * Calm Watch — a movement-PATTERN indicator (energy, rhythm, suddenness). It is not a diagnosis and does not
 * infer emotions. Pose-only; time is injected.
 */

export type CalmReason = 'fast-movement' | 'repetitive-rhythm' | 'sudden-change';

export interface CalmState {
  t: number;
  tier: CalmTier;
  score: number;
  energy: number;
  periodicity: number;
  frequencyHz: number;
  z: number;
  suddenness: number;
  reasons: CalmReason[];
}

export interface CalmUpdate {
  state: CalmState;
  /** set when the tier changed on this update */
  tierChanged: CalmTier | null;
}

/** keypoints for energy: nose, shoulders, elbows, wrists */
const ENERGY_IDX = [0, 11, 12, 13, 14, 15, 16] as const;
const BIN_MS = 1000;
const HISTORY_MS = 9000;
const PERIOD_WINDOW_MS = 8000;
const PERIOD_HZ = 15;
const MIN_LAG_S = 0.33;
const MAX_LAG_S = 3;
const DETREND_S = 3;
const EPS = 0.1;

export const TIER_RISING = 0.35;
export const TIER_HIGH = 0.65;
export const HYSTERESIS = 0.05;
/** score must stay above a threshold for this long (bins span ≥ 3 s) */
export const ENTER_MS = 3000;
export const LEAVE_MS = 8000;

/** Prior baseline for a seated child at rest (shoulder widths / s), used until enough calm data exists. */
export const PRIOR_MEDIAN = 0.25;
export const PRIOR_MAD = 0.1;
const MAD_FLOOR = 0.06;
const BASELINE_MIN_SAMPLES = 10;
const BASELINE_CAP = 300;
const FAST_INIT_MS = 90_000;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

interface Sample {
  t: number;
  xy: Float64Array;
  present: boolean[];
  midX: number;
  noseY: number;
}

/** Normalised autocorrelation periodicity of a 1-D signal sampled at PERIOD_HZ. */
export function periodicity(x: readonly number[], hz = PERIOD_HZ): { p: number; lagS: number } {
  const n = x.length;
  const half = Math.round((DETREND_S * hz) / 2);
  const d = x.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      s += x[j]!;
      c++;
    }
    return x[i]! - s / c;
  });
  let e = 0;
  for (const v of d) e += v * v;
  if (e <= 1e-12) return { p: 0, lagS: 0 };
  let best = 0;
  let bestLag = 0;
  const minK = Math.round(MIN_LAG_S * hz);
  const maxK = Math.min(Math.round(MAX_LAG_S * hz), n - 2);
  for (let k = minK; k <= maxK; k++) {
    let s = 0;
    for (let i = 0; i + k < n; i++) s += d[i]! * d[i + k]!;
    const r = s / e;
    if (r > best) {
      best = r;
      bestLag = k;
    }
  }
  return { p: clamp(best, 0, 1), lagS: bestLag / hz };
}

function resampleSeries(samples: readonly Sample[], pick: (s: Sample) => number, t0: number, t1: number, hz: number): number[] {
  const out: number[] = [];
  const step = 1000 / hz;
  let j = 0;
  for (let t = t0; t <= t1; t += step) {
    while (j < samples.length - 2 && samples[j + 1]!.t < t) j++;
    const a = samples[j]!;
    const b = samples[Math.min(j + 1, samples.length - 1)]!;
    const span = b.t - a.t;
    const w = span > 0 ? clamp((t - a.t) / span, 0, 1) : 0;
    out.push(pick(a) + (pick(b) - pick(a)) * w);
  }
  return out;
}

export class CalmWatch {
  private samples: Sample[] = [];
  private energies: { t: number; e: number }[] = [];
  private baseline: number[];
  private tier: CalmTier = 'calm';
  private binStart: number | null = null;
  private firstT: number | null = null;
  private aboveRisingSince: number | null = null;
  private aboveHighSince: number | null = null;
  private belowSince: number | null = null;
  private binCount = 0;
  private last: CalmState | null = null;

  /** @param baseline previously stored calm-period energy samples for this profile */
  constructor(baseline: readonly number[] = []) {
    this.baseline = baseline.slice(-BASELINE_CAP);
  }

  get state(): CalmState | null {
    return this.last;
  }

  /** Calm-period energy samples (persist per profile to keep the baseline across sessions). */
  baselineSamples(): number[] {
    return [...this.baseline];
  }

  reset(): void {
    this.samples = [];
    this.energies = [];
    this.tier = 'calm';
    this.binStart = null;
    this.firstT = null;
    this.aboveRisingSince = this.aboveHighSince = this.belowSince = null;
    this.last = null;
  }

  /** Feed one pose (33 landmarks, un-mirrored image coordinates). Returns an update once per 1 s bin. */
  push(t: number, pose: readonly Pt[] | null, aspect = DEFAULT_ASPECT): CalmUpdate | null {
    if (this.firstT === null) this.firstT = t;
    if (this.binStart === null) this.binStart = t;
    const s = pose ? toSample(t, pose, aspect) : null;
    if (s) this.samples.push(s);
    while (this.samples.length && this.samples[0]!.t < t - HISTORY_MS) this.samples.shift();
    if (t - this.binStart < BIN_MS) return null;
    this.binStart = t;
    return this.evaluate(t);
  }

  private baselineStats(): { med: number; mad: number } {
    if (this.baseline.length < BASELINE_MIN_SAMPLES) return { med: PRIOR_MEDIAN, mad: PRIOR_MAD };
    const med = median(this.baseline);
    const mad = median(this.baseline.map((x) => Math.abs(x - med)));
    return { med, mad: Math.max(mad, MAD_FLOOR) };
  }

  private evaluate(t: number): CalmUpdate {
    const bin = this.samples.filter((s) => s.t > t - BIN_MS);
    const energy = motionEnergy(bin.map<PointSample>((s) => ({ t: s.t, xy: s.xy, present: s.present })));
    this.energies.push({ t, e: energy });
    while (this.energies.length && this.energies[0]!.t < t - HISTORY_MS) this.energies.shift();

    // Repetitiveness over the last 8 s
    let p = 0;
    let freq = 0;
    const win = this.samples.filter((s) => s.t >= t - PERIOD_WINDOW_MS);
    if (energy >= IDLE_ENERGY && win.length > 10 && win[win.length - 1]!.t - win[0]!.t >= 4000) {
      const t0 = win[0]!.t;
      const t1 = win[win.length - 1]!.t;
      const a = periodicity(resampleSeries(win, (s) => s.midX, t0, t1, PERIOD_HZ));
      const b = periodicity(resampleSeries(win, (s) => s.noseY, t0, t1, PERIOD_HZ));
      const best = a.p >= b.p ? a : b;
      p = best.p;
      freq = best.lagS > 0 ? 1 / best.lagS : 0;
    }

    const { med, mad } = this.baselineStats();
    const z = (energy - med) / (1.4826 * mad + 1e-6);
    const ago = this.energies.find((x) => x.t >= t - 5000 - BIN_MS / 2 && x.t <= t - 5000 + BIN_MS / 2);
    const ref = ago ? ago.e : med;
    const sudden = clamp((energy - ref) / (ref + EPS), 0, 3) / 3;
    const score = clamp(0.5 * sigmoid(z - 2) + 0.3 * p + 0.2 * sudden, 0, 1);

    const prevTier = this.tier;
    this.aboveRisingSince = score >= TIER_RISING ? (this.aboveRisingSince ?? t) : null;
    this.aboveHighSince = score >= TIER_HIGH ? (this.aboveHighSince ?? t) : null;
    if (this.aboveHighSince !== null && t - this.aboveHighSince >= ENTER_MS && this.tier !== 'high') {
      this.tier = 'high';
    } else if (this.aboveRisingSince !== null && t - this.aboveRisingSince >= ENTER_MS && this.tier === 'calm') {
      this.tier = 'rising';
    }
    if (this.tier !== 'calm') {
      const thr = (this.tier === 'high' ? TIER_HIGH : TIER_RISING) - HYSTERESIS;
      this.belowSince = score < thr ? (this.belowSince ?? t) : null;
      if (this.belowSince !== null && t - this.belowSince >= LEAVE_MS) {
        this.tier = this.tier === 'high' && score >= TIER_RISING - HYSTERESIS ? 'rising' : 'calm';
        this.belowSince = null;
      }
    } else {
      this.belowSince = null;
    }

    // Baseline: learn only while calm. Fast during the first 90 s, then slowly (every 5th bin).
    this.binCount++;
    const early = t - (this.firstT ?? t) <= FAST_INIT_MS;
    if (this.tier === 'calm' && score < TIER_RISING && hasEnoughFrames(bin.length) && (early || this.binCount % 5 === 0)) {
      this.baseline.push(energy);
      if (this.baseline.length > BASELINE_CAP) this.baseline.shift();
    }

    const reasons: CalmReason[] = [];
    if (z > 2) reasons.push('fast-movement');
    if (p > 0.5) reasons.push('repetitive-rhythm');
    if (sudden > 0.5) reasons.push('sudden-change');

    this.last = { t, tier: this.tier, score, energy, periodicity: p, frequencyHz: freq, z, suddenness: sudden, reasons };
    return { state: this.last, tierChanged: this.tier !== prevTier ? this.tier : null };
  }
}

const hasEnoughFrames = (n: number) => n >= 5;

function toSample(t: number, pose: readonly Pt[], aspect: number): Sample | null {
  const l = pose[L_SHOULDER];
  const r = pose[R_SHOULDER];
  if (!l || !r || (l.v ?? 1) < SHOULDER_VIS_MIN || (r.v ?? 1) < SHOULDER_VIS_MIN) return null;
  const sw = Math.max(Math.hypot(l.x - r.x, (l.y - r.y) / aspect), 0.05);
  const xy = new Float64Array(ENERGY_IDX.length * 2);
  const present: boolean[] = [];
  ENERGY_IDX.forEach((idx, k) => {
    const p = pose[idx];
    const ok = !!p && (p.v ?? 1) >= 0.3;
    present.push(ok);
    if (p) {
      xy[2 * k] = p.x / sw;
      xy[2 * k + 1] = p.y / aspect / sw;
    }
  });
  const nose = pose[0];
  return { t, xy, present, midX: (l.x + r.x) / 2, noseY: nose ? nose.y : (l.y + r.y) / 2 };
}
