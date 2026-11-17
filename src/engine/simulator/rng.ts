/** Small seeded PRNG (mulberry32) + Gaussian (Box–Muller). Deterministic for tests. */
export interface Rng {
  next(): number;
  gauss(): number;
  range(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  return {
    next,
    gauss() {
      if (spare !== null) {
        const s = spare;
        spare = null;
        return s;
      }
      const u = Math.max(next(), 1e-12);
      const v = next();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    },
    range(min, max) {
      return min + (max - min) * next();
    },
  };
}
