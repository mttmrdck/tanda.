import { Pencil, Play, Plus, Search, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { CLIP_N } from '../../engine/constants';
import type { Category, Signal } from '../../engine/types';
import { pickText, useT } from '../../i18n';
import { deleteSignal, listEvents, updateSignal } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button, IconButton } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Controls';
import { ConfirmDelete, Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { relativeTime } from '../components/format';
import { iconFor } from '../components/signalIcons';
import { SignalGlyph } from '../components/SignalGlyph';
import { CATEGORIES, draftValid, SignalForm, type SignalDraft } from '../components/TeachBits';
import { UrgencyTag } from '../components/UrgencyTag';

function SignalCard({ s, lastSeen, onEdit, onDelete }: { s: Signal; lastSeen?: string; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const examples = useData((x) => x.examples[s.id] ?? []);
  const [hover, setHover] = useState(false);
  const [playing, setPlaying] = useState(false);
  const Icon = iconFor(s.icon);
  const name = pickText(s.name, lang);
  const sample = examples[examples.length - 1];
  return (
    <Card as="li" className="flex flex-col gap-4" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-primary-soft text-primary">
          <Icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg">{name}</h2>
          <p className="text-ink-muted">{pickText(s.meaning, lang)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-[16px] bg-surface-2 px-3 py-2">
        {sample ? <SignalGlyph data={sample.data} n={sample.n || CLIP_N} playing={hover || playing} label={t('glyphLabel', { name })} /> : <span className="h-32" />}
        <Button variant="quiet" aria-pressed={playing} icon={<Play aria-hidden className="size-5" />} onClick={() => setPlaying((p) => !p)} aria-label={t('playSignal', { name })}>
          {t('play')}
        </Button>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
        <div>
          <dt className="sr-only">{t('teachUrgency')}</dt>
          <dd>
            <UrgencyTag urgency={s.urgency} />
          </dd>
        </div>
        <div className="flex items-center">
          <dt className="sr-only">{t('teachCategory')}</dt>
          <dd>{t(CATEGORIES.find((c) => c.value === s.category)!.label)}</dd>
        </div>
        <div className="flex items-center">
          <dt className="sr-only">{t('addExamples')}</dt>
          <dd className="tabular">{t('examplesCount', { n: examples.length })}</dd>
        </div>
        <div className="flex items-center">
          <dt className="sr-only">{t('lastSeen', { when: '' })}</dt>
          <dd>{lastSeen ? t('lastSeen', { when: relativeTime(lastSeen, lang) }) : t('neverSeen')}</dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
        <Link href={`/teach/${s.id}/add`} className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-bold text-primary hover:bg-primary-soft">
          <Plus aria-hidden className="size-5" />
          {t('addExamples')}
        </Link>
        <span className="ml-auto flex gap-1">
          <IconButton label={`${t('edit')}: ${name}`} onClick={onEdit}>
            <Pencil aria-hidden className="size-5" />
          </IconButton>
          <IconButton label={`${t('delete')}: ${name}`} onClick={onDelete} className="text-high-fg hover:bg-high-bg">
            <Trash aria-hidden className="size-5" />
          </IconButton>
        </span>
      </div>
    </Card>
  );
}

export default function Signals() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Signal | null>(null);
  const [draft, setDraft] = useState<SignalDraft | null>(null);
  const [draftError, setDraftError] = useState('');
  const [deleting, setDeleting] = useState<Signal | null>(null);

  useEffect(() => {
    if (!profile) return;
    let live = true;
    void listEvents(profile.id)
      .then((evs) => {
        const m: Record<string, string> = {};
        for (const e of evs) if (e.kind === 'signal' && e.signalId && e.feedback !== 'no') m[e.signalId] = e.ts;
        if (live) setLastSeen(m);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [profile]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return signals.filter(
      (s) => (cat === 'all' || s.category === cat) && (!q || [s.name.en, s.name.ms, s.meaning.en, s.meaning.ms].some((x) => x.toLowerCase().includes(q))),
    );
  }, [signals, query, cat]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">{t('signalsTitle')}</h1>
          <p className="mt-1 text-ink-muted tabular">{t('signalsCount', { n: signals.length })}</p>
        </div>
        <Link href="/teach" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-fill px-5 font-bold text-on-primary hover:bg-primary-hover">
          <Plus aria-hidden className="size-5" />
          {t('newSignal')}
        </Link>
      </header>

      {signals.length === 0 ? (
        <EmptyState
          title={t('emptyNoSignalsTitle')}
          body={t('emptyNoSignalsBody', { name: profile?.nickname ?? '' })}
          action={
            <Link href="/teach" className="inline-flex min-h-12 items-center rounded-full bg-primary-fill px-5 font-bold text-on-primary hover:bg-primary-hover">
              {t('teachFirst')}
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="relative block lg:w-80">
              <span className="sr-only">{t('signalsSearch')}</span>
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('signalsSearch')}
                className="block min-h-12 w-full rounded-[16px] border border-border bg-surface pl-12 pr-4 text-ink placeholder:text-ink-muted"
              />
            </label>
            <fieldset>
              <legend className="sr-only">{t('filterLabel')}</legend>
              <div className="flex flex-wrap gap-2">
                <Chip selected={cat === 'all'} onClick={() => setCat('all')}>
                  {t('filterAll')}
                </Chip>
                {CATEGORIES.map((c) => (
                  <Chip key={c.value} selected={cat === c.value} onClick={() => setCat(c.value)}>
                    {t(c.label)}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-[16px] bg-surface-2 p-6 text-center text-ink-muted" role="status">
              {t('signalsNoMatch')}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="signal-grid">
              {shown.map((s) => (
                <SignalCard
                  key={s.id}
                  s={s}
                  {...(lastSeen[s.id] ? { lastSeen: lastSeen[s.id] } : {})}
                  onEdit={() => {
                    setEditing(s);
                    setDraft({ name: s.name, meaning: s.meaning, category: s.category, urgency: s.urgency, icon: s.icon });
                    setDraftError('');
                  }}
                  onDelete={() => setDeleting(s)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={t('editSignalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!editing || !draft) return;
                if (!draftValid(draft)) {
                  setDraftError(t('teachNameRequired'));
                  return;
                }
                try {
                  await updateSignal(editing.id, draft);
                  await useData.getState().refresh();
                  toast.success(t('saved'));
                  setEditing(null);
                } catch {
                  toast.error(t('storageError'));
                }
              }}
            >
              {t('save')}
            </Button>
          </>
        }
      >
        {draft && <div className="mt-4"><SignalForm draft={draft} onChange={(d) => { setDraft(d); if (draftValid(d)) setDraftError(''); }} lang={lang} error={draftError} /></div>}
      </Dialog>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('deleteSignalTitle', { name: deleting ? pickText(deleting.name, lang) : '' })}
        body={t('deleteSignalBody')}
        confirmLabel={t('delete')}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteSignal(deleting.id);
          await useData.getState().refresh();
          toast.success(t('signalDeleted'));
        }}
      />
    </div>
  );
}

