import { useEffect } from 'react';
import { useData } from '../../store/useData';
import { useMonitoring } from '../../store/useMonitoring';
export function useMonitoringProfile() {
  const id = useData((s) => s.profile?.id);
  const state = useMonitoring();
  const load = state.load;
  useEffect(() => {
    if (id && !useMonitoring.getState().loading && useMonitoring.getState().snapshot?.individualId !== id)
      void load(id);
  }, [id, load]);
  return { ...state, snapshot: state.snapshot?.individualId === id ? state.snapshot : null };
}
