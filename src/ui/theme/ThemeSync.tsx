import { useEffect, useRef } from 'react';
import { useSettings } from '../../store/useApp';

/** Applies `data-theme` and `lang` to <html>; follows prefers-color-scheme when theme is "system". */
export function ThemeSync() {
  const theme = useSettings((s) => s.theme);
  const lang = useSettings((s) => s.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const sync = useRef<number | undefined>(undefined);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const root = document.documentElement;
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dim' : 'light') : theme;
      // A real theme change crossfades surfaces, borders and ink for 200ms (skipped on first paint and reduced motion).
      if (root.dataset.theme && root.dataset.theme !== resolved && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.classList.add('theme-sync');
        window.clearTimeout(sync.current);
        sync.current = window.setTimeout(() => root.classList.remove('theme-sync'), 240);
      }
      root.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dim' ? '#000000' : '#F2F2F7');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => () => window.clearTimeout(sync.current), []);

  return null;
}
