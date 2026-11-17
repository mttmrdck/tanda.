import { ArrowUpRight, BookOpen, CheckCheck, ChevronRight, FlaskConical, Hand, MessageCircleQuestion, Plus, Radio, RefreshCw, ShieldCheck, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { EventRecord } from '../../engine/types';
import { pickText, useT, type MsgKey } from '../../i18n';
import { listEvents } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { EventList } from '../components/LiveBits';
import { iconFor } from '../components/signalIcons';
import { SummaryStat } from '../components/SummaryStat';

const FLOW: { title: MsgKey; body: MsgKey; Icon: typeof Hand }[] = [
  { title: 'commFlowTeach', body: 'commFlowTeachBody', Icon: Hand },
  { title: 'commFlowRecognise', body: 'commFlowRecogniseBody', Icon: Radio },
  { title: 'commFlowConfirm', body: 'commFlowConfirmBody', Icon: ThumbsUp },
  { title: 'commFlowImprove', body: 'commFlowImproveBody', Icon: RefreshCw },
];

const DEMO_PATH: { label: MsgKey; href: string }[] = [
  { label: 'demoPath1', href: '/individuals' },
  { label: 'demoPath2', href: '/teach' },
  { label: 'demoPath3', href: '/' },
  { label: 'demoPath4', href: '/' },
  { label: 'demoPath5', href: '/timeline' },
  { label: 'demoPath6', href: '/handover' },
];

/** Communication › Overview: the selected individual's gestures, today's activity, and the way in. */
export default function Home() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setEvents(null);
    setError(false);
    if (profile) {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      listEvents(profile.id, from.toISOString())
        .then((e) => active && setEvents(e))
        .catch(() => active && setError(true));
    }
    return () => {
      active = false;
    };
  }, [profile]);
  const name = profile?.nickname ?? '';
  const confirmed = (events ?? []).filter((e) => e.feedback === 'yes');
  const simulated = confirmed.filter((e) => e.source === 'demo').length;

  return (
    <div className="communication-page space-y-8">
      <PageHeader title={t('homeTitle')} description={t('homeSubtitle',{name})}/>
      <p className="principle">{t('commPrinciple')}</p>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="ov-live" className="home-live card relative flex min-h-60 flex-col justify-between gap-8 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <Radio aria-hidden className="size-7 text-primary" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-muted">
              <ShieldCheck aria-hidden className="size-4" />
              {t('homeOnDevice')}
            </span>
          </div>
          <div>
            <h2 id="ov-live" className="text-2xl">
              {t('homeLiveTitle')}
            </h2>
            <p className="mt-2 max-w-md text-ink-muted">{t('homeLiveBody', { name })}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="press flex min-h-12 w-fit items-center gap-3 rounded-full bg-primary-fill px-5 font-semibold text-on-primary hover:bg-primary-hover">
              {t('homeOpenLive')}
              <ArrowUpRight aria-hidden className="size-5" />
            </Link>
            <Link href="/teach" className="press flex min-h-12 w-fit items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
              <Plus aria-hidden className="size-5 text-primary" />
              {t('teachTitle')}
            </Link>
          </div>
        </section>
        <div className="grid grid-cols-2 content-start gap-3">
          <SummaryStat label={t('commTaught')} value={signals.length} detail={t('homeInLibrary')} icon={BookOpen} />
          <SummaryStat
            label={t('homeConfirmed')}
            value={confirmed.length}
            detail={error ? t('loadError') : !events ? t('homeLoading') : simulated ? t('homeInclSim', { n: simulated }) : t('homeToday')}
            icon={CheckCheck}
          />
          <p className="col-span-2 flex items-start gap-2 px-1 pt-1 text-sm text-ink-muted">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('homePrivacy')}
          </p>
        </div>
      </div>

      <section aria-labelledby="ov-flow">
        <h2 id="ov-flow" className="text-xl">
          {t('commFlowTitle')}
        </h2>
        <ol className="flow-steps mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FLOW.map((f, i) => (
            <li key={f.title} className="flow-step">
              <span className="flow-index" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <f.Icon aria-hidden className="size-5 text-primary" />
              <p className="font-semibold">{t(f.title)}</p>
              <p className="text-sm text-ink-muted">{t(f.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card aria-labelledby="ov-lib">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ov-lib" className="text-xl">
              {t('signalsTitle')}
            </h2>
            <Link href="/signals" className="flex min-h-11 items-center gap-1 text-sm text-primary">
              {t('homeSeeAll')}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
          {signals.length ? (
            <ul className="grouped-list mt-2">
              {signals.slice(0, 4).map((s) => {
                const Icon = iconFor(s.icon);
                return (
                  <li key={s.id}>
                    <Link href="/signals" className="flex min-h-16 items-center gap-3 py-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-primary">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{pickText(s.name, lang)}</span>
                        <span className="block text-sm text-ink-muted line-clamp-2">{pickText(s.meaning, lang)}</span>
                      </span>
                      <ChevronRight aria-hidden className="size-4 text-ink-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-start gap-3 py-6">
              <MessageCircleQuestion aria-hidden className="mt-1 size-5 shrink-0 text-ink-muted" />
              <p className="text-ink-muted">{t('emptyNoSignalsBody', { name })}</p>
            </div>
          )}
        </Card>
        <Card aria-labelledby="ov-recent">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="ov-recent" className="text-xl">
              {t('recentTitle')}
            </h2>
            <Link href="/timeline" className="flex min-h-11 items-center gap-1 text-sm text-primary">
              {t('navInsights')}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
          {error ? (
            <p role="alert" className="text-high-fg">
              {t('loadError')}
            </p>
          ) : events ? (
            <EventList events={events.slice(-4).reverse()} signals={signals} lang={lang} />
          ) : (
            <p className="text-ink-muted">{t('homeLoading')}</p>
          )}
        </Card>
      </div>

      <section aria-labelledby="ov-demo" className="demo-path rounded-[20px] border border-dashed border-border p-5 sm:p-6">
        <h2 id="ov-demo" className="flex items-center gap-2 text-lg">
          <FlaskConical aria-hidden className="size-5 text-rising-fg" />
          {t('demoPathTitle')}
        </h2>
        <p className="mt-1 max-w-2xl text-ink-muted">{t('demoPathBody')}</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {DEMO_PATH.map((d, i) => (
            <li key={d.label}>
              <Link href={d.href} className="press flex min-h-12 items-center gap-3 rounded-[14px] bg-surface px-4 py-2 hover:bg-surface-2">
                <span className="tabular font-semibold text-ink-muted">{i + 1}</span>
                <span className="flex-1">{t(d.label)}</span>
                <ChevronRight aria-hidden className="size-4 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
