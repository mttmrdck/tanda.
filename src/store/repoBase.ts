/** Shared IndexedDB helpers: friendly errors and ids. Used by the child-data repo and the sign-pack repo. */
export type RepoErrorCode = 'quota' | 'unavailable' | 'unknown';

/** Friendly wrapper for IndexedDB failures (quota, private mode, blocked). */
export class RepoError extends Error {
  constructor(
    public readonly code: RepoErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'RepoError';
  }
}

export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RepoError) throw err;
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'QuotaExceededError') throw new RepoError('quota', err);
    if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'UnknownError') throw new RepoError('unavailable', err);
    throw new RepoError('unknown', err);
  }
}

export function uid(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

