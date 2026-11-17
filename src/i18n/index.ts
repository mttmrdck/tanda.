import { en, type MsgKey } from './en';
import { ms } from './ms';
import { useSettings } from '../store/useApp';

export type Lang = 'en' | 'ms';
export type { MsgKey };

const dicts: Record<Lang, Record<MsgKey, string>> = { en, ms };

export function translate(lang: Lang, key: MsgKey, vars?: Record<string, string | number>): string {
  const raw = dicts[lang][key] ?? en[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function defaultLang(navLang: string | undefined): Lang {
  return navLang?.toLowerCase().startsWith('ms') ? 'ms' : 'en';
}

export type TFn = (key: MsgKey, vars?: Record<string, string | number>) => string;

/** Hook: returns `t` bound to the current UI language. */
export function useT(): TFn {
  const lang = useSettings((s) => s.lang);
  return (key, vars) => translate(lang, key, vars);
}

/** Pick the active-language variant of a bilingual caregiver-entered text, falling back to the other. */
export function pickText(text: { en: string; ms: string }, lang: Lang): string {
  return (lang === 'ms' ? text.ms || text.en : text.en || text.ms).trim();
}
