import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Redirect, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { useT } from './i18n';
import { useSettings } from './store/useApp';
import { useData } from './store/useData';
import { Announcer } from './ui/components/Announcer';
import { Button } from './ui/components/Button';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { AppShell, BareShell } from './ui/components/Shell';
import { SessionSync } from './ui/SessionSync';
import Live from './ui/pages/Live';

const Onboarding = lazy(() => import('./ui/pages/Onboarding'));
const About = lazy(() => import('./ui/pages/About'));
const Teach = lazy(() => import('./ui/pages/Teach'));
const Signals = lazy(() => import('./ui/pages/Signals'));
const Timeline = lazy(() => import('./ui/pages/Timeline'));
const Handover = lazy(() => import('./ui/pages/Handover'));
const Settings = lazy(() => import('./ui/pages/Settings'));
const ImportPage = lazy(() => import('./ui/pages/ImportPage'));
const DebugPage = import.meta.env.DEV || import.meta.env.MODE === 'e2e' ? lazy(() => import('./ui/pages/DebugPage')) : null;

function PageSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-10 w-48 rounded-[12px] bg-surface-2" />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="aspect-[4/3] rounded-[20px] bg-surface-2" />
        <div className="h-64 rounded-[20px] bg-surface-2" />
      </div>
    </div>
  );
}

/** Focus <main> and scroll to top on route change, so keyboard and screen-reader users land on the new page. */
function RouteFocus() {
  const [loc] = useLocation();
  const interacted = useRef(false);
  useEffect(() => {
    const mark = () => {
      interacted.current = true;
    };
    window.addEventListener('pointerdown', mark, { once: true });
    window.addEventListener('keydown', mark, { once: true });
    return () => {
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
    };
  }, []);
  useEffect(() => {
    // Automatic redirects on load leave focus at the document start, so "Skip to main content" is the first Tab
    // stop. After a user-initiated navigation, focus moves to <main> so the new page is announced.
    if (!interacted.current) return;
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [loc]);
  return null;
}

function Page({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function Routes() {
  const t = useT();
  const status = useData((s) => s.status);
  const profiles = useData((s) => s.profiles);
  const consented = useSettings((s) => s.consented);
  const [loc] = useLocation();

  if (status === 'loading') {
    return (
      <BareShell>
        <PageSkeleton />
      </BareShell>
    );
  }
  if (status === 'error') {
    return (
      <BareShell>
        <div role="alert" className="mt-10 rounded-[20px] border border-border-soft bg-surface p-6">
          <h1 className="text-xl">{t('loadError')}</h1>
          <p className="mt-2 text-ink-muted">{t('storageError')}</p>
          <Button className="mt-4" onClick={() => void useData.getState().load()}>
            {t('errorRetry')}
          </Button>
        </div>
      </BareShell>
    );
  }

  const onboarded = consented && profiles.length > 0;
  if (loc.startsWith('/onboarding')) {
    return (
      <BareShell>
        <Page>
          <Onboarding key={loc} {...(loc === '/onboarding/profile' && consented ? { startAt: 'profile' as const } : {})} />
        </Page>
      </BareShell>
    );
  }
  if (!onboarded) {
    if (loc === '/import' && consented) {
      return (
        <BareShell>
          <Page>
            <ImportPage />
          </Page>
        </BareShell>
      );
    }
    if (loc === '/about') {
      return (
        <BareShell>
          <Page>
            <About />
          </Page>
        </BareShell>
      );
    }
    if (DebugPage && loc === '/debug') {
      return (
        <Page>
          <DebugPage />
        </Page>
      );
    }
    return <Redirect to="/onboarding" />;
  }

  return (
    <AppShell>
      <Page>
        <Switch>
          <Route path="/" component={Live} />
          <Route path="/teach" component={Teach} />
          <Route path="/teach/:signalId/add" component={Teach} />
          <Route path="/signals" component={Signals} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/handover" component={Handover} />
          <Route path="/settings" component={Settings} />
          <Route path="/about" component={About} />
          {DebugPage && <Route path="/debug" component={DebugPage} />}
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </Page>
    </AppShell>
  );
}

export function App() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    void useData.getState().load();
  }, []);
  const toastTheme = theme === 'system' ? 'system' : theme === 'dim' ? 'dark' : 'light';
  return (
    <Router hook={useHashLocation}>
      <RouteFocus />
      <SessionSync />
      <Announcer />
      <Routes />
      <Toaster
        position="top-center"
        theme={toastTheme}
        closeButton
        toastOptions={{
          style: { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-soft)', fontSize: '1rem', borderRadius: '16px' },
        }}
      />
    </Router>
  );
}
