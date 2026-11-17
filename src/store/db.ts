import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SignPack } from '../engine/sign/pack';
import type { EventRecord, Profile, Signal } from '../engine/types';

export const DB_NAME = 'isyarat';
export const DB_VERSION = 2;

/** Example as stored: Float32Array kept as an ArrayBuffer. */
export interface StoredExample {
  id: string;
  signalId: string;
  n: number;
  d: number;
  data: ArrayBuffer;
  source: 'teach' | 'feedback';
  createdAt: string;
}

/** Per-sign practice progress — local only. */
export interface SignProgress {
  /** `${packId}:${signId}` */
  key: string;
  packId: string;
  signId: string;
  attempts: number;
  close: number;
  /** current run of "close" attempts (never shown as a loss) */
  streak: number;
  bestStreak: number;
  lastAt: string;
}

export interface IsyaratDB extends DBSchema {
  profiles: { key: string; value: Profile };
  signals: { key: string; value: Signal; indexes: { profileId: string } };
  examples: { key: string; value: StoredExample; indexes: { signalId: string } };
  events: { key: string; value: EventRecord; indexes: { profileId: string; ts: string } };
  /** sign packs created or imported on this device (built-in packs are not stored) */
  signPacks: { key: string; value: SignPack };
  signProgress: { key: string; value: SignProgress; indexes: { packId: string } };
}

let dbp: Promise<IDBPDatabase<IsyaratDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<IsyaratDB>> {
  if (!dbp) {
    dbp = openDB<IsyaratDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('profiles', { keyPath: 'id' });
          db.createObjectStore('signals', { keyPath: 'id' }).createIndex('profileId', 'profileId');
          db.createObjectStore('examples', { keyPath: 'id' }).createIndex('signalId', 'signalId');
          const ev = db.createObjectStore('events', { keyPath: 'id' });
          ev.createIndex('profileId', 'profileId');
          ev.createIndex('ts', 'ts');
        }
        if (oldVersion < 2) {
          db.createObjectStore('signPacks', { keyPath: 'id' });
          db.createObjectStore('signProgress', { keyPath: 'key' }).createIndex('packId', 'packId');
        }
      },
      blocking() {
        // Another tab wants to upgrade/delete: close so it can proceed.
        void dbp?.then((d) => d.close());
        dbp = null;
      },
    });
    dbp.catch(() => {
      dbp = null;
    });
  }
  return dbp;
}

/** Close the connection and delete the whole database. */
export async function deleteDatabase(): Promise<void> {
  if (dbp) {
    try {
      (await dbp).close();
    } catch {
      // already closed
    }
    dbp = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('deleteDatabase failed'));
    req.onblocked = () => resolve();
  });
}
