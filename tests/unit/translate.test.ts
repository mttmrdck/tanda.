import 'fake-indexeddb/auto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { buildModel } from '../../src/engine/classifier';
import { Recognizer } from '../../src/engine/recognizer';
import { demoPack, demoTake, DEMO_GESTURE } from '../../src/engine/sign/demoPack';
import { buildPackModels } from '../../src/engine/sign/models';
import { rankCandidates } from '../../src/engine/translate/candidates';
import { EMPTY_STRIP, EMPTY_WORD, stripReduce, stripText, wordReduce } from '../../src/engine/translate/compose';
import { alphabet, fingerspellWord, planWords, searchSigns } from '../../src/engine/translate/search';
import { clipFeatures } from '../../src/engine/processor';
import { createRng, DEFAULT_PLACEMENT, renderFrame, simulateClip } from '../../src/engine/simulator';
import { FrameProcessor } from '../../src/engine/processor';
import { featureMotionEnergy } from '../../src/engine/motion';
import { heldWindow } from '../../src/engine/sign/window';
import { resampleClip } from '../../src/engine/resample';
import { bestSubWindow } from '../../src/engine/motion';
import { pickVoice } from '../../src/ui/hooks/speech';
import { addExample, createProfile, createSignal, examplesByProfile, listSignals } from '../../src/store/repo';
import { listSignPacks, saveSignPack } from '../../src/store/signRepo';

const ROOT = resolve(__dirname, '../..');

/** Runtime (non-type) relative imports of a module, transitively. */
function closure(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = entries.map((e) => resolve(ROOT, e));
  const re = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\sfrom\s+)?['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(re)) {
      const spec = m[1] ?? m[2]!;
      const base = resolve(dirname(file), spec);
      const hit = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((p) => existsSync(p) && !p.endsWith('/') && readable(p));
      if (hit) stack.push(hit);
    }
  }
  return new Set([...seen].map((f) => f.slice(ROOT.length + 1)));
}
const readable = (p: string) => {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
};

const frames = (g: Parameters<typeof simulateClip>[0], seed: number) => clipFeatures(simulateClip(g, { seed, noise: 0.006, durationMs: 2500, dropout: 0.02 }));
const windows = (fs: ReturnType<typeof frames>) => {
  const mv = bestSubWindow(fs, 2000);
  const hd = heldWindow(fs);
  return [
    { clip: resampleClip(mv, CLIP_N, D), energy: featureMotionEnergy(mv) },
    { clip: resampleClip(hd, CLIP_N, D), energy: featureMotionEnergy(hd) },
  ] as const;
};

describe('isolation: Translate and Live never see each other', () => {
  it('Translate code cannot reach the Live session, recogniser, child data or Live screen', () => {
    const t = closure(['src/ui/pages/translate/Translate.tsx', 'src/store/translateSession.ts', 'src/store/useTranslate.ts']);
    for (const banned of [
      'src/store/useSession.ts',
      'src/store/useData.ts',
      'src/store/repo.ts',
      'src/engine/recognizer.ts',
      'src/engine/calmWatch.ts',
      'src/ui/pages/Live.tsx',
      'src/ui/components/LiveBits.tsx',
      'src/ui/components/VideoPanel.tsx',
      'src/ui/components/CameraStage.tsx',
      'src/ui/SessionSync.tsx',
    ]) {
      expect(t.has(banned), banned).toBe(false);
    }
    expect(t.has('src/store/translateSession.ts')).toBe(true); // sanity: the walker follows imports
  });

  it('Live code cannot reach sign packs, Translate or its session', () => {
    const live = closure(['src/ui/pages/Live.tsx', 'src/store/useData.ts', 'src/store/useSession.ts', 'src/ui/SessionSync.tsx']);
    const leaks = [...live].filter((f) => /^src\/(engine\/sign\/|engine\/translate\/|ui\/pages\/translate\/|ui\/pages\/signs\/)|^src\/store\/(useSignPacks|signRepo|translateSession|useTranslate)\.ts$/.test(f));
    expect(leaks).toEqual([]);
    expect(live.has('src/engine/recognizer.ts')).toBe(true); // sanity
  });

  it('pack signs and child signals live in different stores and never mix, even for the same movement', async () => {
    const profile = await createProfile({ nickname: 'Iso' });
    const sig = await createSignal({ profileId: profile.id, name: { en: 'Hello', ms: '' }, meaning: { en: 'Hello!', ms: '' }, category: 'social', urgency: 'low', icon: 'hug' });
    for (let k = 0; k < 3; k++) await addExample({ signalId: sig.id, n: CLIP_N, d: D, data: demoTake('wave', 600 + k)!, source: 'teach' });
    await saveSignPack({ ...demoPack(), id: 'iso-pack', demo: false, builtIn: false });

    const packs = await listSignPacks();
    const packSignIds = new Set(packs.flatMap((p) => p.signs.map((s) => s.id)));
    expect(packSignIds.has(sig.id)).toBe(false);
    const childIds = new Set((await listSignals(profile.id)).map((s) => s.id));
    expect([...childIds].some((id) => packSignIds.has(id))).toBe(false);
    expect([...(await examplesByProfile(profile.id)).keys()]).toEqual([sig.id]);

    // Translate's matcher only knows pack signs; Live's recogniser only knows the child's signal
    const [move, held] = windows(frames('wave', 4321));
    const pack = packs.find((p) => p.id === 'iso-pack')!;
    const cands = rankCandidates(move, held, buildPackModels(pack));
    expect(cands.candidates.length).toBeGreaterThan(0);
    for (const c of cands.candidates) expect(packSignIds.has(c.signId) && !childIds.has(c.signId)).toBe(true);

    const rec = new Recognizer({ windowMs: 2000, sensitivity: 1 });
    const ex = (await examplesByProfile(profile.id)).get(sig.id)!.map((e) => e.data);
    rec.setModels([buildModel({ id: sig.id, urgency: 'low', category: 'social' }, ex, CLIP_N, D)]);
    const proc = new FrameProcessor();
    const rng = createRng(5);
    const emitted = new Set<string>();
    for (let tm = 0; tm < 6000; tm += 1000 / 15) {
      const raw = renderFrame('wave', { u: (tm / 1000) % 2 / 2, tSec: tm / 1000, amp: 1, rate: 1 }, DEFAULT_PLACEMENT, Math.round(tm), rng, { noise: 0.006, dropout: 0.02 });
      const ev = rec.push(proc.process(raw).features);
      if (ev?.emitted) emitted.add(ev.emitted.signalId);
    }
    expect([...emitted]).toEqual([sig.id]);
  });
});

describe('candidate ranking (demo pack, synthetic)', () => {
  const pack = demoPack();
  const models = buildPackModels(pack);

  it('ranks the performed sign first, at most 3 candidates, best first', () => {
    const [move, held] = windows(frames('tapTable', 77));
    const r = rankCandidates(move, held, models);
    expect(r.candidates[0]?.signId).toBe('demo-tap');
    expect(r.candidates.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < r.candidates.length; i++) expect(r.candidates[i]!.ratio).toBeGreaterThanOrEqual(r.candidates[i - 1]!.ratio);
  });

  it('a held handshape is ranked by the static matcher', () => {
    const [move, held] = windows(frames('shapePoint', 78));
    expect(rankCandidates(move, held, models).candidates[0]).toMatchObject({ signId: 'demo-point', kind: 'static' });
  });

  it('rejects: stillness and untaught movement are "not sure", never forced', () => {
    for (const g of ['idle', 'rock', 'flap'] as const) {
      const [move, held] = windows(frames(g, 79));
      expect(rankCandidates(move, held, models).notSure, g).toBe(true);
    }
  });

  it('reports low landmark quality when no hands are seen', () => {
    const empty = { clip: new Float32Array(CLIP_N * D), energy: 0 };
    expect(rankCandidates(empty, empty, models).quality).toBe('no-hands');
  });

  it('respects a restriction (fingerspelling alphabet only)', () => {
    const [move, held] = windows(frames('wave', 80));
    expect(rankCandidates(move, held, models, { only: new Set(['demo-open']) }).candidates.every((c) => c.signId === 'demo-open')).toBe(true);
  });

  it('synthetic accuracy on the demo pack (not real signs, not real signers)', () => {
    let top1 = 0;
    let top3 = 0;
    let total = 0;
    for (const s of pack.signs) {
      for (let seed = 1; seed <= 6; seed++) {
        const [move, held] = windows(frames(DEMO_GESTURE[s.id]!, 20_000 + seed));
        const ids = rankCandidates(move, held, models).candidates.map((c) => c.signId);
        total++;
        if (ids[0] === s.id) top1++;
        if (ids.includes(s.id)) top3++;
      }
    }
    console.log(`Translate demo pack (synthetic): top-1 ${((top1 / total) * 100).toFixed(1)}%, top-3 ${((top3 / total) * 100).toFixed(1)}%, n=${total}`);
    expect(top3 / total).toBeGreaterThanOrEqual(0.9);
  });

  it('ranking is fast enough for a sub-second result', () => {
    const [move, held] = windows(frames('wave', 81));
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) rankCandidates(move, held, models);
    const ms = (performance.now() - t0) / 20;
    console.log(`rankCandidates: ${ms.toFixed(2)} ms per capture (8 signs × 5 templates)`);
    expect(ms).toBeLessThan(100);
  });
});

describe('word search and queue', () => {
  const pack = demoPack();
  it('finds signs by English or BM gloss (prefix and word-prefix)', () => {
    expect(searchSigns(pack, 'wave')[0]?.id).toBe('demo-wave');
    expect(searchSigns(pack, 'lambai')[0]?.id).toBe('demo-wave');
    expect(searchSigns(pack, 'han').map((s) => s.id)).toContain('demo-mouth');
    expect(searchSigns(pack, '   ')).toEqual([]);
  });

  it('queues several words; multi-word glosses match greedily; missing words get a spelling plan', () => {
    const q = planWords('wave  hand to mouth, banana', pack);
    expect(q.map((x) => [x.text, x.signId])).toEqual([
      ['wave', 'demo-wave'],
      ['hand to mouth', 'demo-mouth'],
      ['banana', null],
    ]);
    expect(q[2]!.spell?.map((s) => s.status)).toEqual(['ok', 'ok', 'missing', 'ok', 'missing', 'ok']);
  });

  it('a pack without an alphabet offers no spelling', () => {
    const noAbc = { ...pack, signs: pack.signs.filter((s) => !s.letter) };
    expect(planWords('xyz', noAbc)[0]!.spell).toBeNull();
  });
});

describe('fingerspelling', () => {
  const pack = demoPack();
  it('spells only letters with real templates; J/Z without a moving template are unsupported', () => {
    expect([...alphabet(pack).keys()].sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(fingerspellWord('Ab-c j e', pack).map((s) => [s.char, s.status])).toEqual([
      ['A', 'ok'],
      ['B', 'ok'],
      ['C', 'ok'],
      ['J', 'unsupported'],
      ['E', 'missing'],
    ]);
  });

  it('a static J is not accepted as J (J involves movement)', () => {
    const withJ = { ...pack, signs: [...pack.signs, { ...pack.signs.find((s) => s.id === 'demo-fist')!, id: 'j-static', gloss: 'J', letter: 'J' }] };
    expect(alphabet(withJ).has('J')).toBe(false);
    expect(fingerspellWord('j', withJ)[0]!.status).toBe('unsupported');
  });

  it('word box: letters, space, backspace, clear', () => {
    let w = EMPTY_WORD;
    for (const ch of 'AB') w = wordReduce(w, { type: 'letter', ch });
    w = wordReduce(w, { type: 'space' });
    w = wordReduce(w, { type: 'space' });
    w = wordReduce(w, { type: 'letter', ch: 'C' });
    expect(w.text).toBe('AB C');
    expect(wordReduce(w, { type: 'backspace' }).text).toBe('AB ');
    expect(wordReduce(w, { type: 'clear' }).text).toBe('');
  });

  it('signs-so-far strip: add, undo, clear (undoable), copy as a list', () => {
    let s = EMPTY_STRIP;
    s = stripReduce(s, { type: 'add', signId: 'a' });
    s = stripReduce(s, { type: 'add', signId: 'b' });
    expect(stripText(s.items, (id) => id.toUpperCase())).toBe('A · B');
    s = stripReduce(s, { type: 'clear' });
    expect(s.items).toEqual([]);
    s = stripReduce(s, { type: 'undo' });
    expect(s.items).toEqual(['a', 'b']);
    s = stripReduce(s, { type: 'undo' });
    expect(s.items).toEqual(['a']);
  });
});

describe('speech: local voices only', () => {
  const v = (lang: string, localService: boolean) => ({ lang, localService, name: lang, voiceURI: lang, default: false }) as SpeechSynthesisVoice;
  it('never picks a network voice; no local voice → nothing (the speak button is hidden)', () => {
    expect(pickVoice('en', [v('en-US', false)])).toBeNull();
    expect(pickVoice('en', [v('en-US', false), v('en-GB', true)])?.lang).toBe('en-GB');
    expect(pickVoice('ms', [v('ms-MY', false)])).toBeNull();
  });
});
