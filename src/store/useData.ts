import { create } from 'zustand';
import { buildModel, type ClassModel } from '../engine/classifier';
import type { Example, Profile, Signal } from '../engine/types';
import * as repo from './repo';
import { RepoError, type RepoErrorCode } from './repo';
import { useSettings } from './useApp';

interface DataState {
  status: 'loading' | 'ready' | 'error';
  error: RepoErrorCode | null;
  profiles: Profile[];
  profile: Profile | null;
  signals: Signal[];
  examples: Record<string, Example[]>;
  models: ClassModel[];
  load: () => Promise<void>;
  selectProfile: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (p: Profile) => void;
}

function models(signals: Signal[], examples: Record<string, Example[]>): ClassModel[] {
  return signals
    .map((s) => {
      const ex = examples[s.id] ?? [];
      const first = ex[0];
      return first ? buildModel(s, ex.map((e) => e.data), first.n, first.d) : null;
    })
    .filter((m): m is ClassModel => m !== null);
}

export const useData = create<DataState>((set, get) => ({
  status: 'loading',
  error: null,
  profiles: [],
  profile: null,
  signals: [],
  examples: {},
  models: [],

  load: async () => {
    try {
      const profiles = await repo.listProfiles();
      const wanted = useSettings.getState().activeProfileId;
      const profile = profiles.find((p) => p.id === wanted) ?? profiles[0] ?? null;
      if (profile && profile.id !== wanted) useSettings.getState().set({ activeProfileId: profile.id });
      set({ profiles, profile });
      await get().refresh();
      set({ status: 'ready', error: null });
    } catch (err) {
      set({ status: 'error', error: err instanceof RepoError ? err.code : 'unknown' });
    }
  },

  selectProfile: async (id) => {
    const profile = get().profiles.find((p) => p.id === id) ?? null;
    useSettings.getState().set({ activeProfileId: id });
    set({ profile });
    await get().refresh();
  },

  refresh: async () => {
    const profile = get().profile;
    const profiles = await repo.listProfiles();
    const fresh = profile ? (profiles.find((p) => p.id === profile.id) ?? null) : null;
    if (!fresh) {
      set({ profiles, profile: null, signals: [], examples: {}, models: [] });
      return;
    }
    const signals = await repo.listSignals(fresh.id);
    const examples: Record<string, Example[]> = {};
    for (const s of signals) examples[s.id] = await repo.listExamples(s.id);
    set({ profiles, profile: fresh, signals, examples, models: models(signals, examples) });
  },

  setProfile: (p) => set((s) => ({ profile: p, profiles: s.profiles.map((x) => (x.id === p.id ? p : x)) })),
}));
