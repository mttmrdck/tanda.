import { useCallback } from 'react';
import { useT } from '../../i18n';
import { useSession } from '../../store/useSession';
import { LiveLineChart } from '../vendor/live-line-chart';

/** Read-only subscription to the existing one-second Calm Watch output. */
export function MotionTrace() {
  const t = useT();
  const hasReading = useSession(s => s.calm !== null);
  const source = useCallback((push: (value: number) => void) => {
    let lastTime = -1;
    const read = () => {
      const state = useSession.getState();
      if (state.phase !== 'running' || !state.calm || state.calm.t === lastTime) return;
      lastTime = state.calm.t;
      push(state.calm.energy);
    };
    read();
    return useSession.subscribe(read);
  }, []);
  return <div className="motion-trace mt-4 border-t border-border-soft pt-4">
    <h3 className="text-sm font-semibold text-ink-muted">{t('motionEnergy')}</h3>
    {hasReading ? <LiveLineChart source={source} windowSeconds={60} intervalMs={1000} height={100} color="var(--calm-fg)" showReadout={false} ariaLabel={t('motionTrace')} /> : <div className="flex h-20 items-center border-b border-border-soft"><p className="text-sm text-ink-muted">{t('motionWaiting')}</p></div>}
    <div aria-hidden className="mt-2 flex justify-between text-xs text-ink-muted"><span>{t('motionAgo')}</span><span>{t('motionNow')}</span></div>
  </div>;
}
