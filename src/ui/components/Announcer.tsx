import { useEffect, useState } from 'react';

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();
let lastAt = 0;
let pending: ReturnType<typeof setTimeout> | null = null;
const MIN_GAP_MS = 2500;

/** Announce a message politely to screen readers (rate-limited; the latest message wins). */
export function announce(msg: string): void {
  const now = Date.now();
  const fire = () => {
    lastAt = Date.now();
    for (const l of listeners) l(msg);
  };
  if (pending) clearTimeout(pending);
  if (now - lastAt >= MIN_GAP_MS) fire();
  else pending = setTimeout(fire, MIN_GAP_MS - (now - lastAt));
}

export function Announcer() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const l: Listener = (m) => {
      setMsg('');
      requestAnimationFrame(() => setMsg(m));
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="announcer">
      {msg}
    </div>
  );
}
