import { z } from 'zod';
import { decrypt, deriveKey, encrypt, equalBytes, fromB64, IV_BYTES, MIN_PASSPHRASE, PBKDF2_ITERATIONS, randomBytes, SALT_BYTES, toB64 } from '../crypto';

/**
 * Sign packs — versioned, zod-validated bundles of landmark templates for isolated signs. A pack is a PRACTICE
 * aid; it never contains pixels, faces or audio: templates are the same body-normalised landmark features the
 * rest of the engine uses (CLIP_N × D floats). See docs/SIGN_PACKS.md.
 */
export const PACK_FORMAT = 'isyarat-signpack';
export const PACK_SCHEMA = 1;
export const ENC_FORMAT = 'isyarat-signpack-enc';

/** Language labels shown in the UI. Packs may use any code; unknown codes show the code itself. */
export const KNOWN_LANGUAGES = ['ASL', 'BIM'] as const;

const id = z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/);

export const templateSchema = z.object({
  n: z.number().int().min(2).max(256),
  d: z.number().int().min(1).max(1024),
  /** base64 little-endian Float32 (n × d) */
  data: z.string().min(1),
  /** which hand formed the sign (static signs) — left-handed signers are mirrored when matching */
  hand: z.enum(['left', 'right']).optional(),
  /** links the template to a signer credit, so a signer can withdraw their recordings */
  signerId: z.string().max(64).optional(),
  recordedAt: z.string(),
});

export const signSchema = z.object({
  id,
  gloss: z.string().trim().min(1).max(60),
  gloss_ms: z.string().trim().max(60),
  type: z.enum(['static', 'dynamic']),
  templates: z.array(templateSchema).max(50),
  notes: z.string().max(500),
  confusableWith: z.array(z.string().max(64)).max(50),
});

export const signerCreditSchema = z.object({
  id: z.string().min(1).max(64),
  /** optional public credit; empty = anonymous */
  name: z.string().trim().max(80),
  consentedAt: z.string(),
});

export const packSchema = z.object({
  format: z.literal(PACK_FORMAT),
  schema: z.literal(PACK_SCHEMA),
  id,
  language: z.string().trim().min(2).max(16),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title_en: z.string().trim().min(1).max(80),
  title_ms: z.string().trim().max(80),
  signs: z.array(signSchema).max(2000),
  signerCredits: z.array(signerCreditSchema).max(200),
  reviewStatus: z.enum(['unreviewed', 'reviewed']),
  reviewedBy: z.string().trim().max(120).optional(),
  licence: z.string().trim().min(1).max(200),
  source: z.string().trim().min(1).max(300),
  /** simulator-made content: always shown as "Demo only, not real signs" */
  demo: z.boolean(),
  /** built into the app (read-only) vs created / imported on this device */
  builtIn: z.boolean(),
  updatedAt: z.string(),
});

export type SignTemplate = z.infer<typeof templateSchema>;
export type Sign = z.infer<typeof signSchema>;
export type SignerCredit = z.infer<typeof signerCreditSchema>;
export type SignPack = z.infer<typeof packSchema>;

export type PackErrorCode = 'not-signpack' | 'unsupported-version' | 'invalid-content' | 'wrong-passphrase' | 'corrupted' | 'weak-passphrase';
export class PackError extends Error {
  constructor(public readonly code: PackErrorCode) {
    super(code);
    this.name = 'PackError';
  }
}

export function encodeFloats(a: Float32Array): string {
  return toB64(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
}

export function decodeTemplate(t: SignTemplate): Float32Array {
  const bytes = fromB64(t.data);
  if (bytes.byteLength !== t.n * t.d * 4) throw new PackError('invalid-content');
  return new Float32Array(bytes.buffer, 0, t.n * t.d);
}

/** Validate a parsed object as a pack: schema, unique sign ids, template sizes, credit references. */
export function validatePack(raw: unknown): SignPack {
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== PACK_FORMAT) throw new PackError('not-signpack');
  if ((raw as { schema?: unknown }).schema !== PACK_SCHEMA) throw new PackError('unsupported-version');
  const parsed = packSchema.safeParse(raw);
  if (!parsed.success) throw new PackError('invalid-content');
  const pack = parsed.data;
  const ids = new Set<string>();
  const credits = new Set(pack.signerCredits.map((c) => c.id));
  for (const s of pack.signs) {
    if (ids.has(s.id)) throw new PackError('invalid-content');
    ids.add(s.id);
    for (const t of s.templates) {
      decodeTemplate(t);
      if (t.signerId && !credits.has(t.signerId)) throw new PackError('invalid-content');
    }
  }
  return pack;
}

/** Plain .signpack file (JSON). */
export function serialisePack(pack: SignPack): string {
  return JSON.stringify({ ...pack, builtIn: false });
}

const encSchema = z.object({
  format: z.literal(ENC_FORMAT),
  v: z.literal(1),
  kdf: z.object({ name: z.literal('PBKDF2'), hash: z.literal('SHA-256'), iterations: z.number().int().min(1000).max(5_000_000), salt: z.string(), check: z.string() }),
  cipher: z.object({ name: z.literal('AES-GCM'), iv: z.string() }),
  data: z.string(),
});

/** Encrypted .signpack file: PBKDF2-SHA-256 → AES-GCM-256, same scheme as the handover file. */
export async function encryptPack(pack: SignPack, passphrase: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  if (passphrase.length < MIN_PASSPHRASE) throw new PackError('weak-passphrase');
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const { key, check } = await deriveKey(passphrase, salt, iterations);
  const ct = await encrypt(key, iv, new TextEncoder().encode(serialisePack(pack)));
  return JSON.stringify({
    format: ENC_FORMAT,
    v: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toB64(salt), check: toB64(check) },
    cipher: { name: 'AES-GCM', iv: toB64(iv) },
    data: toB64(ct),
  });
}

/** Is this file text an encrypted pack (needs a passphrase)? Throws for anything that is not a sign pack. */
export function isEncryptedPack(text: string): boolean {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new PackError('not-signpack');
  }
  const f = (raw as { format?: unknown } | null)?.format;
  if (f === ENC_FORMAT) return true;
  if (f === PACK_FORMAT) return false;
  throw new PackError('not-signpack');
}

/** Read a .signpack file (plain, or encrypted with `passphrase`). Imported packs are never built-in. */
export async function readPackFile(text: string, passphrase?: string): Promise<SignPack> {
  if (!isEncryptedPack(text)) return { ...validatePack(JSON.parse(text)), builtIn: false };
  const env = encSchema.safeParse(JSON.parse(text));
  if (!env.success) throw new PackError('corrupted');
  if (!passphrase) throw new PackError('wrong-passphrase');
  let salt: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, ct: Uint8Array<ArrayBuffer>, check: Uint8Array;
  try {
    salt = fromB64(env.data.kdf.salt);
    iv = fromB64(env.data.cipher.iv);
    ct = fromB64(env.data.data);
    check = fromB64(env.data.kdf.check);
  } catch {
    throw new PackError('corrupted');
  }
  const derived = await deriveKey(passphrase, salt, env.data.kdf.iterations);
  if (!equalBytes(derived.check, check)) throw new PackError('wrong-passphrase');
  let plain: Uint8Array;
  try {
    plain = await decrypt(derived.key, iv, ct);
  } catch {
    throw new PackError('corrupted');
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new PackError('invalid-content');
  }
  return { ...validatePack(json), builtIn: false };
}

/** Remove one signer's recordings and credit (right to withdraw). Signs left with no templates are dropped. */
export function withdrawSigner(pack: SignPack, signerId: string, now: string): SignPack {
  const signs = pack.signs
    .map((s) => ({ ...s, templates: s.templates.filter((t) => t.signerId !== signerId) }))
    .filter((s) => s.templates.length > 0);
  return { ...pack, signs, signerCredits: pack.signerCredits.filter((c) => c.id !== signerId), updatedAt: now };
}
