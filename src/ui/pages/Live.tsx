import { useEffect } from 'react';
import { Link } from 'wouter';
import { useT } from '../../i18n';
import { ALL_GESTURES } from '../../engine/simulator';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { session } from '../../store/useSession';
import { EmptyState } from '../components/EmptyState';
import { VideoPanel } from '../components/VideoPanel';

export default function Live() {
  const t = useT();
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const skeleton = useSettings((s) => s.skeletonLive);
  const set = useSettings((s) => s.set);

  useEffect(() => {
    session.setMode('live');
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl">{t('liveTitle')}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <VideoPanel skeleton={skeleton} onSkeleton={(v) => set({ skeletonLive: v })} gestures={ALL_GESTURES} />
        <div className="space-y-6">
          {signals.length === 0 && (
            <EmptyState
              title={t('emptyNoSignalsTitle')}
              body={t('emptyNoSignalsBody', { name: profile?.nickname ?? '' })}
              action={
                <Link href="/teach" className="inline-flex min-h-12 items-center rounded-[12px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-hover">
                  {t('teachFirst')}
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
