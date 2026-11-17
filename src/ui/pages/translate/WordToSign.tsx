import { CircleSlash } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SignPack } from '../../../engine/sign/pack';
import { planWords, searchSigns, type QueueItem } from '../../../engine/translate/search';
import { useT } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { modelsFor } from '../../../store/useSignPacks';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextField } from '../../components/Controls';
import { glossOf } from '../signs/SignBits';
import { SkeletonPlayer } from './SkeletonPlayer';
import { SpellSteps } from './SpellSteps';

/** Word → sign: look words up in the pack and replay the recorded signs. Never invents a sign. */
export function WordToSign({ pack }: { pack: SignPack }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const models = modelsFor(pack);
  const [q, setQ] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pos, setPos] = useState(0);
  const [spellOpen, setSpellOpen] = useState<number | null>(null);
  const [letter, setLetter] = useState<number | null>(null);
  const suggestions = useMemo(() => searchSigns(pack, q, 6), [pack, q]);
  const multi = q.trim().split(/\s+/).length > 1;

  const show = (items: QueueItem[]) => {
    setQueue(items);
    setPos(0);
    setSpellOpen(null);
    setLetter(null);
  };
  const current = queue[pos];
  const currentSign = current?.signId ? pack.signs.find((s) => s.id === current.signId) : undefined;
  const clip = currentSign ? models.clips.get(currentSign.id)?.[0] : undefined;
  const letterStep = current && !current.signId && spellOpen === pos && letter !== null ? current.spell?.[letter] : undefined;
  const letterSign = letterStep?.signId ? pack.signs.find((s) => s.id === letterStep.signId) : undefined;
  const letterClip = letterSign ? models.clips.get(letterSign.id)?.[0] : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="space-y-4 self-start">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            show(planWords(q, pack));
          }}
        >
          <TextField label={t('trSearch')} value={q} onChange={setQ} maxLength={120} />
          <Button type="submit" size="lg" disabled={!q.trim()}>
            {t('trShow')}
          </Button>
        </form>
        {!multi && suggestions.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-ink-muted">{t('trSuggestions')}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => show([{ text: s.gloss, signId: s.id, spell: null }])}
                    className="press inline-flex min-h-12 items-center rounded-full bg-surface-2 px-4 font-semibold hover:bg-primary-soft"
                  >
                    {glossOf(s, lang)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {queue.length > 0 && (
          <div className="space-y-2 border-t border-border-soft pt-3">
            <h2 className="text-lg">{t('trQueue')}</h2>
            <p className="text-sm text-ink-muted">{t('trQueueNote')}</p>
            <ol className="space-y-2" data-testid="word-queue">
              {queue.map((it, i) => (
                <li key={`${it.text}-${i}`} className="space-y-2">
                  <button
                    type="button"
                    aria-current={i === pos ? 'step' : undefined}
                    onClick={() => {
                      setPos(i);
                      setLetter(null);
                    }}
                    className="press flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] border border-border-soft px-4 text-left aria-[current=step]:border-primary aria-[current=step]:bg-primary-soft"
                  >
                    <span className="font-bold">
                      {i + 1}. {it.text}
                    </span>
                    {!it.signId && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-rising-fg">
                        <CircleSlash aria-hidden className="size-4" />
                        {t('trNotInPack')}
                      </span>
                    )}
                  </button>
                  {!it.signId && it.spell && i === pos && (
                    <div className="space-y-2 pl-2">
                      {spellOpen !== i ? (
                        <Button variant="secondary" onClick={() => setSpellOpen(i)}>
                          {t('trFingerspellIt')}
                        </Button>
                      ) : (
                        <SpellSteps steps={it.spell} pack={pack} selected={letter} onSelect={setLetter} />
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>

      <div aria-live="polite">
        {currentSign && clip ? (
          <Card className="space-y-2" data-testid="word-player">
            <p className="text-2xl font-bold">{currentSign.gloss}</p>
            {currentSign.gloss_ms && <p className="text-ink-muted">{currentSign.gloss_ms}</p>}
            <SkeletonPlayer data={clip} n={16} label={currentSign.gloss} {...(currentSign.notes ? { notes: currentSign.notes } : {})} />
          </Card>
        ) : letterSign && letterClip ? (
          <Card className="space-y-2" data-testid="word-player">
            <p className="text-2xl font-bold">{pack.demo ? t('trDemoLetter', { ch: letterStep!.char }) : letterStep!.char}</p>
            <SkeletonPlayer data={letterClip} n={16} label={letterSign.gloss} {...(letterSign.notes ? { notes: letterSign.notes } : {})} />
          </Card>
        ) : current && !current.signId ? (
          <Card>
            <p className="text-lg font-bold" data-testid="word-missing">
              “{current.text}”: {t('trNotInPack')}
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
