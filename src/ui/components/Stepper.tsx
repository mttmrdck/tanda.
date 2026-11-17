import * as Progress from '@radix-ui/react-progress';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { useT } from '../../i18n';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const t = useT();
  const pct = (current / (steps.length - 1)) * 100;
  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {t('stepOf', { n: current + 1, total: steps.length, label: steps[current] ?? '' })}
      </p>
      <Progress.Root value={current + 1} max={steps.length} aria-label={t('stepOf', { n: current + 1, total: steps.length, label: steps[current] ?? '' })} className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
        <Progress.Indicator className="h-full bg-primary-fill transition-[width] duration-[320ms] ease-[var(--ease-out)]" style={{ width: `${pct}%` }} />
      </Progress.Root>
      <ol className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s} aria-current={i === current ? 'step' : undefined} className={clsx('flex items-center gap-2 text-sm', i === current ? 'font-bold text-ink' : 'text-ink-muted')}>
            <span
              aria-hidden
              className={clsx(
                'grid size-7 shrink-0 place-items-center rounded-full border text-xs tabular',
                i < current ? 'border-primary bg-primary-fill text-on-primary' : i === current ? 'border-primary text-primary' : 'border-border',
              )}
            >
              {i < current ? <Check className="size-4" /> : i + 1}
            </span>
            <span className="hidden truncate sm:inline">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
