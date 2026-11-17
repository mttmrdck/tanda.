import { create } from 'zustand';
import type { CaptureSource } from '../engine/types';

/** Hand-off from Live ("New meaning") to Teach: the captured window becomes example 1. In memory only. */
export const useTeachDraft = create<{
  preloaded: Float32Array | null;
  /** camera or simulated demo performer — carried onto the saved example */
  capture: CaptureSource | null;
  set: (w: Float32Array | null, capture?: CaptureSource | null) => void;
}>((set) => ({
  preloaded: null,
  capture: null,
  set: (w, capture = null) => set({ preloaded: w, capture: w ? capture : null }),
}));
