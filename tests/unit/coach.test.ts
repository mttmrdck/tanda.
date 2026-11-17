import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { coachSignal } from '../../src/engine/coach';
import { clipVector } from './benchmark.helpers';

const ex = (g: Parameters<typeof clipVector>[0], base: number, k: number) => Array.from({ length: k }, (_, i) => clipVector(g, base + i).v);
const codes = (r: ReturnType<typeof coachSignal>) => r.advice.map((a) => a.code);

describe('coach', () => {
  it('ok for a consistent, distinct signal', () => {
    expect(codes(coachSignal({ examples: ex('wave', 1, 5), others: [{ signalId: 'arms', examples: ex('armsUp', 50, 3) }], n: CLIP_N, d: D }))).toEqual(['ok']);
  });
  it('too-few with fewer than 3 examples', () => {
    expect(codes(coachSignal({ examples: ex('wave', 1, 2), others: [], n: CLIP_N, d: D }))).toContain('too-few');
  });
  it('inconsistent when examples differ a lot', () => {
    const mixed = [clipVector('wave', 1).v, clipVector('armsUp', 2).v, clipVector('pointRight', 3).v];
    expect(codes(coachSignal({ examples: mixed, others: [], n: CLIP_N, d: D }))).toContain('inconsistent');
  });
  it('too-similar names the similar signal', () => {
    const r = coachSignal({ examples: ex('wave', 1, 4), others: [{ signalId: 'hello', examples: ex('wave', 90, 3) }], n: CLIP_N, d: D });
    expect(r.advice).toContainEqual({ code: 'too-similar', similarTo: 'hello' });
  });
  it('poor-visibility when many frames were invalid', () => {
    expect(codes(coachSignal({ examples: ex('wave', 1, 4), others: [], n: CLIP_N, d: D, invalidFraction: 0.25 }))).toContain('poor-visibility');
  });
});
