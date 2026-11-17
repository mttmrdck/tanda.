import { describe, expect, it } from 'vitest';
import { OneEuroFilter, PointFilterBank } from '../../src/engine/oneEuro';
import { ONE_EURO } from '../../src/engine/constants';
import { createRng } from '../../src/engine/simulator';

const std = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

describe('1€ filter', () => {
  it('reduces stationary noise (σ = 0.005) by at least 50%', () => {
    const rng = createRng(42);
    const f = new OneEuroFilter(ONE_EURO);
    const out: number[] = [];
    for (let i = 0; i < 600; i++) out.push(f.filter(0.5 + rng.gauss() * 0.005, i * (1000 / 15)));
    expect(std(out.slice(30))).toBeLessThanOrEqual(0.5 * 0.005);
  });

  it('reaches 90% of a step within 5 frames at 15 fps', () => {
    const f = new OneEuroFilter(ONE_EURO);
    let t = 0;
    for (let i = 0; i < 30; i++, t += 1000 / 15) f.filter(0.3, t);
    let frames = 0;
    let y = 0.3;
    while (y < 0.3 + 0.9 * 0.2 && frames < 20) {
      y = f.filter(0.5, t);
      t += 1000 / 15;
      frames++;
    }
    expect(frames).toBeLessThanOrEqual(5);
  });

  it('reset makes the next sample pass through unchanged', () => {
    const f = new OneEuroFilter(ONE_EURO);
    f.filter(0.1, 0);
    f.filter(0.1, 66);
    f.reset();
    expect(f.filter(0.9, 132)).toBe(0.9);
  });

  it('filter bank smooths points without mutating the input', () => {
    const bank = new PointFilterBank(2, ONE_EURO);
    const pts = [{ x: 0.1, y: 0.2, v: 0.9 }, { x: 0.3, y: 0.4 }];
    bank.apply(pts, 0);
    const out = bank.apply([{ x: 0.2, y: 0.2, v: 0.9 }, { x: 0.3, y: 0.4 }], 66);
    expect(out[0]!.x).toBeGreaterThan(0.1);
    expect(out[0]!.x).toBeLessThan(0.2);
    expect(out[0]!.v).toBe(0.9);
    expect(pts[0]!.x).toBe(0.1);
  });
});
