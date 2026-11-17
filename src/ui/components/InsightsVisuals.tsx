import { useEffect, useMemo, useState } from 'react';
import type { EventRecord } from '../../engine/types';
import { useT } from '../../i18n';
import { listEvents } from '../../store/repo';
import { useData } from '../../store/useData';
import { useSettings } from '../../store/useApp';
import { ActivityHeatmap } from '../vendor/activity-heatmap';
import { BarChart } from '../vendor/bar-chart';
import { DonutChart } from '../vendor/donut-chart';
import { Card } from './Card';
import { SegmentedControl } from './Controls';
import { SummaryStat } from './SummaryStat';
import { Activity, CheckCheck } from 'lucide-react';

/** EasyUI chart wrappers: existing local events are the only data source. */
export function InsightsVisuals({ events, name, date }: { events: EventRecord[]; name: (id?: string) => string; date:string }) {
  const t = useT();
  const lang = useSettings(s => s.lang);
  const profile = useData(s => s.profile);
  const [period, setPeriod] = useState('day');
  const [range, setRange] = useState<{ key:string; events:EventRecord[] } | null>(null);
  const [failedKey, setFailedKey] = useState('');
  const rangeKey = `${profile?.id}/${date}/${period}`;
  useEffect(() => {
    if (period === 'day' || !profile) return;
    let active = true;
    const to = new Date(`${date}T23:59:59.999`);
    const from = new Date(`${date}T00:00:00`);
    from.setDate(from.getDate() - (period === '7d' ? 6 : 30));
    listEvents(profile.id, from.toISOString(), to.toISOString()).then(result => { if (active) setRange({key:rangeKey,events:result}); }).catch(() => { if (active) setFailedKey(rangeKey); });
    return () => { active = false; };
  }, [period, profile, date, rangeKey]);
  const displayEvents = period === 'day' ? events : range?.key === rangeKey ? range.events : null;
  const caption = t(period === 'day' ? 'selectedDay' : period === '7d' ? 'selectedWeek' : 'selectedMonth');
  const { matrix, distribution } = useMemo(() => {
    const matrix = Array.from({ length:7 }, () => Array<number>(24).fill(0));
    const counts = new Map<string, number>();
    for (const e of displayEvents ?? []) {
      if (e.kind !== 'signal' || !e.signalId) continue;
      const d = new Date(e.ts);
      matrix[(d.getDay() + 6) % 7]![d.getHours()]!++;
      counts.set(e.signalId, (counts.get(e.signalId) ?? 0) + 1);
    }
    return { matrix, distribution:[...counts].map(([id,value]) => ({ id, value })) };
  }, [displayEvents]);
  const weekdays = lang === 'ms' ? ['Isn','Sel','Rab','Kha','Jum','Sab','Ahd'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return <section className="space-y-4" aria-label={t('gestureOverview')}>
    <SegmentedControl label={t('gestureOverview')} value={period} onChange={setPeriod} options={[{value:'day',label:t('oneDay')},{value:'7d',label:t('sevenDays')},{value:'31d',label:t('thirtyOneDays')}]} />
    {failedKey === rangeKey && <p role="alert" className="text-high-fg">{t('loadError')}</p>}
    {!displayEvents ? <p className="text-ink-muted">{t('homeLoading')}</p> : <>
    <div className="grid grid-cols-2 gap-3"><SummaryStat label={t('gestureFrequency')} value={displayEvents.filter(e=>e.kind==='signal').length} detail={caption} icon={Activity}/><SummaryStat label={t('homeConfirmed')} value={displayEvents.filter(e=>e.feedback==='yes').length} detail={caption} icon={CheckCheck}/></div>
    <div className="insights-visuals grid min-w-0 gap-5 lg:grid-cols-2">
    <Card><h2 className="text-xl">{t('gestureFrequency')}</h2><p className="mb-4 mt-1 text-sm text-ink-muted">{caption}</p>{distribution.length ? <BarChart data={distribution.map(d => ({label:name(d.id),count:d.value}))} series={[{key:'count',label:t('colCount'),color:'var(--primary)'}]} height={200} animated={false} showLegend={false} ariaLabel={t('gestureFrequency')} /> : <p className="py-8 text-ink-muted">{t('noEvents')}</p>}</Card>
    <Card><h2 className="text-xl">{t('gestureDistribution')}</h2>{distribution.length ? <DonutChart data={distribution.map(d => ({label:name(d.id),value:d.value}))} size={160} thickness={18} centerLabel={t('colCount')} animated={false} ariaLabel={t('gestureDistribution')} /> : <p className="py-8 text-ink-muted">{t('noEvents')}</p>}</Card>
    <Card className="lg:col-span-2"><h2 className="text-xl">{t('whenGesturesHappen')}</h2><p className="mb-4 mt-1 text-sm text-ink-muted">{caption}</p><ActivityHeatmap summaryLabel={t('heatmapTotal', { n:displayEvents.filter(e=>e.kind==='signal').length })} peakLabel={t('heatmapPeak')} lessLabel={t('heatmapLess')} moreLabel={t('heatmapMore')} mode="hours" matrix={matrix} rowLabels={weekdays} color="var(--primary)" unit={t('heatmapUnit')} animated={false} ariaLabel={t('whenGesturesHappen')} /></Card>
  </div></>}</section>;
}
