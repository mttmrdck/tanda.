import { useEffect } from 'react';
import { useSettings } from '../../store/useApp';

/** Applies `data-theme` and `lang` to <html>; follows prefers-color-scheme when theme is "system". */
export function ThemeSync() {
  const theme = useSettings((s) => s.theme);
  const lang = useSettings((s) => s.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dim' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dim' ? '#0B0B0D' : '#EEF0F4');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return null;
}
