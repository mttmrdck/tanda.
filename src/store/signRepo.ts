import { validatePack, type SignPack } from '../engine/sign/pack';
import { getDB, type SignProgress } from './db';
import { guard } from './repoBase';

/**
 * Sign-pack storage (Labs). Kept apart from the child-data repo: sign packs and the child's personal signals
 * live in different object stores and are read by different modules (see docs/TRANSLATE.md, isolation).
 */

/** Device packs; anything that no longer validates is skipped rather than crashing the list. */
export const listSignPacks = () =>
  guard(async () => {
    const out: SignPack[] = [];
    for (const raw of await (await getDB()).getAll('signPacks')) {
      try {
        out.push({ ...validatePack(raw), builtIn: false });
      } catch {
        // skip invalid stored pack
      }
    }
    return out;
  });

export const saveSignPack = (pack: SignPack) => guard(async () => void (await getDB()).put('signPacks', { ...validatePack(pack), builtIn: false }));

/** Delete a pack with all of its landmark data and the practice progress that refers to it. */
export function deleteSignPack(packId: string): Promise<void> {
  return guard(async () => {
    const db = await getDB();
    const tx = db.transaction(['signPacks', 'signProgress'], 'readwrite');
    await tx.objectStore('signPacks').delete(packId);
    const prog = tx.objectStore('signProgress');
    for (const key of await prog.index('packId').getAllKeys(packId)) await prog.delete(key);
    await tx.done;
  });
}

export const listSignProgress = (packId: string) => guard(async () => (await getDB()).getAllFromIndex('signProgress', 'packId', packId));

/** Record one practice attempt. A "try again" ends the current run quietly; the best run is kept. */
export function recordSignAttempt(packId: string, signId: string, close: boolean, now: string): Promise<SignProgress> {
  return guard(async () => {
    const db = await getDB();
    const key = `${packId}:${signId}`;
    const prev = await db.get('signProgress', key);
    const streak = close ? (prev?.streak ?? 0) + 1 : 0;
    const next: SignProgress = {
      key,
      packId,
      signId,
      attempts: (prev?.attempts ?? 0) + 1,
      close: (prev?.close ?? 0) + (close ? 1 : 0),
      streak,
      bestStreak: Math.max(prev?.bestStreak ?? 0, streak),
      lastAt: now,
    };
    await db.put('signProgress', next);
    return next;
  });
}
