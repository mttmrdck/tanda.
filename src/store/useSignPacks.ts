import { create } from 'zustand';
import { demoPack } from '../engine/sign/demoPack';
import { buildPackModels, type PackModels } from '../engine/sign/models';
import type { SignPack } from '../engine/sign/pack';
import { ASL_STARTER, PackRegistry } from '../engine/sign/registry';
import { deleteSignPack, listSignPacks, saveSignPack } from './signRepo';

/** Sign packs (Labs). Built-in packs come from code; device packs from IndexedDB. Loaded only on sign pages. */
const registry = new PackRegistry([ASL_STARTER, demoPack()]);

interface SignPacksState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  packs: SignPack[];
  load: () => Promise<void>;
  save: (p: SignPack) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSignPacks = create<SignPacksState>((set, get) => ({
  status: 'idle',
  packs: registry.list(),
  load: async () => {
    set({ status: 'loading' });
    try {
      registry.setUserPacks(await listSignPacks());
      set({ status: 'ready', packs: registry.list() });
    } catch {
      set({ status: 'error' });
    }
  },
  save: async (p) => {
    await saveSignPack(p);
    await get().load();
  },
  remove: async (id) => {
    await deleteSignPack(id);
    await get().load();
  },
}));

export const isBuiltInPack = (id: string) => registry.isBuiltIn(id);

const modelCache = new Map<string, { stamp: string; models: PackModels }>();
/** Matching models for a pack, rebuilt only when the pack changes. */
export function modelsFor(pack: SignPack): PackModels {
  const stamp = `${pack.version}|${pack.updatedAt}|${pack.signs.length}`;
  const hit = modelCache.get(pack.id);
  if (hit && hit.stamp === stamp) return hit.models;
  const models = buildPackModels(pack);
  modelCache.set(pack.id, { stamp, models });
  return models;
}
