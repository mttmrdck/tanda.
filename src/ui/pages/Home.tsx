import { Activity, ArrowUpRight, BookOpen, CheckCheck, ChevronRight, Plus, Radio, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { EventRecord } from '../../engine/types';
import { pickText, useT } from '../../i18n';
import { listEvents } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Card } from '../components/Card';
import { EventList } from '../components/LiveBits';
import { iconFor } from '../components/signalIcons';
import { SummaryStat } from '../components/SummaryStat';

export default function Home() {
  const t = useT();
  const lang = useSettings(s => s.lang);
  const profile = useData(s => s.profile);
  const signals = useData(s => s.signals);
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setEvents(null); setError(false);
    if (profile) {
      const from = new Date(); from.setHours(0, 0, 0, 0);
      listEvents(profile.id, from.toISOString()).then(e => { if (active) setEvents(e); }).catch(() => { if (active) setError(true); });
    }
    return () => { active = false; };
  }, [profile]);
  return <div className="space-y-7">
    <header><h1>{t('homeTitle', { name: profile?.nickname ?? '' })}</h1><p className="mt-1 text-ink-muted">{t('homeSubtitle')}</p></header>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <section className="home-live card relative flex min-h-64 flex-col justify-between gap-8 p-6 sm:p-8">
        <div className="flex items-start justify-between"><Radio aria-hidden className="size-7 text-primary" /><span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-muted">{t('homeOnDevice')}</span></div>
        <div><h2 className="text-2xl">{t('homeLiveTitle')}</h2><p className="mt-2 max-w-sm text-ink-muted">{t('homeLiveBody', { name: profile?.nickname ?? '' })}</p></div>
        <Link href="/" className="press flex min-h-12 w-fit items-center gap-8 rounded-full bg-primary-fill px-5 font-semibold text-on-primary">{t('homeOpenLive')}<ArrowUpRight aria-hidden className="size-5" /></Link>
      </section>
      <div className="grid grid-cols-2 gap-3 content-start">
        <SummaryStat label={t('homeLearned')} value={signals.length} detail={t('homeInLibrary')} icon={BookOpen} />
        <SummaryStat label={t('homeConfirmed')} value={(events ?? []).filter(e => e.feedback === 'yes').length} detail={error ? t('loadError') : events ? t('homeToday') : t('homeLoading')} icon={CheckCheck} />
        <Link href="/teach" className="press col-span-2 flex min-h-16 items-center gap-3 rounded-[16px] bg-surface px-5"><Plus aria-hidden className="size-5 text-primary" /><span className="flex-1 font-semibold">{t('teachTitle')}</span><ChevronRight aria-hidden className="size-4 text-ink-muted" /></Link>
        <p className="col-span-2 flex items-start gap-2 px-2 pt-2 text-sm text-ink-muted"><ShieldCheck aria-hidden className="size-4 shrink-0" />{t('homePrivacy')}</p>
      </div>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card><div className="flex items-center justify-between gap-3"><h2 className="text-xl">{t('navSignals')}</h2><Link href="/signals" className="flex min-h-11 items-center gap-1 text-sm text-primary">{t('homeSeeAll')}<ChevronRight aria-hidden className="size-4" /></Link></div>
        {signals.length ? <ul className="grouped-list mt-2">{signals.slice(0, 4).map(s => { const Icon = iconFor(s.icon); return <li key={s.id}><Link href="/signals" className="flex min-h-16 items-center gap-3 py-3"><span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-primary"><Icon aria-hidden className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{pickText(s.name, lang)}</span><span className="block truncate text-sm text-ink-muted">{pickText(s.meaning, lang)}</span></span><ChevronRight aria-hidden className="size-4 text-ink-muted" /></Link></li>; })}</ul> : <div className="flex items-start gap-3 py-6"><Activity aria-hidden className="mt-1 size-5 shrink-0 text-ink-muted" /><p className="text-ink-muted">{t('emptyNoSignalsBody', { name: profile?.nickname ?? '' })}</p></div>}
      </Card>
      <Card><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl">{t('recentTitle')}</h2><Link href="/timeline" className="flex min-h-11 items-center gap-1 text-sm text-primary">{t('navInsights')}<ChevronRight aria-hidden className="size-4" /></Link></div>{error ? <p role="alert" className="text-high-fg">{t('loadError')}</p> : events ? <EventList events={events.slice(-4).reverse()} signals={signals} lang={lang} /> : <p className="text-ink-muted">{t('homeLoading')}</p>}</Card>
    </div>
  </div>;
}
