import type { Sign, SignPack } from '../sign/pack';

/**
 * Word ↔ sign lookups over ONE pack: gloss search (English and BM), a word queue for several typed words, and
 * fingerspelling plans. Nothing here invents a sign: a word that has no recorded sign is reported as missing.
 */
export const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Signs whose EN or BM gloss matches `q`: exact, then prefix, then word-prefix, then substring. */
export function searchSigns(pack: SignPack, q: string, limit = 8): Sign[] {
  const n = norm(q);
  if (!n) return [];
  const score = (g: string) => {
    const x = norm(g);
    if (!x) return Infinity;
    if (x === n) return 0;
    if (x.startsWith(n)) return 1;
    if (x.split(' ').some((w) => w.startsWith(n))) return 2;
    if (x.includes(n)) return 3;
    return Infinity;
  };
  return pack.signs
    .map((s) => ({ s, sc: Math.min(score(s.gloss), score(s.gloss_ms)) }))
    .filter((x) => Number.isFinite(x.sc))
    .sort((a, b) => a.sc - b.sc || a.s.gloss.localeCompare(b.s.gloss))
    .slice(0, limit)
    .map((x) => x.s);
}

/** The letter a sign fingerspells: its `letter` field, or a single-letter gloss. */
export function letterOf(s: Sign): string | null {
  if (s.letter) return s.letter;
  const g = s.gloss.trim().toUpperCase();
  return /^\p{Lu}$/u.test(g) ? g : null;
}

/** Letters whose handshape involves movement: they need a dynamic template. */
export const MOVING_LETTERS: ReadonlySet<string> = new Set(['J', 'Z']);

/** The pack's fingerspelling alphabet: letter → sign. A moving letter only counts with a dynamic template. */
export function alphabet(pack: SignPack): Map<string, Sign> {
  const out = new Map<string, Sign>();
  for (const s of pack.signs) {
    const l = letterOf(s);
    if (!l || s.templates.length === 0) continue;
    if (MOVING_LETTERS.has(l) && s.type !== 'dynamic') continue;
    if (!out.has(l)) out.set(l, s);
  }
  return out;
}

export type SpellStatus = 'ok' | 'missing' | 'unsupported';
export interface SpellStep {
  char: string;
  signId: string | null;
  status: SpellStatus;
}

/** A word fingerspelled with the pack's real templates only. J/Z without a moving template are "unsupported". */
export function fingerspellWord(word: string, pack: SignPack): SpellStep[] {
  const abc = alphabet(pack);
  const steps: SpellStep[] = [];
  for (const ch of word.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase()) {
    if (!/\p{Lu}/u.test(ch)) continue;
    const s = abc.get(ch);
    if (s) steps.push({ char: ch, signId: s.id, status: 'ok' });
    else steps.push({ char: ch, signId: null, status: MOVING_LETTERS.has(ch) ? 'unsupported' : 'missing' });
  }
  return steps;
}

export interface QueueItem {
  text: string;
  /** the pack's sign for this word, or null: "not in this pack" */
  signId: string | null;
  /** for a missing word in a pack with an alphabet: its fingerspelling plan */
  spell: SpellStep[] | null;
}

/**
 * Several typed words → a queue. Multi-word glosses (e.g. "thank you") are matched greedily (up to 3 words).
 * A word with no sign is "not in this pack"; if the pack has an alphabet it gets a fingerspelling plan.
 */
export function planWords(text: string, pack: SignPack): QueueItem[] {
  const tokens = norm(text).split(' ').filter(Boolean);
  const byGloss = new Map<string, string>();
  for (const s of pack.signs) {
    if (s.templates.length === 0) continue;
    for (const g of [s.gloss, s.gloss_ms]) {
      const k = norm(g);
      // demo glosses carry a "Demo:" label; the word itself is what people type
      for (const key of pack.demo ? [k, k.replace(/^demo /, '')] : [k]) if (key && !byGloss.has(key)) byGloss.set(key, s.id);
    }
  }
  const hasAlphabet = alphabet(pack).size > 0;
  const out: QueueItem[] = [];
  for (let i = 0; i < tokens.length; ) {
    let matched = false;
    for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(' ');
      const id = byGloss.get(phrase);
      if (id) {
        out.push({ text: phrase, signId: id, spell: null });
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push({ text: tokens[i]!, signId: null, spell: hasAlphabet ? fingerspellWord(tokens[i]!, pack) : null });
      i++;
    }
  }
  return out;
}
