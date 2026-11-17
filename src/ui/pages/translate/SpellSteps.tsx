import { CircleSlash, Hand } from 'lucide-react';
import type { SignPack } from '../../../engine/sign/pack';
import type { SpellStep } from '../../../engine/translate/search';
import { useT } from '../../../i18n';

/** A word as fingerspelling steps: only letters with real templates are buttons; the rest say why not. */
export function SpellSteps({ steps, pack, selected, onSelect }: { steps: SpellStep[]; pack: SignPack; selected: number | null; onSelect: (i: number) => void }) {
  const t = useT();
  return (
    <ol className="flex flex-wrap gap-2" data-testid="spell-steps">
      {steps.map((st, i) => {
        if (st.status !== 'ok') {
          return (
            <li key={i} className="inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-dashed border-border px-3 text-sm">
              <CircleSlash aria-hidden className="size-4 shrink-0" />
              {t(st.status === 'unsupported' ? 'trLetterUnsupported' : 'trLetterMissing', { ch: st.char })}
            </li>
          );
        }
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={selected === i}
              className="press inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-[14px] border border-border bg-surface px-3 text-lg font-bold aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
            >
              <Hand aria-hidden className="size-4" />
              {pack.demo ? t('trDemoLetter', { ch: st.char }) : st.char}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
