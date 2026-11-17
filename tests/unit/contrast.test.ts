import { describe, expect, it } from 'vitest';
import tokens from '../../src/ui/theme/tokens.json';
// @ts-expect-error — plain ESM helper shared with the CLI script, no type declarations
import { checkTokens, contrast } from '../../scripts/contrast.mjs';

interface Row { theme: string; fg: string; bg: string; ratio: number; min: number; ok: boolean }

describe('design-token contrast', () => {
  it('computes known ratios', () => {
    expect((contrast as (a: string, b: string) => number)('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
  it('every text and UI pairing meets its threshold in both themes', () => {
    const rows = (checkTokens as (t: unknown) => Row[])(tokens);
    const failing = rows.filter((r) => !r.ok);
    expect(failing).toEqual([]);
  });
});
