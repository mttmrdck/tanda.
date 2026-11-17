import { afterEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { DB_NAME, deleteDatabase, getDB } from '../../src/store/db';
import { initialSnapshot } from '../../src/platform/contracts';
import { loadMonitoring, saveMonitoring } from '../../src/store/monitoringRepo';
import { deleteProfile } from '../../src/store/repo';

afterEach(async () => {
  await deleteDatabase();
});
describe('v2 → v3 monitoring migration', () => {
  it('retains profiles/signals/sign packs and creates an empty monitoring sidecar without implicit consent', async () => {
    await deleteDatabase();
    const old = await openDB(DB_NAME, 2, {
      upgrade(db) {
        db.createObjectStore('profiles', { keyPath: 'id' });
        db.createObjectStore('signals', { keyPath: 'id' }).createIndex('profileId', 'profileId');
        db.createObjectStore('examples', { keyPath: 'id' }).createIndex('signalId', 'signalId');
        const es = db.createObjectStore('events', { keyPath: 'id' });
        es.createIndex('profileId', 'profileId');
        es.createIndex('ts', 'ts');
        db.createObjectStore('signPacks', { keyPath: 'id' });
        db.createObjectStore('signProgress', { keyPath: 'key' }).createIndex('packId', 'packId');
      },
    });
    const profile = {
      id: 'p',
      nickname: 'Existing',
      comfortSteps: { calm: 'quiet', rising: 'pause', high: 'review' },
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    await old.put('profiles', profile);
    const signal={id:'legacy-signal',profileId:'p',name:{en:'Water',ms:''},meaning:{en:'Drink',ms:''},category:'need',urgency:'normal',icon:'droplet',createdAt:profile.createdAt};
    await old.put('signals',signal);
    await old.put('examples',{id:'legacy-example',signalId:signal.id,n:2,d:1,data:new Float32Array([.1,.2]).buffer,source:'teach',createdAt:profile.createdAt});

    await old.put('signPacks', { id: 'kept' });
    old.close();
    const upgraded = await getDB();
    expect(upgraded.version).toBe(3);
    expect(await upgraded.get('profiles', 'p')).toEqual(profile);
    expect(await upgraded.get('signals','legacy-signal')).toEqual(signal);
    expect(await upgraded.get('examples','legacy-example')).toBeDefined();
    expect(await upgraded.get('signPacks', 'kept')).toEqual({ id: 'kept' });
    const s = await loadMonitoring('p');
    expect(s.care.category).toBe('unspecified');
    expect(s.care.consent.video).toBe(false);
    await saveMonitoring(initialSnapshot('p'));
    await deleteProfile('p');
    expect(await upgraded.get('monitoring', 'p')).toBeUndefined();
  });
});
