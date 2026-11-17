import type { SignPack } from './pack';

/**
 * Pack registry: built-in packs (read-only, shipped with the app) plus packs created or imported on this device.
 * A new language (e.g. a BIM pack) is just another validated pack — no code changes. A device pack can never
 * shadow a built-in id.
 */
export class PackRegistry {
  private user: SignPack[] = [];
  constructor(private readonly builtIns: readonly SignPack[]) {}

  setUserPacks(packs: readonly SignPack[]): void {
    const taken = new Set(this.builtIns.map((p) => p.id));
    this.user = packs.filter((p) => !taken.has(p.id)).map((p) => ({ ...p, builtIn: false }));
  }

  list(): SignPack[] {
    return [...this.builtIns, ...this.user];
  }

  get(id: string): SignPack | undefined {
    return this.list().find((p) => p.id === id);
  }

  isBuiltIn(id: string): boolean {
    return this.builtIns.some((p) => p.id === id);
  }
}

/** The ASL pack the app ships with: empty. Signs appear only when a real signer records them in-app. */
export const ASL_STARTER: SignPack = {
  format: 'isyarat-signpack',
  schema: 1,
  id: 'asl',
  language: 'ASL',
  version: '0.0.0',
  title_en: 'ASL (American Sign Language)',
  title_ms: 'ASL (Bahasa Isyarat Amerika)',
  signs: [],
  signerCredits: [],
  reviewStatus: 'unreviewed',
  licence: 'No signs yet. Each recorded sign carries the licence chosen by its signer.',
  source: 'Empty starter pack. Signs are added only by real signers using "Author a pack".',
  demo: false,
  builtIn: true,
  updatedAt: '2026-11-17T00:00:00.000Z',
};
