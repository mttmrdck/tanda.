import { describe, expect, it } from 'vitest';
import { CLIP_N, D } from '../../src/engine/constants';
import { findConfusables } from '../../src/engine/sign/confusable';
import { DEMO_GESTURE, demoPack, demoTake } from '../../src/engine/sign/demoPack';
import { practiceFeedback } from '../../src/engine/sign/feedback';
import { benchmark, parseLabels } from '../../src/engine/sign/metrics';
import { buildPackModels, recogniseDynamic, recogniseStatic } from '../../src/engine/sign/models';
import { encodeFloats, encryptPack, isEncryptedPack, PackError, readPackFile, serialisePack, validatePack, withdrawSigner, type SignPack } from '../../src/engine/sign/pack';
import { checkTakes } from '../../src/engine/sign/quality';
import { ASL_STARTER, PackRegistry } from '../../src/engine/sign/registry';
import { classifyStatic, buildStaticModel, handDistance, normalizeHand } from '../../src/engine/sign/staticHand';
import { featureMotionEnergy } from '../../src/engine/motion';
import { clipFeatures } from '../../src/engine/processor';
import { simulateClip } from '../../src/engine/simulator';
import { placeHand, type HandShape } from '../../src/engine/simulator/hands';
import { heldWindow } from '../../src/engine/sign/window';

const NOW = '2026-11-17T00:00:00.000Z';

function tinyPack(over: Partial<SignPack> = {}): SignPack {
  const clip = new Float32Array(CLIP_N * D).fill(0.25);
  return {
    ...ASL_STARTER,
    id: 'my-asl',
    builtIn: false,
    signs: [{ id: 'hello', gloss: 'HELLO', gloss_ms: '', type: 'dynamic', notes: '', confusableWith: [], templates: [{ n: CLIP_N, d: D, data: encodeFloats(clip), recordedAt: NOW, signerId: 's1' }] }],
    signerCredits: [{ id: 's1', name: 'Volunteer A', consentedAt: NOW }],
    ...over,
  };
}

describe('sign pack — schema and files', () => {
  it('validates the built-in packs', () => {
    expect(validatePack(ASL_STARTER).signs).toHaveLength(0);
    expect(validatePack(demoPack()).demo).toBe(true);
  });

  it('rejects non-packs, other versions, bad template sizes, duplicate ids and unknown signer references', () => {
    const bad = (o: unknown, code: string) => expect(() => validatePack(o)).toThrow(expect.objectContaining({ code }) as Error);
    bad({ format: 'x' }, 'not-signpack');
    bad({ ...tinyPack(), schema: 2 }, 'unsupported-version');
    const p = tinyPack();
    bad({ ...p, signs: [{ ...p.signs[0]!, templates: [{ ...p.signs[0]!.templates[0]!, n: 3 }] }] }, 'invalid-content');
    bad({ ...p, signs: [p.signs[0]!, p.signs[0]!] }, 'invalid-content');
    bad({ ...p, signerCredits: [] }, 'invalid-content');
    bad({ ...p, id: 'Has Spaces' }, 'invalid-content');
  });

  it('round-trips plain and encrypted files; wrong passphrase is told apart', async () => {
    const p = tinyPack();
    const plain = serialisePack(p);
    expect(isEncryptedPack(plain)).toBe(false);
    expect(await readPackFile(plain)).toEqual(p);
    const enc = await encryptPack(p, 'correct horse', 1000);
    expect(isEncryptedPack(enc)).toBe(true);
    expect(enc).not.toContain('HELLO');
    expect(await readPackFile(enc, 'correct horse')).toEqual(p);
    await expect(readPackFile(enc, 'wrong horse!')).rejects.toBeInstanceOf(PackError);
    await expect(readPackFile(enc, 'wrong horse!')).rejects.toMatchObject({ code: 'wrong-passphrase' });
    await expect(encryptPack(p, 'short')).rejects.toMatchObject({ code: 'weak-passphrase' });
  });

  it('imported packs are never built-in, even if the file says so', async () => {
    expect((await readPackFile(JSON.stringify({ ...tinyPack(), builtIn: true }))).builtIn).toBe(false);
  });

  it('a signer can withdraw: their templates and credit go, empty signs are dropped', () => {
    const w = withdrawSigner(tinyPack(), 's1', NOW);
    expect(w.signs).toHaveLength(0);
    expect(w.signerCredits).toHaveLength(0);
  });
});

describe('pack registry', () => {
  it('lists built-ins then device packs; a device pack cannot shadow a built-in id', () => {
    const r = new PackRegistry([ASL_STARTER, demoPack()]);
    r.setUserPacks([tinyPack(), tinyPack({ id: 'asl', title_en: 'impostor' })]);
    expect(r.list().map((p) => p.id)).toEqual(['asl', 'demo', 'my-asl']);
    expect(r.get('asl')?.title_en).toBe('ASL (American Sign Language)');
    expect(r.isBuiltIn('my-asl')).toBe(false);
  });

  it('a BIM pack plugs in as data only', () => {
    const r = new PackRegistry([ASL_STARTER]);
    r.setUserPacks([tinyPack({ id: 'bim-test', language: 'BIM', title_en: 'BIM (Bahasa Isyarat Malaysia)' })]);
    expect(r.get('bim-test')?.language).toBe('BIM');
  });
});

describe('static handshape classifier — invariance', () => {
  const raw = (shape: HandShape, wrist: [number, number], scale: number, angle: number, side: 'left' | 'right') =>
    placeHand(shape, wrist, scale, angle, side).flatMap(([x, y]) => [x, y]);

  it('is invariant to translation, scale and in-plane rotation', () => {
    const ref = normalizeHand(raw('point', [0, 0], 1, 0, 'right'), 'right');
    for (const [w, s, a] of [[[0.3, 0.7], 0.08, 0.4], [[-2, 5], 3, -1.2], [[0.5, 0.5], 0.2, 2.5]] as const) {
      expect(handDistance(ref, normalizeHand(raw('point', [w[0], w[1]], s, a, 'right'), 'right'))).toBeLessThan(1e-4);
    }
  });

  it('mirrors a left hand onto the right-hand template', () => {
    const right = normalizeHand(raw('thumbsUp', [0, 0], 1, 0.2, 'right'), 'right');
    const left = normalizeHand(raw('thumbsUp', [0.4, 0.1], 0.5, -0.2, 'left'), 'left');
    expect(handDistance(right, left)).toBeLessThan(1e-4);
  });

  it('tells different shapes apart and rejects an unknown one', () => {
    const shapes: HandShape[] = ['open', 'fist', 'point'];
    const models = shapes.map((s) => buildStaticModel(s, [0, 0.1, -0.1].map((a) => normalizeHand(raw(s, [0, 0], 1, a, 'right'), 'right'))));
    for (const s of shapes) expect(classifyStatic(normalizeHand(raw(s, [1, 1], 2, 0.3, 'right'), 'right'), models).signId).toBe(s);
    const r = classifyStatic(normalizeHand(raw('thumbsUp', [0, 0], 1, 0, 'right'), 'right'), models.filter((m) => m.signId !== 'fist'));
    expect(r.signId).toBeNull();
  });
});

describe('demo pack (synthetic — simulator, not real signs)', () => {
  const pack = demoPack();
  const models = buildPackModels(pack);

  it('every demo sign has 5 templates and a performer gesture', () => {
    for (const s of pack.signs) {
      expect(s.templates).toHaveLength(5);
      expect(DEMO_GESTURE[s.id]).toBeDefined();
    }
  });

  it('synthetic benchmark: unseen takes are recognised (≥ 85%) and stillness is never a sign', () => {
    const items: { truth: string; pred: string | null }[] = [];
    for (const s of pack.signs) {
      for (let seed = 1; seed <= 8; seed++) {
        const g = DEMO_GESTURE[s.id]!;
        const clip = demoTake(g, 90_000 + seed, 0.006, s.type)!;
        const energy = featureMotionEnergy(clipFeatures(simulateClip(g, { seed: 90_000 + seed, noise: 0.006, durationMs: 2500, dropout: 0.02 })));
        const pred = s.type === 'static' ? recogniseStatic(clip, models).signId : recogniseDynamic(clip, models, energy).signalId;
        items.push({ truth: s.id, pred });
      }
    }
    const res = benchmark(pack.signs.map((s) => s.id), items);
    console.log(`demo pack (synthetic): accuracy ${(res.accuracy! * 100).toFixed(1)}%, not sure ${(res.notSureRate! * 100).toFixed(1)}%`);
    expect(res.accuracy!).toBeGreaterThanOrEqual(0.85);
    const idle = demoTake('idle', 5)!;
    expect(recogniseDynamic(idle, models, 0.05).signalId).toBeNull();
    // resting open hands on the table are not the raised "open hand" sign (location gate)
    for (let seed = 1; seed <= 8; seed++) expect(recogniseStatic(demoTake('idle', 300 + seed, 0.006, 'static')!, models).signId).toBeNull();
  });

  it('practice feedback: the right sign is "close"; a different sign says what differed', () => {
    const clip = demoTake('wave', 4242)!;
    expect(practiceFeedback(clip, 1, 'demo-wave', models).verdict).toBe('close');
    const wrong = practiceFeedback(demoTake('tapTable', 4242)!, 1, 'demo-wave', models);
    expect(wrong.verdict).toBe('try-again');
    expect(wrong.component).not.toBeNull();
    // fist instead of point: the handshape is what differs
    const shape = practiceFeedback(demoTake('shapeFist', 4243, 0.006, 'static')!, 0.05, 'demo-point', models);
    expect(shape.verdict).toBe('try-again');
    expect(shape.component).toBe('handshape');
    expect(shape.lookedLike).toBe('demo-fist');
    // holding still for a moving sign: movement
    expect(practiceFeedback(demoTake('idle', 4244)!, 0.05, 'demo-wave', models).component).toBe('movement');
  });

  it('location feedback: the same movement in a different place', () => {
    const clip = demoTake('wave', 4245)!;
    const moved = new Float32Array(clip);
    for (let f = 0; f < CLIP_N; f++) for (const slot of [7, 8]) moved[f * D + 2 * slot + 1] = moved[f * D + 2 * slot + 1]! + 1.2;
    const fb = practiceFeedback(moved, 1, 'demo-wave', models);
    expect(fb.ratios.location).toBeGreaterThan(fb.ratios.movement);
  });

  it('confusable detection flags near-identical signs', () => {
    const twin = { ...pack.signs.find((s) => s.id === 'demo-fist')!, id: 'demo-fist-twin', gloss: 'twin' };
    const m = buildPackModels({ ...pack, signs: [...pack.signs, twin] });
    expect(findConfusables(m).get('demo-fist')).toContain('demo-fist-twin');
  });
});

describe('held window (static signs)', () => {
  it('a signer who starts at rest and raises the hand is judged on the raised, held shape', () => {
    // 3.5 s takes: the performance lasts 2 s, so most of the take is spent resting
    for (let seed = 1; seed <= 6; seed++) {
      const frames = clipFeatures(simulateClip('shapeOpen', { seed, noise: 0.006, durationMs: 3500, dropout: 0.02 }));
      const win = heldWindow(frames);
      expect(win.reduce((a, f) => a + f.v[2 * 8 + 1]!, 0) / win.length).toBeLessThan(0.6); // raised to the chest, not resting (≈1.35)
    }
  });
});

describe('benchmark metrics', () => {
  it('confusion matrix, precision, recall and not-sure', () => {
    const r = benchmark(['A', 'B'], [
      { truth: 'A', pred: 'A' },
      { truth: 'A', pred: 'B' },
      { truth: 'B', pred: 'B' },
      { truth: 'B', pred: null },
    ]);
    expect(r.matrix).toEqual([[1, 1, 0], [0, 1, 1]]);
    expect(r.perSign[0]).toMatchObject({ precision: 1, recall: 0.5, support: 2 });
    expect(r.perSign[1]).toMatchObject({ precision: 0.5, recall: 0.5 });
    expect(r.accuracy).toBe(0.5);
    expect(r.notSureRate).toBe(0.25);
  });

  it('parses a labels file', () => {
    expect([...parseLabels('filename,gloss\nclip1.webm,HELLO\n\n# note\nclip2.mp4, THANK-YOU \nbad-line')]).toEqual([
      ['clip1.webm', 'HELLO'],
      ['clip2.mp4', 'THANK-YOU'],
    ]);
  });
});

describe('authoring quality checks', () => {
  it('flags too few takes, a take that differs, and missing hands', () => {
    const takes = [1, 2, 3, 4].map((s) => ({ clip: demoTake('wave', 500 + s)!, energy: 0.9 }));
    expect(checkTakes(takes, 'dynamic').set).toContain('too-few');
    const odd = [...takes, { clip: demoTake('armsUp', 77)!, energy: 0.9 }];
    expect(checkTakes(odd, 'dynamic').perTake[4]).toContain('inconsistent');
    const noHands = new Float32Array(CLIP_N * D);
    expect(checkTakes([{ clip: noHands, energy: 0 }], 'static').perTake[0]).toContain('hands-out');
  });

  it('flags very different speeds', () => {
    const takes = [1, 2, 3, 4, 5].map((s) => ({ clip: demoTake('wave', 600 + s)!, energy: s % 2 ? 0.3 : 1.5 }));
    expect(checkTakes(takes, 'dynamic').set).toContain('speed');
  });
});
