// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { passphraseStrength } from '../../src/engine/crypto';
import { decryptBundle, encryptBundle, HandoverError, type ProfileBundle } from '../../src/engine/handover';

const ITER = 1000; // fast for tests; production uses 310 000 (see PBKDF2_ITERATIONS)
const bundle: ProfileBundle = {
  nickname: 'Adam',
  ageBand: '5to8',
  signals: [{ id: 's1', name: { en: 'Water', ms: 'Air' }, meaning: { en: 'I want water', ms: 'Saya mahu air' }, category: 'need', urgency: 'normal', icon: 'droplet', createdAt: '2026-01-01T00:00:00.000Z' }],
  examples: [{ id: 'e1', signalId: 's1', n: 2, d: 3, data: new Float32Array([1, 2, 3, 4.5, -5, 6]), source: 'teach', createdAt: '2026-01-01T00:00:00.000Z' }],
  settings: { sensitivity: 1, windowMs: 2000 },
  comfortSteps: { calm: '', rising: 'Dim the lights', high: 'Quiet corner' },
};

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'none';
  } catch (e) {
    return e instanceof HandoverError ? e.code : 'other';
  }
};

describe('handover', () => {
  it('round-trips exactly', async () => {
    const file = await encryptBundle(bundle, 'correct horse battery', '2026-02-02T00:00:00.000Z', ITER);
    const back = await decryptBundle(file, 'correct horse battery');
    expect(back.nickname).toBe('Adam');
    expect(back.signals).toEqual(bundle.signals);
    expect(Array.from(back.examples[0]!.data)).toEqual([1, 2, 3, 4.5, -5, 6]);
    expect(back.comfortSteps).toEqual(bundle.comfortSteps);
    expect(back.events).toBeUndefined();
    const parsed = JSON.parse(file) as Record<string, unknown>;
    expect(parsed).toMatchObject({ format: 'isyarat-profile', v: 1, cipher: { name: 'AES-GCM' } });
    expect(file).not.toContain('Adam');
  });

  it('uses 310 000 PBKDF2 iterations by default', async () => {
    const file = JSON.parse(await encryptBundle(bundle, 'correct horse battery', 'x')) as { kdf: { iterations: number } };
    expect(file.kdf.iterations).toBe(310_000);
  }, 30_000);

  it('wrong passphrase → wrong-passphrase', async () => {
    const file = await encryptBundle(bundle, 'correct horse battery', 'x', ITER);
    expect(await code(decryptBundle(file, 'wrong passphrase!'))).toBe('wrong-passphrase');
  });

  it('a flipped ciphertext byte → corrupted', async () => {
    const file = JSON.parse(await encryptBundle(bundle, 'correct horse battery', 'x', ITER)) as { data: string };
    const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
    bytes[5] = bytes[5]! ^ 0x01;
    file.data = btoa(String.fromCharCode(...bytes));
    expect(await code(decryptBundle(JSON.stringify(file), 'correct horse battery'))).toBe('corrupted');
  });

  it('version 2 → unsupported-version', async () => {
    const file = JSON.parse(await encryptBundle(bundle, 'correct horse battery', 'x', ITER)) as { v: number };
    file.v = 2;
    expect(await code(decryptBundle(JSON.stringify(file), 'correct horse battery'))).toBe('unsupported-version');
  });

  it('non-isyarat or invalid content is rejected with a specific code', async () => {
    expect(await code(decryptBundle('not json', 'whatever123'))).toBe('not-isyarat');
    expect(await code(decryptBundle('{"format":"other"}', 'whatever123'))).toBe('not-isyarat');
    const bad = { ...bundle, signals: [{ ...bundle.signals[0]!, category: 'nope' }] } as unknown as ProfileBundle;
    const file = await encryptBundle(bad, 'correct horse battery', 'x', ITER);
    expect(await code(decryptBundle(file, 'correct horse battery'))).toBe('invalid-content');
  });

  it('enforces a minimum passphrase length and gives a strength hint', async () => {
    expect(await code(encryptBundle(bundle, 'short', 'x', ITER))).toBe('weak-passphrase');
    expect(passphraseStrength('short')).toBe(0);
    expect(passphraseStrength('abcdefgh')).toBe(1);
    expect(passphraseStrength('abcdefgh12')).toBe(2);
    expect(passphraseStrength('blue kettle under stairs')).toBe(3);
  });
});
