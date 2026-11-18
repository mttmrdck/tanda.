import { useEffect, useState } from 'react';
import { listSignals } from '../../store/repo';
import { useData } from '../../store/useData';

/** Taught-signal counts for every local profile (the store only holds the selected profile's signals). */
export function useSignalCounts() {
  const profiles = useData((s) => s.profiles);
  const signals = useData((s) => s.signals);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    void Promise.all(profiles.map(async (p) => [p.id, (await listSignals(p.id)).length] as const))
      .then((xs) => live && setCounts(Object.fromEntries(xs)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [profiles, signals.length]);
  return counts;
}
