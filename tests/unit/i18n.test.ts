import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { ms } from '../../src/i18n/ms';
import { defaultLang, translate } from '../../src/i18n';

describe('i18n', () => {
  it('BM has every key with a non-empty value and the same placeholders', () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(ms[k], k).toBeTruthy();
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
      expect(ph(ms[k]), k).toBe(ph(en[k]));
    }
  });
  it('picks BM only for ms browser languages', () => {
    expect(defaultLang('ms-MY')).toBe('ms');
    expect(defaultLang('en-GB')).toBe('en');
    expect(defaultLang(undefined)).toBe('en');
  });
  it('interpolates variables', () => {
    expect(translate('en', 'tagline')).toMatch(/camera/);
  });
});
