import { clsx } from 'clsx';
import { FlaskConical, Hand, Info, Languages, SpellCheck } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Link } from 'wouter';
import type { SignPack } from '../../../engine/sign/pack';
import { useT, type MsgKey } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { useSignPacks } from '../../../store/useSignPacks';
import { useTranslate, type TranslateTab } from '../../../store/useTranslate';
import { Select } from '../../components/Controls';
import { EmptyState } from '../../components/EmptyState';
import { PackBadges, packTitle } from '../signs/SignBits';
import { Fingerspell } from './Fingerspell';
import { SignToWord } from './SignToWord';
import { WordToSign } from './WordToSign';

const TABS: { id: TranslateTab; label: MsgKey; Icon: typeof Hand }[] = [
  { id: 'sign', label: 'trTabSign', Icon: Hand },
  { id: 'word', label: 'trTabWord', Icon: Languages },
  { id: 'spell', label: 'trTabSpell', Icon: SpellCheck },
];

/** Default pack: a non-demo pack with signs, else the demo pack, else the (empty) ASL pack. */
function defaultPack(packs: readonly SignPack[]): string {
  return (packs.find((p) => !p.demo && p.signs.length > 0) ?? packs.find((p) => p.signs.length > 0) ?? packs[0])?.id ?? 'asl';
}

/**
 * Translate (Labs): words ↔ individual signs of ONE loaded sign pack. Separate from Live and from the child's
 * signals: its own store slice, camera session and matcher. Not a sentence translator.
 */
export default function Translate() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { packs, load, status } = useSignPacks();
  const { packId, tab, setPack, setTab } = useTranslate();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    // only when nothing is chosen yet; a chosen pack that disappears shows "pack missing" instead
    if (status === 'ready' && packId === null) setPack(defaultPack(packs));
  }, [status, packId, packs, setPack]);

  const pack = packs.find((p) => p.id === packId);
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (i + d + TABS.length) % TABS.length;
    setTab(TABS[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="translate-page space-y-5">
      {pack?.demo && (
        <p role="note" className="translate-banner sticky top-[84px] z-10 flex items-center gap-2 rounded-[16px] bg-rising-bg px-4 py-3 font-bold text-rising-fg" data-testid="demo-banner">
          <FlaskConical aria-hidden className="size-5 shrink-0" />
          {t('spDemoBadge')}
        </p>
      )}
      <header className="space-y-3">
        <h1 className="text-2xl sm:text-3xl">{t('trTitle')}</h1>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-end">
          <Select label={t('trPack')} value={packId ?? ''} onChange={setPack} options={packs.map((p) => ({ value: p.id, label: packTitle(p, lang) }))} />
          {pack && <PackBadges pack={pack} />}
        </div>
        <div className="space-y-1 text-ink-muted">
          <p className="flex gap-2" data-testid="translate-scope">
            <Info aria-hidden className="mt-1 size-4 shrink-0" />
            {t('trScope')}
          </p>
          <p className="pl-6">{t('trFaceNote')}</p>
        </div>
      </header>

      <div role="tablist" aria-label={t('trTabs')} className="translate-tabs grid grid-cols-3 gap-1 rounded-[18px] bg-surface-2 p-1">
        {TABS.map((tb, i) => (
          <button
            key={tb.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tr-tab-${tb.id}`}
            aria-selected={tab === tb.id}
            aria-controls={`tr-panel-${tb.id}`}
            tabIndex={tab === tb.id ? 0 : -1}
            onClick={() => setTab(tb.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={clsx(
              'press flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-2 text-sm font-semibold sm:text-base',
              tab === tb.id ? 'bg-surface text-ink shadow-[0_1px_4px_rgb(0_0_0/.12)]' : 'text-ink-muted hover:text-ink',
            )}
          >
            <tb.Icon aria-hidden className="size-5 shrink-0" />
            {t(tb.label)}
          </button>
        ))}
      </div>

      <section role="tabpanel" id={`tr-panel-${tab}`} aria-labelledby={`tr-tab-${tab}`}>
        {status === 'ready' && packId && !pack ? (
          <p role="alert" className="rounded-[16px] bg-high-bg p-4 font-bold text-high-fg">
            {t('trPackMissing')}
          </p>
        ) : !pack ? null : pack.signs.length === 0 ? (
          <EmptyState
            title={t('trEmptyTitle')}
            body={t('trEmptyBody')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/signs/author" className="press inline-flex min-h-12 items-center rounded-full bg-primary-fill px-5 font-bold text-on-primary hover:bg-primary-hover">
                  {t('trAuthor')}
                </Link>
                <Link href="/signs" className="press inline-flex min-h-12 items-center rounded-full bg-surface-2 px-5 font-bold hover:bg-primary-soft">
                  {t('trImport')}
                </Link>
              </div>
            }
          />
        ) : tab === 'sign' ? (
          <SignToWord pack={pack} />
        ) : tab === 'word' ? (
          <WordToSign pack={pack} />
        ) : (
          <Fingerspell pack={pack} />
        )}
      </section>
    </div>
  );
}
