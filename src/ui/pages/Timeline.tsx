import { Table } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import type { EventRecord } from '../../engine/types';
import { pickText, useT } from '../../i18n';
import { listEvents } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button } from '../components/Button';
import { ExportFan } from '../components/ExportFan';
import { HistoryLog } from '../components/HistoryLog';
import { InsightsVisuals } from '../components/InsightsVisuals';
import { Card } from '../components/Card';
import { downloadBlob, fileStem, ymd } from '../components/download';
import { dayLabel, hourLabel, timeOfDay } from '../components/format';
import { tierLabel } from '../components/LiveBits';
import { iconFor } from '../components/signalIcons';
import { byHour, calmSeries, dayBounds, peakHour, toCsv, todayStr, topSignals } from './timelineData';

const TIER_KEYS = ['tierCalm', 'tierRising', 'tierHigh'] as const;

function ChartFrame({ title, alt, table, children }: { title: string; alt: string; table: React.ReactNode; children: React.ReactNode }) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <Card className="daily-chart-frame" aria-labelledby={`${id}-h`}>
      <div className="daily-chart-heading">
        <h2 id={`${id}-h`} className="text-lg">
          {title}
        </h2>
        <Button variant="quiet" icon={<Table aria-hidden className="size-5" />} aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
          {showTable ? t('hideTable') : t('showTable')}
        </Button>
      </div>
      <p id={`${id}-alt`} className="daily-chart-caption text-sm text-ink-muted">
        {alt}
      </p>
      <div className="daily-chart-plot h-56 w-full" role="img" aria-labelledby={`${id}-h`} aria-describedby={`${id}-alt`}>
        {children}
      </div>
      {showTable && <div className="mt-4 overflow-x-auto">{table}</div>}
    </Card>
  );
}

export default function Timeline() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const [date, setDate] = useState(todayStr());
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let live = true;
    setEvents(null);
    setError(false);
    const { from, to } = dayBounds(date || todayStr());
    listEvents(profile.id, from, to)
      .then((e) => live && setEvents(e))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [profile, date]);

  const name = (id?: string) => {
    const s = id ? signals.find((x) => x.id === id) : undefined;
    return s ? pickText(s.name, lang) : t('deletedSignal');
  };

  const hours = useMemo(() => byHour(events ?? []), [events]);
  const calm = useMemo(() => calmSeries(events ?? []), [events]);
  const top = useMemo(() => topSignals(events ?? []), [events]);
  const signalEvents = (events ?? []).filter((e) => e.kind === 'signal');
  const total = signalEvents.length;
  const busiest = hours.reduce((a, b) => (b.count > a.count ? b : a), hours[0]!);
  const maxLevel = calm.reduce((m, p) => Math.max(m, p.level), 0);

  const insights: string[] = [];
  if (top[0]) {
    const h = peakHour(events ?? [], top[0].signalId);
    if (h !== null) insights.push(t('insightPeak', { name: name(top[0].signalId), from: hourLabel(h, lang), to: hourLabel((h + 1) % 24, lang) }));
  }
  const answered = signalEvents.filter((e) => e.feedback);
  if (answered.length) insights.push(t('insightConfirmed', { yes: answered.filter((e) => e.feedback === 'yes').length, total: answered.length }));
  const highs = (events ?? []).filter((e) => e.kind === 'calm-tier' && e.tier === 'high').length;
  if (highs) insights.push(t('insightHigh', { n: highs }));

  const exportFile = (kind: 'csv' | 'json') => {
    if (!events || !profile) return;
    const stem = `${fileStem(profile.nickname)}-timeline-${ymd(dayBounds(date).date)}`;
    if (kind === 'csv') {
      const csv = toCsv(events, signals, (s) => ({ name: pickText(s.name, lang), meaning: pickText(s.meaning, lang) }), (iso) => new Date(iso).toLocaleString(lang === 'ms' ? 'ms-MY' : 'en-GB'));
      downloadBlob(csv, `${stem}.csv`, 'text/csv;charset=utf-8');
      toast.success(t('exported', { file: `${stem}.csv` }));
    } else {
      const json = JSON.stringify(
        {
          profile: profile.nickname,
          date,
          events: events.map((e) => ({ ...e, signalName: e.signalId ? name(e.signalId) : undefined })),
        },
        null,
        2,
      );
      downloadBlob(json, `${stem}.json`, 'application/json');
      toast.success(t('exported', { file: `${stem}.json` }));
    }
  };

  const axis = { stroke: 'var(--ink-muted)', fontSize: 14 };
  const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 12, color: 'var(--ink)' };

  return (
    <div className="timeline-page space-y-6">
      <header className="timeline-heading">
        <div>
          <h1 className="text-2xl sm:text-3xl">{t('navInsights')}</h1>
          <p className="mt-1 text-ink-muted">{dayLabel(dayBounds(date || todayStr()).date, lang)}</p>
        </div>
        <div className="timeline-tools"><div className="timeline-date">
          <label className="block">
            <span className="sr-only">{t('timelineDay')}</span>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value || todayStr())}
              className="block min-h-11 rounded-full border-0 bg-surface px-4 text-sm font-semibold text-ink"
            />
          </label>
        </div><ExportFan disabled={!events} onCsv={() => exportFile('csv')} onJson={() => exportFile('json')} /></div>
      </header>

      {error && (
        <p role="alert" className="rounded-[16px] bg-high-bg p-4 font-bold text-high-fg">
          {t('loadError')}
        </p>
      )}

      {!events && !error ? (
        <div aria-hidden className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-[28px] bg-surface-2" />
          <div className="h-80 rounded-[28px] bg-surface-2" />
        </div>
      ) : events ? (
        <>
          <InsightsVisuals events={events} name={name} date={date} />
          <Card aria-label={t('topSignals')}>
            <ul className="space-y-1" data-testid="insights">
              {(insights.length ? insights : [t('insightNone')]).map((s) => (
                <li key={s} className="text-lg">
                  {s}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartFrame
              title={t('byHourTitle')}
              alt={total ? t('chartByHourAlt', { n: total, hour: hourLabel(busiest.hour, lang) }) : t('chartByHourAltEmpty')}
              table={
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-soft">
                      <th className="py-2">{t('colHour')}</th>
                      <th className="py-2">{t('colCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours
                      .filter((h) => h.count > 0)
                      .map((h) => (
                        <tr key={h.hour} className="border-b border-border-soft">
                          <td className="py-2 tabular">{hourLabel(h.hour, lang)}</td>
                          <td className="py-2 tabular">{h.count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                  <XAxis dataKey="hour" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={3} tickFormatter={(h: number) => String(h).padStart(2, '0')} />
                  <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} width={68} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={tooltipStyle} labelFormatter={(h) => hourLabel(Number(h), lang)} formatter={(v) => [v, t('colCount')]} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>

            <ChartFrame
              title={t('calmScoreTitle')}
              alt={t('chartCalmAlt', { n: Math.max(calm.length - 2, 0), tier: t(TIER_KEYS[maxLevel]!) })}
              table={
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-soft">
                      <th className="py-2">{t('colTime')}</th>
                      <th className="py-2">{t('colScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(events ?? [])
                      .filter((e) => e.kind === 'calm-tier')
                      .map((e) => (
                        <tr key={e.id} className="border-b border-border-soft">
                          <td className="py-2 tabular">{timeOfDay(e.ts, lang)}</td>
                          <td className="py-2">{t(tierLabel(e.tier ?? 'calm'))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={calm.length ? calm : [{ h: 0, level: 0, score: 0 }, { h: 24, level: 0, score: 0 }]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                  <XAxis dataKey="h" type="number" domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(h: number) => String(Math.floor(h)).padStart(2, '0')} />
                  <YAxis domain={[0, 2]} ticks={[0, 1, 2]} tick={axis} tickLine={false} axisLine={false} width={68} tickFormatter={(v: number) => t(TIER_KEYS[v] ?? 'tierCalm')} />
                  <Line type="stepAfter" dataKey="level" stroke="var(--rising-fg)" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Card aria-labelledby="top-h">
              <h2 id="top-h" className="text-lg">
                {t('topSignals')}
              </h2>
              {top.length ? (
                <ol className="mt-3 space-y-2">
                  {top.slice(0, 5).map((x) => {
                    const s = signals.find((y) => y.id === x.signalId);
                    const Icon = iconFor(s?.icon ?? '');
                    return (
                      <li key={x.signalId} className="flex items-center gap-3">
                        <Icon aria-hidden className="size-5 text-primary" />
                        <span className="flex-1 font-bold">{name(x.signalId)}</span>
                        <span className="tabular text-ink-muted">{x.count}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-ink-muted">{t('noEvents')}</p>
              )}
            </Card>
            <Card aria-labelledby="events-h">
              <h2 id="events-h" className="text-lg">
                {t('eventsTitle')}
              </h2>
              {events.length ? (
                <div className="mt-3 overflow-x-auto">
                  <HistoryLog events={events} name={name} lang={lang} />
                </div>
              ) : (
                <p className="mt-3 text-ink-muted">{t('noEvents')}</p>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
