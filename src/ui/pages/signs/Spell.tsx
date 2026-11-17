import { TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { DEMO_GESTURE } from '../../../engine/sign/demoPack';
import { practiceFeedback, type PracticeFeedback } from '../../../engine/sign/feedback';
import { useT } from '../../../i18n';
import { recordSignAttempt } from '../../../store/signRepo';
import { useSettings } from '../../../store/useApp';
import { modelsFor, useSignPacks } from '../../../store/useSignPacks';
import { useSession } from '../../../store/useSession';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip, TextField } from '../../components/Controls';
import { SourceControls, VideoPanel } from '../../components/VideoPanel';
import { useSignCapture } from '../../hooks/useSignCapture';
import { CaptureOverlay, FeedbackView, glossOf, PackBadges } from './SignBits';

/** Fingerspelling practice: a sequence of held handshapes, checked one at a time. */
export default function Spell() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const skeleton = useSettings((s) => s.skeletonTeach);
  const setSettings = useSettings((s) => s.set);
  const { packId } = useParams<{ packId: string }>();
  const { packs, load } = useSignPacks();
  useEffect(() => void load(), [load]);
  const pack = packs.find((p) => p.id === packId);
  const phase = useSession((s) => s.phase);
  const kind = useSession((s) => s.kind);
  const cap = useSignCapture();
  const [seq, setSeq] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [word, setWord] = useState('');
  const [fb, setFb] = useState<PracticeFeedback | null>(null);

  const statics = useMemo(() => (pack?.signs ?? []).filter((s) => s.type === 'static'), [pack]);
  // typed word → signs whose gloss is that single letter
  const typed = useMemo(() => {
    const chars = [...word.toUpperCase().replace(/[^\p{L}]/gu, '')];
    const ids: string[] = [];
    const missing: string[] = [];
    for (const c of chars) {
      const s = statics.find((x) => x.gloss.toUpperCase() === c);
      if (s) ids.push(s.id);
      else if (!missing.includes(c)) missing.push(c);
    }
    return { ids, missing };
  }, [word, statics]);

  if (!pack) {
    return (
      <Link href="/signs" className="font-bold text-primary underline underline-offset-4">
        {t('spBack')}
      </Link>
    );
  }
  const glossFor = (id: string) => {
    const s = pack.signs.find((x) => x.id === id);
    return s ? glossOf(s, lang) : id;
  };
  const current = seq[pos];
  const done = seq.length > 0 && pos >= seq.length;

  const check = async () => {
    if (!current) return;
    setFb(null);
    const r = await cap.capture(kind === 'demo' ? (DEMO_GESTURE[current] ?? null) : null);
    if (!r) return;
    const w = r.still;
    const res: PracticeFeedback = w.clip ? practiceFeedback(w.clip, w.energy, current, modelsFor(pack)) : { verdict: 'not-seen', component: null, ratios: { handshape: 0, movement: 0, location: 0 } };
    setFb(res);
    if (res.verdict !== 'not-seen') await recordSignAttempt(pack.id, current, res.verdict === 'close', new Date().toISOString()).catch(() => null);
    if (res.verdict === 'close') setPos((p) => p + 1);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href={`/signs/pack/${pack.id}`} className="inline-flex min-h-12 items-center font-bold text-primary">
          ← {pack.title_en}
        </Link>
        <h1 className="text-2xl sm:text-3xl">{t('spSpell')}</h1>
        <PackBadges pack={pack} />
        {pack.language === 'ASL' && (
          <p className="flex items-center gap-2 font-semibold text-rising-fg">
            <TriangleAlert aria-hidden className="size-5 shrink-0" />
            {t('spAslConfusable')}
          </p>
        )}
      </header>

      {statics.length === 0 ? (
        <p>{t('spSpellNone')}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <VideoPanel skeleton={skeleton} onSkeleton={(v) => setSettings({ skeletonTeach: v })} overlay={<CaptureOverlay phase={cap.phase} count={cap.count} progress={cap.progress} />} />
            {current && (
              <p className="text-xl font-bold" data-testid="spell-now">
                {t('spSpellNow', { gloss: glossFor(current) })}
              </p>
            )}
            {done && (
              <p role="status" className="rounded-[16px] bg-calm-bg p-4 font-bold text-calm-fg">
                {t('spSpellDone')}
              </p>
            )}
            <Button size="lg" className="w-full" disabled={!current || phase !== 'running' || cap.busy} loading={cap.busy} onClick={() => void check()}>
              {cap.busy ? t('spChecking') : t('spCheck')}
            </Button>
            {fb && <FeedbackView fb={fb} glossFor={glossFor} isStatic />}
            <SourceControls gestures={[]} />
          </div>

          <Card className="space-y-4 self-start" aria-labelledby="pick-h">
            <h2 id="pick-h" className="text-lg">
              {t('spSpellPick')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {statics.map((s) => (
                <Chip
                  key={s.id}
                  selected={false}
                  onClick={() => {
                    setSeq((x) => (done ? [s.id] : [...x, s.id]));
                    if (done) setPos(0);
                    setFb(null);
                  }}
                >
                  {glossOf(s, lang)}
                </Chip>
              ))}
            </div>
            <TextField label={t('spSpellWord')} value={word} onChange={setWord} maxLength={12} />
            {typed.missing.length > 0 && <p className="text-sm">{t('spSpellMissing', { list: typed.missing.join(', ') })}</p>}
            {typed.ids.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSeq(typed.ids);
                  setPos(0);
                  setFb(null);
                }}
              >
                {t('spContinue')}
              </Button>
            )}
            {seq.length > 0 && (
              <div className="space-y-2 border-t border-border-soft pt-3">
                <p className="font-bold">{t('spSpellSequence')}</p>
                <ol className="flex flex-wrap gap-2" data-testid="spell-sequence">
                  {seq.map((id, i) => (
                    <li key={`${id}-${i}`} className={i < pos ? 'rounded-full bg-calm-bg px-3 py-1 text-calm-fg' : i === pos ? 'rounded-full bg-primary-soft px-3 py-1 font-bold text-primary' : 'rounded-full bg-surface-2 px-3 py-1'}>
                      {i < pos ? '✓ ' : ''}
                      {glossFor(id)}
                    </li>
                  ))}
                </ol>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setSeq([]);
                    setPos(0);
                    setFb(null);
                  }}
                >
                  {t('spSpellClear')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
