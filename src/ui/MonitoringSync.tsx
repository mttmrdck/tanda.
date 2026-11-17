import { useEffect } from 'react';
import { useData } from '../store/useData';
import { useMonitoring } from '../store/useMonitoring';
import { useSession } from '../store/useSession';
/** Browser vision stays operational; only its existing low-rate movement output crosses the boundary. */
export function MonitoringSync() {
  const id = useData((s) => s.profile?.id);
  useEffect(() => {
    if (id) void useMonitoring.getState().load(id);
    else useMonitoring.getState().forget();
  }, [id]);
  useEffect(
    () =>
      useSession.subscribe((s, prev) => {
        const snapshot = useMonitoring.getState().snapshot;
        if (
          !id ||
          !snapshot ||
          snapshot.individualId !== id ||
          !snapshot.care.consent.video ||
          !snapshot.care.consent.authorityConfirmed
        )
          return;
        if (
          s.kind === 'camera' &&
          s.phase === 'running' &&
          ((s.calm && s.calm.t !== prev.calm?.t) || (s.seeing !== prev.seeing && s.seeing !== 'ok'))
        ) {
          const now = new Date();
          void useMonitoring.getState().ingestBrowser({
            individualId: id,
            sourceId: snapshot.care.environment.cameraId,
            roomId: snapshot.care.environment.id,
            at: now.toISOString(),
            localHour: now.getHours(),
            quality: s.seeing === 'ok' ? 'good' : 'occluded',
            energy: s.seeing === 'ok' ? (s.calm?.energy ?? null) : null,
            sourceMode: 'browser-camera',
            reviewedContext: snapshot.care.baselineContextReviewed,
          });
        }
        if (prev.phase === 'running' && s.phase !== 'running' && snapshot.health.gateway.mode === 'browser-camera')
          void useMonitoring.getState().action(s.phase === 'error' ? 'disconnect' : 'stop');
      }),
    [id],
  );
  return null;
}
