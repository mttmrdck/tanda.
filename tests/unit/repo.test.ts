import { beforeEach, describe, expect, it } from 'vitest';
import * as repo from '../../src/store/repo';

const sig = (profileId: string, name = 'Water') => ({
  profileId,
  name: { en: name, ms: '' },
  meaning: { en: `I want ${name}`, ms: '' },
  category: 'need' as const,
  urgency: 'normal' as const,
  icon: 'droplet',
});
const exData = (k: number) => new Float32Array(2 * 108).map((_, i) => Math.sin(i * 0.1 + k));

describe('repo (fake-indexeddb)', () => {
  beforeEach(async () => {
    await repo.deleteAllData();
  });

  it('creates, lists, updates profiles', async () => {
    const p = await repo.createProfile({ nickname: '  Aisyah ', ageBand: '5to8' });
    expect(p.nickname).toBe('Aisyah');
    expect(await repo.listProfiles()).toHaveLength(1);
    const u = await repo.updateProfile(p.id, { comfortSteps: { calm: 'a', rising: 'b', high: 'c' } });
    expect((await repo.getProfile(p.id))!.comfortSteps).toEqual(u.comfortSteps);
  });

  it('signals and examples CRUD; Float32Array round-trips', async () => {
    const p = await repo.createProfile({ nickname: 'A' });
    const s = await repo.createSignal(sig(p.id));
    await repo.addExample({ signalId: s.id, n: 2, d: 108, data: exData(1), source: 'teach' });
    const list = await repo.listExamples(s.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.data).toBeInstanceOf(Float32Array);
    expect(Array.from(list[0]!.data)).toEqual(Array.from(exData(1)));
    await repo.updateSignal(s.id, { urgency: 'high' });
    expect((await repo.listSignals(p.id))[0]!.urgency).toBe('high');
    await repo.deleteSignal(s.id);
    expect(await repo.listSignals(p.id)).toHaveLength(0);
    expect(await repo.listExamples(s.id)).toHaveLength(0);
  });

  it('caps examples per signal by evicting the most redundant one', async () => {
    const p = await repo.createProfile({ nickname: 'A' });
    const s = await repo.createSignal(sig(p.id));
    for (let k = 0; k < 3; k++) await repo.addExample({ signalId: s.id, n: 2, d: 108, data: exData(k), source: 'teach' }, 3);
    const r = await repo.addExample({ signalId: s.id, n: 2, d: 108, data: exData(0), source: 'feedback' }, 3);
    expect(r.evicted).not.toBeNull();
    expect(await repo.listExamples(s.id)).toHaveLength(3);
  });

  it('events: add, update feedback, list by range', async () => {
    const p = await repo.createProfile({ nickname: 'A' });
    const e = await repo.addEvent({ profileId: p.id, ts: '2026-03-01T10:00:00.000Z', kind: 'signal', signalId: 'x', confidence: 0.8 });
    await repo.addEvent({ profileId: p.id, ts: '2026-03-02T10:00:00.000Z', kind: 'calm-tier', tier: 'rising', score: 0.5 });
    await repo.updateEvent(e.id, { feedback: 'yes' });
    const day = await repo.listEvents(p.id, '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z');
    expect(day).toHaveLength(1);
    expect(day[0]!.feedback).toBe('yes');
  });

  it('cascade-deletes a profile', async () => {
    const p = await repo.createProfile({ nickname: 'A' });
    const keep = await repo.createProfile({ nickname: 'B' });
    const s = await repo.createSignal(sig(p.id));
    const k = await repo.createSignal(sig(keep.id));
    await repo.addExample({ signalId: s.id, n: 2, d: 108, data: exData(1), source: 'teach' });
    await repo.addEvent({ profileId: p.id, ts: '2026-03-01T10:00:00.000Z', kind: 'signal', signalId: s.id });
    await repo.deleteProfile(p.id);
    expect(await repo.listProfiles()).toEqual([keep]);
    expect(await repo.listExamples(s.id)).toHaveLength(0);
    expect(await repo.listEvents(p.id)).toHaveLength(0);
    expect(await repo.listSignals(keep.id)).toEqual([k]);
  });

  it('export → import creates a new profile with remapped ids; history optional', async () => {
    const p = await repo.createProfile({ nickname: 'A', comfortSteps: { calm: 'c', rising: 'r', high: 'h' } });
    const s = await repo.createSignal(sig(p.id));
    await repo.addExample({ signalId: s.id, n: 2, d: 108, data: exData(2), source: 'teach' });
    await repo.addEvent({ profileId: p.id, ts: '2026-03-01T10:00:00.000Z', kind: 'signal', signalId: s.id });
    const noHist = await repo.exportBundle(p.id, { includeHistory: false, settings: { sensitivity: 1, windowMs: 2000 } });
    expect(noHist.events).toBeUndefined();
    const b = await repo.exportBundle(p.id, { includeHistory: true, settings: { sensitivity: 1, windowMs: 2000 } });
    const imported = await repo.importBundle(b, 'A (copy)');
    expect(imported.id).not.toBe(p.id);
    expect(imported.nickname).toBe('A (copy)');
    const sigs = await repo.listSignals(imported.id);
    expect(sigs).toHaveLength(1);
    expect(sigs[0]!.id).not.toBe(s.id);
    const ex = await repo.listExamples(sigs[0]!.id);
    expect(Array.from(ex[0]!.data)).toEqual(Array.from(exData(2)));
    const evs = await repo.listEvents(imported.id);
    expect(evs[0]!.signalId).toBe(sigs[0]!.id);
    expect(await repo.listProfiles()).toHaveLength(2);
  });

  it('deleteAllData empties the database and settings', async () => {
    await repo.createProfile({ nickname: 'A' });
    localStorage.setItem('isyarat.settings.v1', '{}');
    await repo.deleteAllData();
    expect(await repo.listProfiles()).toHaveLength(0);
    expect(localStorage.getItem('isyarat.settings.v1')).toBeNull();
  });
});
