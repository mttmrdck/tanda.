import { flushSync } from 'react-dom';
import { useHashLocation } from 'wouter/use-hash-location';

/** Order of the primary destinations; route transitions slide in this direction. */
export const ROUTE_ORDER = ['/home', '/teach', '/', '/timeline', '/signals', '/handover', '/settings', '/about'];

const rank = (path: string) => {
  const i = ROUTE_ORDER.findIndex((r) => (r === '/' ? path === '/' : path === r || path.startsWith(`${r}/`)));
  return i < 0 ? ROUTE_ORDER.length : i;
};

type Navigate = ReturnType<typeof useHashLocation>[1];
interface VT {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
}
type StartVT = (cb: () => void) => VT;

/**
 * Hash location with View Transitions (where supported): wouter's navigate dispatches `hashchange`
 * synchronously, so flushSync inside the transition callback renders the new page into the snapshot.
 * Unsupported browsers navigate instantly (the page then fades in via `.page-enter`).
 */
export function useTransitionHashLocation(opts?: { ssrPath?: string }): [string, Navigate] {
  const [loc, navigate] = useHashLocation(opts);
  const nav: Navigate = (to, options) => {
    const start = (document as Document & { startViewTransition?: StartVT }).startViewTransition?.bind(document);
    const target = to.replace(/^#/, '').split('?')[0] ?? '/';
    // Redirects (replace) and same-page navigations happen instantly.
    if (!start || target === loc || options?.replace) {
      navigate(to, options);
      return;
    }
    document.documentElement.dataset.navDir = rank(target) < rank(loc) ? 'back' : 'forward';
    // The update runs a frame later; if the URL changed meanwhile (back button, another link), don't clobber it.
    const before = location.href;
    const vt = start(() => {
      if (location.href === before) flushSync(() => navigate(to, options));
    });
    // A newer navigation may skip this transition; that is expected, not an error.
    const ignore = () => undefined;
    vt.ready.catch(ignore);
    vt.finished.catch(ignore);
    vt.updateCallbackDone.catch(ignore);
  };
  return [loc, nav];
}

export const supportsViewTransitions = () => typeof document !== 'undefined' && 'startViewTransition' in document;
