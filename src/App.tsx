import { useT } from './i18n';

export function App() {
  const t = useT();
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl">{t('appName')}</h1>
      <p className="mt-2 text-ink-muted">{t('tagline')}</p>
    </main>
  );
}
