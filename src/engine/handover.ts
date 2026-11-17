import { z } from 'zod';
import { decrypt, deriveKey, encrypt, equalBytes, fromB64, IV_BYTES, MIN_PASSPHRASE, PBKDF2_ITERATIONS, randomBytes, SALT_BYTES, toB64 } from './crypto';
import type { AgeBand, ComfortSteps, EventRecord, Example, Signal } from './types';

/** `.isyarat` encrypted profile file (format v1). */
export const FORMAT = 'isyarat-profile';
export const VERSION = 1;

export type HandoverErrorCode = 'not-isyarat' | 'unsupported-version' | 'wrong-passphrase' | 'corrupted' | 'invalid-content' | 'weak-passphrase';

export class HandoverError extends Error {
  constructor(public readonly code: HandoverErrorCode) {
    super(code);
    this.name = 'HandoverError';
  }
}

const bi = z.object({ en: z.string().max(200), ms: z.string().max(200) });

export const payloadSchema = z.object({
  nickname: z.string().min(1).max(60),
  ageBand: z.enum(['under5', '5to8', '9to12', '13plus']).optional(),
  signals: z
    .array(
      z.object({
        id: z.string().min(1),
        name: bi,
        meaning: bi,
        category: z.enum(['need', 'feeling', 'safety', 'request', 'social']),
        urgency: z.enum(['low', 'normal', 'high']),
        icon: z.string().max(40),
        createdAt: z.string(),
      }),
    )
    .max(200),
  examples: z
    .array(
      z.object({
        id: z.string().min(1),
        signalId: z.string().min(1),
        n: z.number().int().positive().max(256),
        d: z.number().int().positive().max(1024),
        data: z.string(),
        source: z.enum(['teach', 'feedback']),
        createdAt: z.string(),
      }),
    )
    .max(5000),
  settings: z.object({ sensitivity: z.number().min(0.7).max(1.4), windowMs: z.number().min(1000).max(4000) }),
  comfortSteps: z.object({ calm: z.string().max(500), rising: z.string().max(500), high: z.string().max(500) }),
  events: z
    .array(
      z.object({
        id: z.string(),
        ts: z.string(),
        kind: z.enum(['signal', 'calm-tier']),
        signalId: z.string().optional(),
        confidence: z.number().optional(),
        feedback: z.enum(['yes', 'no', 'new']).optional(),
        tier: z.enum(['calm', 'rising', 'high']).optional(),
        score: z.number().optional(),
      }),
    )
    .optional(),
  exportedAt: z.string(),
});
export type HandoverPayload = z.infer<typeof payloadSchema>;

const fileSchema = z.object({
  format: z.literal(FORMAT),
  v: z.number(),
  kdf: z.object({ name: z.literal('PBKDF2'), hash: z.literal('SHA-256'), iterations: z.number().int().min(1000).max(5_000_000), salt: z.string(), check: z.string() }),
  cipher: z.object({ name: z.literal('AES-GCM'), iv: z.string() }),
  data: z.string(),
});
export type HandoverFile = z.infer<typeof fileSchema>;

export interface ProfileBundle {
  nickname: string;
  ageBand?: AgeBand;
  signals: Omit<Signal, 'profileId'>[];
  examples: Example[];
  settings: { sensitivity: number; windowMs: number };
  comfortSteps: ComfortSteps;
  events?: Omit<EventRecord, 'profileId'>[];
}

export function float32ToB64(a: Float32Array): string {
  return toB64(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
}
export function b64ToFloat32(b64: string): Float32Array {
  const bytes = fromB64(b64);
  if (bytes.byteLength % 4 !== 0) throw new HandoverError('invalid-content');
  return new Float32Array(bytes.buffer, 0, bytes.byteLength / 4);
}

export function toPayload(b: ProfileBundle, exportedAt: string): HandoverPayload {
  return {
    nickname: b.nickname,
    ...(b.ageBand ? { ageBand: b.ageBand } : {}),
    signals: b.signals.map((s) => ({ id: s.id, name: s.name, meaning: s.meaning, category: s.category, urgency: s.urgency, icon: s.icon, createdAt: s.createdAt })),
    examples: b.examples.map((e) => ({ id: e.id, signalId: e.signalId, n: e.n, d: e.d, data: float32ToB64(e.data), source: e.source, createdAt: e.createdAt })),
    settings: b.settings,
    comfortSteps: b.comfortSteps,
    ...(b.events ? { events: b.events } : {}),
    exportedAt,
  };
}

export function fromPayload(p: HandoverPayload): ProfileBundle {
  const signalIds = new Set(p.signals.map((s) => s.id));
  const examples: Example[] = p.examples.map((e) => {
    const data = b64ToFloat32(e.data);
    if (data.length !== e.n * e.d || !signalIds.has(e.signalId)) throw new HandoverError('invalid-content');
    return { ...e, data };
  });
  return {
    nickname: p.nickname,
    ...(p.ageBand ? { ageBand: p.ageBand } : {}),
    signals: p.signals,
    examples,
    settings: p.settings,
    comfortSteps: p.comfortSteps,
    ...(p.events ? { events: p.events } : {}),
  };
}

export async function encryptBundle(bundle: ProfileBundle, passphrase: string, exportedAt: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  if (passphrase.length < MIN_PASSPHRASE) throw new HandoverError('weak-passphrase');
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const { key, check } = await deriveKey(passphrase, salt, iterations);
  const plain = new TextEncoder().encode(JSON.stringify(toPayload(bundle, exportedAt)));
  const ct = await encrypt(key, iv, plain);
  const file: HandoverFile = {
    format: FORMAT,
    v: VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toB64(salt), check: toB64(check) },
    cipher: { name: 'AES-GCM', iv: toB64(iv) },
    data: toB64(ct),
  };
  return JSON.stringify(file);
}

/** Parse the outer envelope without decrypting (cheap checks first). */
export function parseEnvelope(text: string): HandoverFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HandoverError('not-isyarat');
  }
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== FORMAT) throw new HandoverError('not-isyarat');
  if ((raw as { v?: unknown }).v !== VERSION) throw new HandoverError('unsupported-version');
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) throw new HandoverError('corrupted');
  return parsed.data;
}

export async function decryptBundle(text: string, passphrase: string): Promise<ProfileBundle> {
  const env = parseEnvelope(text);
  let salt: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  let ct: Uint8Array<ArrayBuffer>;
  let check: Uint8Array;
  try {
    salt = fromB64(env.kdf.salt);
    iv = fromB64(env.cipher.iv);
    ct = fromB64(env.data);
    check = fromB64(env.kdf.check);
  } catch {
    throw new HandoverError('corrupted');
  }
  const derived = await deriveKey(passphrase, salt, env.kdf.iterations);
  if (!equalBytes(derived.check, check)) throw new HandoverError('wrong-passphrase');
  let plain: Uint8Array;
  try {
    plain = await decrypt(derived.key, iv, ct);
  } catch {
    throw new HandoverError('corrupted');
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new HandoverError('invalid-content');
  }
  const p = payloadSchema.safeParse(json);
  if (!p.success) throw new HandoverError('invalid-content');
  return fromPayload(p.data);
}
