import { useT } from '../../i18n';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { Button } from './Button';
import { Card } from './Card';
import { downloadBlob } from './download';

export function MonitoringInsights() {
  const t = useT(),
    m = useMonitoringProfile(),
    s = m.snapshot;
  return (
    <Card className="space-y-4" aria-labelledby="monitor-insight">
      <h2 id="monitor-insight" className="text-xl">
        {t('monMonitoringSummary')}
      </h2>
      <p className="text-sm text-ink-muted">{t('monSummaryScope')}</p>
      {s ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ink-muted">{t('monEventQueue')}</dt>
              <dd className="mt-1 text-xl font-semibold">
                {s.events.filter((e) => e.priority === 'review' && e.status === 'new').length}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{t('monSimulatedEvent')}</dt>
              <dd className="mt-1 text-xl font-semibold">{s.events.filter((e) => e.simulated).length}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{t('monBaseline')}</dt>
              <dd className="mt-1 text-sm">
                {t('monBaselineSamples', { n: s.baseline.count, seconds: Math.round(s.baseline.coverageMs / 1000) })}
              </dd>
            </div>
          </dl>
          <Button
            variant="secondary"
            onClick={() =>
              downloadBlob(JSON.stringify(s, null, 2), `tanda-monitoring-${s.individualId}.json`, 'application/json')
            }
          >
            {t('monExportMetadata')}
          </Button>
        </>
      ) : (
        <p>{t(m.error ? 'storageError' : 'loading')}</p>
      )}
    </Card>
  );
}
