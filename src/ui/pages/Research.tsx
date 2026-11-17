import { CircleAlert, FlaskConical, Languages, Library, Users } from 'lucide-react';
import { Link } from 'wouter';
import { useT, type MsgKey } from '../../i18n';
import { useSettings } from '../../store/useApp';
import { Card } from '../components/Card';

const STATUS: MsgKey[] = ['rsStatus1', 'rsStatus2', 'rsStatus3'];
const NEEDS: MsgKey[] = ['rsNeed1', 'rsNeed2', 'rsNeed3', 'rsNeed4'];

/**
 * Sign Language Research — a future direction, not a working feature. Explains the status honestly and only
 * links to the simulated prototypes (sign packs, word ↔ sign) when the Labs switch is on.
 */
export default function Research() {
  const t = useT();
  const labs = useSettings((s) => s.labsSignPacks);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1>{t('rsTitle')}</h1>
          <span className="status-tag" data-testid="research-tag">
            {t('rsTag')}
          </span>
        </div>
        <p className="max-w-3xl text-ink-muted">{t('rsVision')}</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card aria-labelledby="rs-status" className="space-y-3">
          <h2 id="rs-status" className="flex items-center gap-2 text-lg">
            <CircleAlert aria-hidden className="size-5 text-rising-fg" />
            {t('rsStatusTitle')}
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            {STATUS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </Card>
        <Card aria-labelledby="rs-needs" className="space-y-3">
          <h2 id="rs-needs" className="flex items-center gap-2 text-lg">
            <Users aria-hidden className="size-5 text-primary" />
            {t('rsNeedsTitle')}
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            {NEEDS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="rs-demos" className="demo-path space-y-3 rounded-[20px] border border-dashed border-border p-5 sm:p-6">
        <h2 id="rs-demos" className="flex items-center gap-2 text-lg">
          <FlaskConical aria-hidden className="size-5 text-rising-fg" />
          {t('rsDemosTitle')}
        </h2>
        <p className="max-w-3xl text-ink-muted">{t('rsDemosBody')}</p>
        <p className="font-semibold">{t('spDemoBadge')}</p>
        {labs ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/signs" className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
              <Library aria-hidden className="size-5" />
              {t('labsOpenPacks')}
            </Link>
            <Link href="/translate" className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
              <Languages aria-hidden className="size-5" />
              {t('rsOpenTranslate')}
            </Link>
          </div>
        ) : (
          <p>
            <Link href="/settings" className="inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4">
              {t('rsDemosOff')}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
