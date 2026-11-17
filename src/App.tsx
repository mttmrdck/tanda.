import { lazy, Suspense } from 'react';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { useT } from './i18n';

const DebugPage = import.meta.env.DEV || import.meta.env.MODE === 'e2e' ? lazy(() => import('./ui/pages/DebugPage')) : null;

function Home() {
  const t = useT();
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl">{t('appName')}</h1>
      <p className="mt-2 text-ink-muted">{t('tagline')}</p>
    </main>
  );
}

export function App() {
  return (
    <Router hook={useHashLocation}>
      <Suspense fallback={null}>
        <Switch>
          {DebugPage && <Route path="/debug" component={DebugPage} />}
          <Route component={Home} />
        </Switch>
      </Suspense>
    </Router>
  );
}
