import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { passphraseStrength } from '../../engine/crypto';
import { useT } from '../../i18n';

/** Passphrase input with show/hide and an optional strength hint (text + bar, not colour alone). */
export function PassphraseField({
  label,
  value,
  onChange,
  hint,
  error,
  showStrength = false,
  autoComplete = 'new-password',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
}) {
  const t = useT();
  const id = useId();
  const [shown, setShown] = useState(false);
  const s = passphraseStrength(value);
  const sLabel = t((['strength0', 'strength1', 'strength2', 'strength3'] as const)[s]);
  const describedBy = [hint && `${id}-h`, showStrength && `${id}-s`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-h`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <div className="relative mt-2">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-describedby={describedBy}
          aria-invalid={!!error || undefined}
          className={clsx('block min-h-12 w-full rounded-[16px] border bg-surface pl-4 pr-14 text-ink', error ? 'border-high-fg' : 'border-border')}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t('passHide') : t('passShow')}
          aria-pressed={shown}
          className="absolute right-0 top-0 grid size-12 place-items-center rounded-[16px] text-ink-muted hover:text-ink"
        >
          {shown ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div id={`${id}-s`} className="mt-2 flex items-center gap-3">
          <span aria-hidden className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <span key={i} className={clsx('h-2 w-10 rounded-full', i <= s ? (s === 1 ? 'bg-rising-fg' : 'bg-calm-fg') : 'bg-surface-2 ring-1 ring-border-soft')} />
            ))}
          </span>
          <span className="text-sm font-bold text-ink-muted">{t('strengthLabel', { s: sLabel })}</span>
        </div>
      )}
      {error && (
        <p id={`${id}-e`} className="mt-1 text-sm font-bold text-high-fg">
          {error}
        </p>
      )}
    </div>
  );
}
