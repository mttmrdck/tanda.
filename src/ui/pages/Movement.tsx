import { Activity, CircleSlash, Eye, NotebookPen, Ruler } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { BASELINE_MIN_SAMPLES } from '../../engine/calmWatch';
import type { ComfortSteps, EventRecord } from '../../engine/types';
import { useT, type MsgKey } from '../../i18n';
import { listEvents, updateEvent, updateProfile } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { useSession } from '../../store/useSession';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/Controls';
import { dayLabel, shortDayLabel, timeOfDay } from '../components/format';
import { CalmMeter, calmReasons, SimulatedTag, tierLabel } from '../components/LiveBits';

const DAYS = 7;
const MEASURES: MsgKey[] = ['mvMeasure1', 'mvMeasure2', 'mvMeasure3', 'mvMeasure4'];
const LIMITS: MsgKey[] = ['mvLimit1', 'mvLimit2', 'mvLimit3', 'mvLimit4'];

interface DayRow {
  date: Date;
  changes: number;
  above: number;
  wellAbove: number;
}

/** Group recorded movement-level changes by day (oldest first), for the last `DAYS` days. */
function byDay(events: readonly EventRecord[], now = new Date()): DayRow[] {
  const rows: DayRow[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    rows.push({ date: d, changes: 0, above: 0, wellAbove: 0 });
  }
  for (const e of events) {
    if (e.kind !== 'calm-tier') continue;
    const d = new Date(e.ts);
    d.setHours(0, 0, 0, 0);
    const row = rows.find((r) => r.date.getTime() === d.getTime());
    if (!row) continue;
    row.changes++;
    if (e.tier === 'rising') row.above++;
    if (e.tier === 'high') row.wellAbove++;
  }
  return rows;
}

/**
 * Movement Insights (experimental): what Calm Watch measures, shown as observations relative to the person's
 * own baseline — never as feelings or a diagnosis. Caregiver notes are stored on the event but shown apart
 * from the measurement.
 */
export default function Movement() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const profile = useData((s) => s.profile);
  const calm = useSession((s) => s.calm);
  const phase = useSession((s) => s.phase);
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [comfort, setComfort] = useState<ComfortSteps>(profile?.comfortSteps ?? { calm: '', rising: '', high: '' });

  useEffect(() => {
    setComfort(profile?.comfortSteps ?? { calm: '', rising: '', high: '' });
    if (!profile) return;
    let live = true;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (DAYS - 1));
    void listEvents(profile.id, from.toISOString())
      .then((es) => live && setEvents(es.filter((e) => e.kind === 'calm-tier')))
      .catch(() => live && setEvents([]));
    return () => {
      live = false;
    };
  }, [profile]);

  const rows = useMemo(() => byDay(events ?? []), [events]);
  const total = rows.reduce((a, r) => a + r.changes, 0);
  const above = rows.reduce((a, r) => a + r.above + r.wellAbove, 0);
  const peak = Math.max(1, ...rows.map((r) => r.changes));
  const baselineN = profile?.calmBaseline?.length ?? 0;
  const running = phase === 'running';

  const saveNote = async (id: string) => {
    const note = draft.trim();
    try {
      await updateEvent(id, note ? { note } : { note: undefined });
      setEvents((es) => (es ?? []).map((e) => (e.id === id ? { ...e, ...(note ? { note } : { note: undefined }) } : e)));
      setEditing(null);
      toast.success(t('mvNoteSaved'));
    } catch {
      toast.error(t('storageError'));
    }
  };

  const saveComfort = async () => {
    if (!profile) return;
    try {
      const p = await updateProfile(profile.id, { comfortSteps: { calm: comfort.calm.trim(), rising: comfort.rising.trim(), high: comfort.high.trim() } });
      useData.getState().setProfile(p);
      toast.success(t('saved'));
    } catch {
      toast.error(t('storageError'));
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1>{t('calmTitle')}</h1>
          <span className="status-tag">{t('tagExperimental')}</span>
        </div>
        <p className="max-w-3xl text-ink-muted">{t('mvIntro')}</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card aria-labelledby="mv-now" className="space-y-4">
          <h2 id="mv-now" className="text-lg">
            {t('mvNow')}
          </h2>
          {running && calm ? (
            <>
              <CalmMeter state={calm} />
              <p data-testid="mv-reasons">{calmReasons(calm, lang, t).join(' · ') || t('calmSettled')}</p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-ink-muted">{t('mvNotRunning')}</p>
              <Link href="/" className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
                <Activity aria-hidden className="size-5" />
                {t('mvOpenLive')}
              </Link>
            </div>
          )}
          <p className="text-sm text-ink-muted">{t('calmNotDiagnosis')}</p>
        </Card>
        <Card aria-labelledby="mv-base" className="space-y-2">
          <h2 id="mv-base" className="text-lg">
            {t('mvBaseline')}
          </h2>
          <p data-testid="mv-baseline">{baselineN >= BASELINE_MIN_SAMPLES ? t('mvBaselineReady', { n: baselineN }) : t('mvBaselineLearning', { n: baselineN, min: BASELINE_MIN_SAMPLES })}</p>
        </Card>
      </div>

      <Card aria-labelledby="mv-pat" className="space-y-4">
        <h2 id="mv-pat" className="text-lg">
          {t('mvPatterns')}
        </h2>
        {events === null ? (
          <p className="text-ink-muted">{t('homeLoading')}</p>
        ) : total === 0 ? (
          <p className="text-ink-muted">{t('mvNoHistory')}</p>
        ) : (
          <>
            <p data-testid="mv-summary">{t('mvPatternsSummary', { n: total, above })}</p>
            <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[18rem] text-left text-sm">
              <caption className="sr-only">{t('mvPatterns')}</caption>
              <thead>
                <tr className="text-ink-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    {t('mvDay')}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    {t('mvChanges')}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    {t('tierRising')}
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    {t('tierHigh')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date.toISOString()} className="border-t border-border-soft">
                    <th scope="row" className="py-2 pr-3 font-normal">
                      <span className="max-sm:hidden">{dayLabel(r.date, lang)}</span>
                      <span className="sm:hidden">{shortDayLabel(r.date, lang)}</span>
                    </th>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2 tabular">
                        <span aria-hidden className="h-2 rounded-full bg-primary-fill" style={{ width: `${(r.changes / peak) * 6}rem`, minWidth: r.changes ? '0.5rem' : 0 }} />
                        {r.changes}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular">{r.above}</td>
                    <td className="py-2 tabular">{r.wellAbove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      <Card aria-labelledby="mv-obs" className="space-y-3">
        <h2 id="mv-obs" className="text-lg">
          {t('mvObservations')}
        </h2>
        <p className="text-sm text-ink-muted">{t('mvObsHint')}</p>
        {events && events.length > 0 ? (
          <ul className="divide-y divide-border-soft" data-testid="mv-observations">
            {[...events]
              .reverse()
              .slice(0, 20)
              .map((e) => (
                <li key={e.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
                      <Ruler aria-hidden className="size-4" />
                      {t('mvMeasured')}
                    </span>
                    <span className="font-semibold">{t(tierLabel(e.tier ?? 'calm'))}</span>
                    <time dateTime={e.ts} className="text-sm text-ink-muted tabular">
                      {dayLabel(new Date(e.ts), lang)} · {timeOfDay(e.ts, lang)}
                    </time>
                    {e.source === 'demo' && <SimulatedTag />}
                  </div>
                  {editing === e.id ? (
                    <form
                      className="space-y-2"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        void saveNote(e.id);
                      }}
                    >
                      <TextField label={t('mvNoteLabel')} value={draft} onChange={setDraft} multiline maxLength={500} />
                      <div className="flex gap-2">
                        <Button type="submit">{t('save')}</Button>
                        <Button variant="secondary" onClick={() => setEditing(null)}>
                          {t('cancel')}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {e.note && (
                        <p className="caregiver-note">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                            <Eye aria-hidden className="size-4" />
                            {t('mvYourNote')}
                          </span>
                          <span className="block">{e.note}</span>
                        </p>
                      )}
                      <Button
                        variant="quiet"
                        className="min-h-11 px-3"
                        icon={<NotebookPen aria-hidden className="size-4" />}
                        onClick={() => {
                          setDraft(e.note ?? '');
                          setEditing(e.id);
                        }}
                      >
                        {t(e.note ? 'mvEditNote' : 'mvAddNote')}
                      </Button>
                    </>
                  )}
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t('mvNoHistory')}</p>
        )}
      </Card>

      <Card aria-labelledby="mv-helps" className="space-y-3">
        <h2 id="mv-helps" className="text-lg">
          {t('secComfort')}
        </h2>
        <p className="text-sm text-ink-muted">{t('comfortHint')}</p>
        <form
          className="settings-form space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void saveComfort();
          }}
        >
          <TextField label={t('comfortCalm')} value={comfort.calm} onChange={(calm) => setComfort({ ...comfort, calm })} placeholder={t('comfortPlaceholderCalm')} multiline maxLength={300} />
          <TextField label={t('comfortRising')} value={comfort.rising} onChange={(rising) => setComfort({ ...comfort, rising })} placeholder={t('comfortPlaceholderRising')} multiline maxLength={300} />
          <TextField label={t('comfortHigh')} value={comfort.high} onChange={(high) => setComfort({ ...comfort, high })} placeholder={t('comfortPlaceholderHigh')} multiline maxLength={300} />
          <Button type="submit">{t('save')}</Button>
        </form>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="mv-m" className="space-y-2">
          <h2 id="mv-m" className="flex items-center gap-2 text-lg">
            <Ruler aria-hidden className="size-5 text-primary" />
            {t('mvMeasuresTitle')}
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            {MEASURES.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="mv-l" className="space-y-2">
          <h2 id="mv-l" className="flex items-center gap-2 text-lg">
            <CircleSlash aria-hidden className="size-5 text-rising-fg" />
            {t('mvLimitsTitle')}
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            {LIMITS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
