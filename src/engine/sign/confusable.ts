import { CLIP_N, D } from '../constants';
import { dtw } from '../dtw';
import type { PackModels } from './models';
import { handDistance } from './staticHand';

/**
 * Signs whose recorded templates come within either sign's rejection threshold of each other — the camera may
 * not be able to tell them apart. Static signs are compared with static, dynamic with dynamic.
 */
export function findConfusables(models: PackModels): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    out.set(a, [...(out.get(a) ?? []), b]);
    out.set(b, [...(out.get(b) ?? []), a]);
  };
  const st = models.static;
  for (let i = 0; i < st.length; i++) {
    for (let j = i + 1; j < st.length; j++) {
      const a = st[i]!;
      const b = st[j]!;
      let min = Infinity;
      for (const x of a.shapes) for (const y of b.shapes) min = Math.min(min, handDistance(x, y));
      if (min < Math.max(a.tau, b.tau)) add(a.signId, b.signId);
    }
  }
  const dy = models.dynamic;
  for (let i = 0; i < dy.length; i++) {
    for (let j = i + 1; j < dy.length; j++) {
      const a = dy[i]!;
      const b = dy[j]!;
      let min = Infinity;
      for (const x of a.examples) for (const y of b.examples) min = Math.min(min, dtw(x, y, CLIP_N, D));
      if (min < Math.max(a.tau, b.tau)) add(a.signalId, b.signalId);
    }
  }
  return out;
}
