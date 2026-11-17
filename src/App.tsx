import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { FeedbackToasts } from './ui/components/FeedbackToasts';
import { Redirect, Route, Router, Switch, useLocation } from 'wouter';
import { useT } from './i18n';
import { useSettings } from './store/useApp';
import { useData } from './store/useData';
import { Announcer } from './ui/components/Announcer';
import { Button } from './ui/components/Button';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { AppShell, BareShell } from './ui/components/Shell';
import { SessionSync } from './ui/SessionSync';
import { useTransitionHashLocation } from './ui/navigation';
import Live from './ui/pages/Live';

const Splash = lazy(() => import('./ui/pages/Splash'));
const Home = lazy(() => import('./ui/pages/Home'));
const Styleguide = lazy(() => import('./ui/pages/Styleguide'));
const Onboarding = lazy(() => import('./ui/pages/Onboarding'));
const About = lazy(() => import('./ui/pages/About'));
const Teach = lazy(() => import('./ui/pages/Teach'));
const Signals = lazy(() => import('./ui/pages/Signals'));
const Timeline = lazy(() => import('./ui/pages/Timeline'));
const Handover = lazy(() => import('./ui/pages/Handover'));
const Settings = lazy(() => import('./ui/pages/Settings'));
const ImportPage = lazy(() => import('./ui/pages/ImportPage'));
const SignPacks = lazy(() => import('./ui/pages/signs/SignPacks'));
const PackDetail = lazy(() => import('./ui/pages/signs/PackDetail'));
const Practice = lazy(() => import('./ui/pages/signs/Practice'));
const Spell = lazy(() => import('./ui/pages/signs/Spell'));
const Recognise = lazy(() => import('./ui/pages/signs/Recognise'));
const Author = lazy(() => import('./ui/pages/signs/Author'));
const Benchmark = lazy(() => import('./ui/pages/signs/Benchmark'));
const Translate = lazy(() => import('./ui/pages/translate/Translate'));
const DebugPage = import.meta.env.DEV || import.meta.env.MODE === 'e2e' ? lazy(() => import('./ui/pages/DebugPage')) : null;

function PageSkeleton() {
  const t = useT();
  return (
    <div className="page-skeleton" role="status" aria-label={t('homeLoading')}>
      <span className="sr-only">{t('homeLoading')}</span>
      <div aria-hidden className="skeleton-title ld-shimmer"><i /><i /><i /></div>
      <div aria-hidden className="skeleton-layout">
        <div className="skeleton-surface skeleton-hero"><div className="ld-shimmer"><i /><i /><i /></div></div>
        <div className="skeleton-detail">
          {[0, 1, 2].map(n => <div key={n} className="skeleton-surface"><div className="ld-shimmer"><i /><i /><i /></div></div>)}
        </div>
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
  const [loc] = useLocation();
  const [settled, setSettled] = useState(loc);
  const transitioning = loc !== settled;
  useEffect(() => {
    if (!transitioning) return;
    const timer = window.setTimeout(() => setSettled(loc), 260);
    return () => window.clearTimeout(timer);
  }, [loc, transitioning]);
  return (
    <ErrorBoundary>
      <div className="route-shell" aria-busy={transitioning}>
        {transitioning && <div className="route-skeleton-cover"><PageSkeleton /></div>}
        <div style={{ visibility: transitioning ? 'hidden' : 'visible' }}>
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function Routes() {
  const t = useT();
  const status = useData((s) => s.status);
  const profiles = useData((s) => s.profiles);
  const consented = useSettings((s) => s.consented);
  const signsOn = useSettings((s) => s.labsSignPacks);
  const [loc] = useLocation();

  if (loc === '/splash') return <Suspense fallback={<div className="splash-loading" />}><Splash /></Suspense>;

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

  if (loc === '/styleguide') return <BareShell><Page><Styleguide /></Page></BareShell>;

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
          <Route path="/home" component={Home} />
          <Route path="/teach" component={Teach} />
          <Route path="/teach/:signalId/add" component={Teach} />
          <Route path="/signals" component={Signals} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/handover" component={Handover} />
          <Route path="/settings" component={Settings} />
          <Route path="/about" component={About} />
          {DebugPage && <Route path="/debug" component={DebugPage} />}
          {/* Labs: sign packs — behind a flag (Settings › Labs), off by default */}
          {signsOn && <Route path="/signs" component={SignPacks} />}
          {signsOn && <Route path="/signs/author" component={Author} />}
          {signsOn && <Route path="/signs/benchmark" component={Benchmark} />}
          {signsOn && <Route path="/signs/pack/:packId" component={PackDetail} />}
          {signsOn && <Route path="/signs/pack/:packId/practice/:signId" component={Practice} />}
          {signsOn && <Route path="/signs/pack/:packId/spell" component={Spell} />}
          {signsOn && <Route path="/signs/pack/:packId/recognise" component={Recognise} />}
          {signsOn && <Route path="/translate" component={Translate} />}
          {!signsOn && (
            <Route path="/translate">
              <Redirect to="/settings" />
            </Route>
          )}
          {!signsOn && (
            <Route path="/signs">
              <Redirect to="/settings" />
            </Route>
          )}
          {!signsOn && (
            <Route path="/signs/*">
              <Redirect to="/settings" />
            </Route>
          )}
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
    <Router hook={useTransitionHashLocation} hrefs={(href) => `#${href}`}>
      <RouteFocus />
      <SessionSync />
      <Announcer />
      <Routes />
      <FeedbackToasts theme={toastTheme} />
    </Router>
  );
}
