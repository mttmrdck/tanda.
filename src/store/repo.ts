import { evictionIndex } from '../engine/calibration';
import { MAX_EXAMPLES_PER_SIGNAL } from '../engine/constants';
import type { ProfileBundle } from '../engine/handover';
import type { AgeBand, ComfortSteps, EventRecord, Example, Profile, Signal } from '../engine/types';
import { validatePack, type SignPack } from '../engine/sign/pack';
import { deleteDatabase, getDB, type SignProgress, type StoredExample } from './db';

export type RepoErrorCode = 'quota' | 'unavailable' | 'unknown';

/** Friendly wrapper for IndexedDB failures (quota, private mode, blocked). */
export class RepoError extends Error {
  constructor(
    public readonly code: RepoErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'RepoError';
  }
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RepoError) throw err;
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'QuotaExceededError') throw new RepoError('quota', err);
    if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'UnknownError') throw new RepoError('unavailable', err);
    throw new RepoError('unknown', err);
  }
}

export function uid(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

const nowIso = () => new Date().toISOString();

export const EMPTY_COMFORT: ComfortSteps = { calm: '', rising: '', high: '' };

const toStored = (e: Example): StoredExample => ({
  id: e.id,
  signalId: e.signalId,
  n: e.n,
  d: e.d,
  data: e.data.buffer.slice(e.data.byteOffset, e.data.byteOffset + e.data.byteLength) as ArrayBuffer,
  source: e.source,
  createdAt: e.createdAt,
});
const fromStored = (s: StoredExample): Example => ({ ...s, data: new Float32Array(s.data) });

// ── profiles ────────────────────────────────────────────────────────────────
export function createProfile(input: { nickname: string; ageBand?: AgeBand; comfortSteps?: ComfortSteps }): Promise<Profile> {
  return guard(async () => {
    const p: Profile = {
      id: uid(),
      nickname: input.nickname.trim(),
      ...(input.ageBand ? { ageBand: input.ageBand } : {}),
      comfortSteps: input.comfortSteps ?? EMPTY_COMFORT,
      createdAt: nowIso(),
    };
    await (await getDB()).put('profiles', p);
    return p;
  });
}

export const listProfiles = () => guard(async () => (await (await getDB()).getAll('profiles')).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
export const getProfile = (id: string) => guard(async () => (await getDB()).get('profiles', id));

export function updateProfile(id: string, patch: Partial<Omit<Profile, 'id' | 'createdAt'>>): Promise<Profile> {
  return guard(async () => {
    const db = await getDB();
    const p = await db.get('profiles', id);
    if (!p) throw new RepoError('unknown');
    const next = { ...p, ...patch };
    await db.put('profiles', next);
    return next;
  });
}

/** Delete a profile and everything that belongs to it (signals, examples, events). */
export function deleteProfile(id: string): Promise<void> {
  return guard(async () => {
    const db = await getDB();
    const tx = db.transaction(['profiles', 'signals', 'examples', 'events'], 'readwrite');
    const sigIds = await tx.objectStore('signals').index('profileId').getAllKeys(id);
    for (const sid of sigIds) {
      for (const ek of await tx.objectStore('examples').index('signalId').getAllKeys(sid)) await tx.objectStore('examples').delete(ek);
      await tx.objectStore('signals').delete(sid);
    }
    for (const evk of await tx.objectStore('events').index('profileId').getAllKeys(id)) await tx.objectStore('events').delete(evk);
    await tx.objectStore('profiles').delete(id);
    await tx.done;
  });
}

// ── signals ─────────────────────────────────────────────────────────────────
export function createSignal(input: Omit<Signal, 'id' | 'createdAt'>): Promise<Signal> {
  return guard(async () => {
    const s: Signal = { ...input, id: uid(), createdAt: nowIso() };
    await (await getDB()).put('signals', s);
    return s;
  });
}

export const listSignals = (profileId: string) =>
  guard(async () => (await (await getDB()).getAllFromIndex('signals', 'profileId', profileId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));

export function updateSignal(id: string, patch: Partial<Omit<Signal, 'id' | 'profileId' | 'createdAt'>>): Promise<Signal> {
  return guard(async () => {
    const db = await getDB();
    const s = await db.get('signals', id);
    if (!s) throw new RepoError('unknown');
    const next = { ...s, ...patch };
    await db.put('signals', next);
    return next;
  });
}

/** Delete a signal and its examples. Past events keep their (now dangling) signalId for history. */
export function deleteSignal(id: string): Promise<void> {
  return guard(async () => {
    const db = await getDB();
    const tx = db.transaction(['signals', 'examples'], 'readwrite');
    for (const k of await tx.objectStore('examples').index('signalId').getAllKeys(id)) await tx.objectStore('examples').delete(k);
    await tx.objectStore('signals').delete(id);
    await tx.done;
  });
}

// ── examples ────────────────────────────────────────────────────────────────
export const listExamples = (signalId: string) =>
  guard(async () => (await (await getDB()).getAllFromIndex('examples', 'signalId', signalId)).map(fromStored).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));

/** All examples of a profile's signals, grouped by signalId. */
export function examplesByProfile(profileId: string): Promise<Map<string, Example[]>> {
  return guard(async () => {
    const out = new Map<string, Example[]>();
    for (const s of await listSignals(profileId)) out.set(s.id, await listExamples(s.id));
    return out;
  });
}

/**
 * Add an example. If the signal now has more than the cap, evict the example most similar to another one
 * (keeps the set diverse). Returns the id of the evicted example, if any.
 */
export function addExample(input: Omit<Example, 'id' | 'createdAt'>, cap = MAX_EXAMPLES_PER_SIGNAL): Promise<{ example: Example; evicted: string | null }> {
  return guard(async () => {
    const ex: Example = { ...input, id: uid(), createdAt: nowIso() };
    const db = await getDB();
    await db.put('examples', toStored(ex));
    const all = await listExamples(ex.signalId);
    const idx = evictionIndex(
      all.map((e) => e.data),
      ex.n,
      ex.d,
      cap,
    );
    let evicted: string | null = null;
    if (idx >= 0) {
      evicted = all[idx]!.id;
      await db.delete('examples', evicted);
    }
    return { example: ex, evicted };
  });
}

export const deleteExample = (id: string) => guard(async () => (await getDB()).delete('examples', id));

// ── events ──────────────────────────────────────────────────────────────────
export function addEvent(input: Omit<EventRecord, 'id'>): Promise<EventRecord> {
  return guard(async () => {
    const e: EventRecord = { ...input, id: uid() };
    await (await getDB()).put('events', e);
    return e;
  });
}

export function updateEvent(id: string, patch: Partial<Omit<EventRecord, 'id' | 'profileId'>>): Promise<EventRecord | undefined> {
  return guard(async () => {
    const db = await getDB();
    const e = await db.get('events', id);
    if (!e) return undefined;
    const next = { ...e, ...patch };
    await db.put('events', next);
    return next;
  });
}

/** Events of a profile, oldest first, optionally limited to [fromIso, toIso). */
export function listEvents(profileId: string, fromIso?: string, toIso?: string): Promise<EventRecord[]> {
  return guard(async () => {
    const all = await (await getDB()).getAllFromIndex('events', 'profileId', profileId);
    return all.filter((e) => (!fromIso || e.ts >= fromIso) && (!toIso || e.ts < toIso)).sort((a, b) => a.ts.localeCompare(b.ts));
  });
}

// ── handover helpers ────────────────────────────────────────────────────────
export function exportBundle(profileId: string, opts: { includeHistory: boolean; settings: { sensitivity: number; windowMs: number } }): Promise<ProfileBundle> {
  return guard(async () => {
    const p = await getProfile(profileId);
    if (!p) throw new RepoError('unknown');
    const signals = await listSignals(profileId);
    const examples = (await Promise.all(signals.map((s) => listExamples(s.id)))).flat();
    const bundle: ProfileBundle = {
      nickname: p.nickname,
      ...(p.ageBand ? { ageBand: p.ageBand } : {}),
      signals: signals.map(({ profileId: _p, ...s }) => s),
      examples,
      settings: opts.settings,
      comfortSteps: p.comfortSteps,
    };
    if (opts.includeHistory) bundle.events = (await listEvents(profileId)).map(({ profileId: _p, ...e }) => e);
    return bundle;
  });
}

/** Import a bundle as a NEW profile (fresh ids; never overwrites). All-or-nothing in one transaction. */
export function importBundle(bundle: ProfileBundle, nickname = bundle.nickname): Promise<Profile> {
  return guard(async () => {
    const db = await getDB();
    const profile: Profile = {
      id: uid(),
      nickname: nickname.trim() || bundle.nickname,
      ...(bundle.ageBand ? { ageBand: bundle.ageBand } : {}),
      comfortSteps: bundle.comfortSteps,
      createdAt: nowIso(),
    };
    const idMap = new Map<string, string>();
    const tx = db.transaction(['profiles', 'signals', 'examples', 'events'], 'readwrite');
    await tx.objectStore('profiles').put(profile);
    for (const s of bundle.signals) {
      const id = uid();
      idMap.set(s.id, id);
      await tx.objectStore('signals').put({ ...s, id, profileId: profile.id });
    }
    for (const e of bundle.examples) {
      const sid = idMap.get(e.signalId);
      if (!sid) continue;
      await tx.objectStore('examples').put(toStored({ ...e, id: uid(), signalId: sid }));
    }
    for (const ev of bundle.events ?? []) {
      await tx.objectStore('events').put({
        ...ev,
        id: uid(),
        profileId: profile.id,
        ...(ev.signalId ? { signalId: idMap.get(ev.signalId) ?? ev.signalId } : {}),
      });
    }
    await tx.done;
    return profile;
  });
}

/** Remove every piece of Isyarat data from this device (IndexedDB + settings). */
export async function deleteAllData(): Promise<void> {
  await guard(() => deleteDatabase());
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('isyarat.')) localStorage.removeItem(k);
  } catch {
    // storage unavailable
  }
}

/* ---------- Sign packs (Labs) ---------- */

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
