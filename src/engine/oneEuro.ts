/**
 * 1€ filter — Casiez, Roussel & Vogel, CHI 2012.
 * Adaptive low-pass: strong smoothing when still, low lag when moving.
 */
export interface OneEuroParams {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

const alpha = (cutoff: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt);

export class OneEuroFilter {
  private xPrev = 0;
  private dxPrev = 0;
  private tPrev = 0;
  private started = false;

  constructor(private readonly p: OneEuroParams) {}

  reset(): void {
    this.started = false;
  }

  /** @param x value  @param t timestamp in ms */
  filter(x: number, t: number): number {
    if (!this.started) {
      this.started = true;
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = t;
      return x;
    }
    const dt = Math.max((t - this.tPrev) / 1000, 1e-3);
    const dxRaw = (x - this.xPrev) / dt;
    const dx = this.dxPrev + alpha(this.p.dCutoff, dt) * (dxRaw - this.dxPrev);
    const cutoff = this.p.minCutoff + this.p.beta * Math.abs(dx);
    const xHat = this.xPrev + alpha(cutoff, dt) * (x - this.xPrev);
    this.xPrev = xHat;
    this.dxPrev = dx;
    this.tPrev = t;
    return xHat;
  }
}

/** A bank of 1€ filters for `count` 2-D points (one filter per point per axis). */
export class PointFilterBank {
  private readonly fx: OneEuroFilter[];
  private readonly fy: OneEuroFilter[];

  constructor(count: number, p: OneEuroParams) {
    this.fx = Array.from({ length: count }, () => new OneEuroFilter(p));
    this.fy = Array.from({ length: count }, () => new OneEuroFilter(p));
  }

  reset(): void {
    for (const f of this.fx) f.reset();
    for (const f of this.fy) f.reset();
  }

  /** Returns new smoothed points (input is not mutated). */
  apply<P extends { x: number; y: number }>(pts: readonly P[], t: number): P[] {
    return pts.map((p, i) => ({ ...p, x: this.fx[i]!.filter(p.x, t), y: this.fy[i]!.filter(p.y, t) }));
  }
}
