import { create } from 'zustand';

/** Hand-off from Live ("New meaning") to Teach: the captured window becomes example 1. In memory only. */
export const useTeachDraft = create<{ preloaded: Float32Array | null; set: (w: Float32Array | null) => void }>((set) => ({
  preloaded: null,
  set: (w) => set({ preloaded: w }),
}));
