/**
 * Pure state for Translate's in-memory session: the "Signs so far" strip (confirmed signs, with undo) and the
 * fingerspelling word box. Nothing here is stored.
 */
export interface Strip {
  items: string[];
  /** previous `items` states, newest last (undo) */
  past: string[][];
}
export type StripAction = { type: 'add'; signId: string } | { type: 'undo' } | { type: 'clear' };
export const EMPTY_STRIP: Strip = { items: [], past: [] };
const HISTORY = 50;

export function stripReduce(s: Strip, a: StripAction): Strip {
  switch (a.type) {
    case 'add':
      return { items: [...s.items, a.signId], past: [...s.past, s.items].slice(-HISTORY) };
    case 'clear':
      return s.items.length ? { items: [], past: [...s.past, s.items].slice(-HISTORY) } : s;
    case 'undo':
      return s.past.length ? { items: s.past[s.past.length - 1]!, past: s.past.slice(0, -1) } : s;
  }
}

/** Copy-as-text: the glosses as a list, never joined into a sentence. */
export const stripText = (items: readonly string[], gloss: (id: string) => string) => items.map(gloss).join(' · ');

export interface WordBox {
  text: string;
}
export type WordAction = { type: 'letter'; ch: string } | { type: 'space' } | { type: 'backspace' } | { type: 'clear' };
export const EMPTY_WORD: WordBox = { text: '' };

export function wordReduce(w: WordBox, a: WordAction): WordBox {
  switch (a.type) {
    case 'letter':
      return { text: w.text + a.ch };
    case 'space':
      return w.text && !w.text.endsWith(' ') ? { text: `${w.text} ` } : w;
    case 'backspace':
      return { text: [...w.text].slice(0, -1).join('') };
    case 'clear':
      return EMPTY_WORD;
  }
}
