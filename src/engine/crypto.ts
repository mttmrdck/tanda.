/**
 * Web Crypto helpers for the handover file: PBKDF2-SHA-256 (310 000 iterations) → AES-GCM-256.
 * The derived bits also yield a short key-check value, so a wrong passphrase can be told apart from a
 * corrupted file (AES-GCM alone cannot distinguish the two).
 */
export const PBKDF2_ITERATIONS = 310_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const MIN_PASSPHRASE = 8;

const subtle = () => globalThis.crypto.subtle;

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(n));
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function toB64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export interface DerivedKey {
  key: CryptoKey;
  /** 16-byte key-check value (not secret-equivalent: derived from a separate half of the PBKDF2 output) */
  check: Uint8Array;
}

export async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS): Promise<DerivedKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 512));
  const key = await subtle().importKey('raw', bits.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const check = new Uint8Array(await subtle().digest('SHA-256', bits.slice(32, 64))).slice(0, 16);
  return { key, check };
}

export async function encrypt(key: CryptoKey, iv: Uint8Array<ArrayBuffer>, plaintext: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, plaintext));
}

export async function decrypt(key: CryptoKey, iv: Uint8Array<ArrayBuffer>, ciphertext: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Simple, honest passphrase strength hint (0–3). Not a security guarantee. */
export function passphraseStrength(p: string): 0 | 1 | 2 | 3 {
  if (p.length < MIN_PASSPHRASE) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  const words = p.trim().split(/\s+/).length;
  if (p.length >= 16 || (words >= 4 && p.length >= 14) || (p.length >= 12 && classes >= 3)) return 3;
  if (p.length >= 10 && classes >= 2) return 2;
  return 1;
}
