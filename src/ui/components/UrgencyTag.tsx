import { clsx } from 'clsx';
import { ChevronDown, ChevronsUp, Minus } from 'lucide-react';
import type { Urgency } from '../../engine/types';
import { useT } from '../../i18n';

/** Urgency as icon + text + colour (never colour alone). */
export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  const t = useT();
  const cfg = {
    low: { Icon: ChevronDown, cls: 'bg-surface-2 text-ink-muted', label: t('urgLow') },
    normal: { Icon: Minus, cls: 'bg-primary-soft text-primary', label: t('urgNormal') },
    high: { Icon: ChevronsUp, cls: 'bg-high-bg text-high-fg', label: t('urgHigh') },
  }[urgency];
  return (
    <span className={clsx('inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-sm font-bold', cfg.cls)}>
      <cfg.Icon aria-hidden className="size-4" />
      {t('urgencyTag', { u: cfg.label })}
    </span>
  );
}
