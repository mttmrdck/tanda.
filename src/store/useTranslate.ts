import { create } from 'zustand';
import { EMPTY_STRIP, EMPTY_WORD, stripReduce, wordReduce, type Strip, type StripAction, type WordAction, type WordBox } from '../engine/translate/compose';
import type { TranslateSourceKind } from './translateSession';

/**
 * Translate's store slice — in memory only (nothing is written to storage). Separate from the Live screen's
 * state and from the child's data.
 */
export type TranslateTab = 'sign' | 'word' | 'spell';

interface TranslateState {
  packId: string | null;
  tab: TranslateTab;
  /** chosen video source for this visit (null = default for the pack) */
  source: TranslateSourceKind | null;
  strip: Strip;
  word: WordBox;
  /** speak confirmed words aloud (local voices only); off by default */
  speak: boolean;
  setPack: (id: string) => void;
  setTab: (t: TranslateTab) => void;
  setSource: (k: TranslateSourceKind) => void;
  stripDo: (a: StripAction) => void;
  wordDo: (a: WordAction) => void;
  setSpeak: (v: boolean) => void;
}

export const useTranslate = create<TranslateState>((set) => ({
  packId: null,
  tab: 'sign',
  source: null,
  strip: EMPTY_STRIP,
  word: EMPTY_WORD,
  speak: false,
  // a different pack's sign ids mean nothing here: start a fresh strip
  setPack: (id) => set((s) => (s.packId === id ? s : { packId: id, strip: EMPTY_STRIP, source: null })),
  setTab: (tab) => set({ tab }),
  setSource: (source) => set({ source }),
  stripDo: (a) => set((s) => ({ strip: stripReduce(s.strip, a) })),
  wordDo: (a) => set((s) => ({ word: wordReduce(s.word, a) })),
  setSpeak: (speak) => set({ speak }),
}));
