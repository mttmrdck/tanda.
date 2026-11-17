import type { Lang } from '../../i18n';

/**
 * Web Speech output (on-device voices). Voice: ms-MY, then any ms, else English. Voices load asynchronously
 * (`voiceschanged`). Any failure is silent — the meaning is always shown on screen.
 */
let voices: SpeechSynthesisVoice[] = [];

function refresh() {
  try {
    voices = window.speechSynthesis?.getVoices() ?? [];
  } catch {
    voices = [];
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Only on-device voices (`localService`) are used. Some browsers offer network voices (e.g. Chrome's "Google …"
 * voices) that send the text to a cloud service — that would break the privacy promise, so they are skipped.
 */
export function pickVoice(lang: Lang, list: readonly SpeechSynthesisVoice[] = voices): SpeechSynthesisVoice | null {
  const local = list.filter((v) => v.localService);
  const starts = (p: string) => local.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(p)) ?? null;
  if (lang === 'ms') return starts('ms-my') ?? starts('ms') ?? starts('en');
  return starts('en');
}

export function speak(text: string, lang: Lang): void {
  if (!speechAvailable()) return;
  try {
    if (!voices.length) refresh();
    const voice = pickVoice(lang);
    if (!voice) return; // no on-device voice: on-screen text only
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    // silent fallback
  }
}
