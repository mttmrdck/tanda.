import * as RSwitch from '@radix-ui/react-switch';
import * as RSlider from '@radix-ui/react-slider';
import * as RSelect from '@radix-ui/react-select';
import * as RTabs from '@radix-ui/react-tabs';
import { clsx } from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/** Labelled switch row. */
export function Switch({ label, hint, checked, onChange, id }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <label htmlFor={sid} className="flex-1 cursor-pointer">
        <span className="block font-bold">{label}</span>
        {hint && (
          <span id={`${sid}-hint`} className="block text-sm text-ink-muted">
            {hint}
          </span>
        )}
      </label>
      <RSwitch.Root
        id={sid}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={hint ? `${sid}-hint` : undefined}
        className="switch-control relative h-8 w-14 shrink-0 rounded-full border border-border bg-surface-2 transition-colors duration-[200ms] data-[state=checked]:border-primary-fill data-[state=checked]:bg-primary-fill"
      >
        <span aria-hidden className="switch-state-mark"><Check className="size-3" /></span>
        <RSwitch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-ink-muted shadow transition-transform duration-[200ms] ease-[var(--ease-out)] data-[state=checked]:translate-x-[26px] data-[state=checked]:bg-on-primary" />
      </RSwitch.Root>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
  left,
  right,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  valueText: string;
  left?: string;
  right?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="font-bold">
          {label}
        </span>
        <span className="text-sm text-ink-muted tabular">{valueText}</span>
      </div>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      <RSlider.Root
        className="relative mt-2 flex h-12 w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
        aria-labelledby={id}
      >
        <RSlider.Track className="relative h-2 grow rounded-full bg-surface-2 ring-1 ring-border">
          <RSlider.Range className="absolute h-full rounded-full bg-primary-fill" />
        </RSlider.Track>
        <RSlider.Thumb aria-labelledby={id} aria-valuetext={valueText} className="block size-7 rounded-full border-2 border-primary-fill bg-white shadow-soft" />
      </RSlider.Root>
      {(left || right) && (
        <div className="flex justify-between text-sm text-ink-muted" aria-hidden>
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <span id={id} className="block font-bold">
        {label}
      </span>
      {hint && (
        <span id={`${id}-h`} className="block text-sm text-ink-muted">
          {hint}
        </span>
      )}
      <RSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
        <RSelect.Trigger
          aria-labelledby={id}
          aria-describedby={hint ? `${id}-h` : undefined}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-[16px] border border-border bg-surface-2 px-4 text-left text-ink"
        >
          <RSelect.Value />
          <RSelect.Icon>
            <ChevronDown aria-hidden className="size-5" />
          </RSelect.Icon>
        </RSelect.Trigger>
        <RSelect.Portal>
          <RSelect.Content position="popper" sideOffset={6} className="select-menu glass z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[28px] text-ink">
            <RSelect.Viewport className="p-1">
              {options.map((o) => (
                <RSelect.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex min-h-12 cursor-pointer select-none items-center rounded-[14px] py-2 pl-10 pr-4 outline-none data-[highlighted]:bg-primary-soft"
                >
                  <RSelect.ItemIndicator className="absolute left-3">
                    <Check aria-hidden className="size-5 text-primary" />
                  </RSelect.ItemIndicator>
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </div>
  );
}

/** Single-choice segmented control (radio group semantics). */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  hideLabel?: boolean;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className={clsx('font-bold', hideLabel && 'sr-only')}>{label}</legend>
      <div className={clsx('segmented-control inline-flex flex-wrap gap-1 rounded-[24px] bg-surface-2 p-1 shadow-[var(--hairline),inset_0_0_0_1px_var(--border-soft)]', !hideLabel && 'mt-2')}>
        {options.map((o) => (
          <label
            key={o.value}
            className={clsx(
              'relative inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-4 font-bold transition-colors duration-[200ms] has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              value === o.value ? 'bg-primary-fill text-on-primary shadow-[0_6px_20px_-8px_rgb(42_99_242/0.8)]' : 'text-ink-muted hover:text-ink',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.icon}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Toggle chip (checkbox-like or radio-like via aria-pressed). */
export function Chip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'press inline-flex min-h-12 items-center gap-2 rounded-full border px-4 font-bold transition-colors duration-[200ms]',
        selected ? 'border-primary bg-primary-soft text-primary' : 'border-border-soft bg-surface-2 text-ink hover:border-border',
        className,
      )}
    >
      {selected && <Check aria-hidden className="size-4" />}
      {children}
    </button>
  );
}

export const Tabs = RTabs.Root;
export function TabList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RTabs.List aria-label={label} className="inline-flex gap-1 rounded-full bg-surface-2 p-1 shadow-[var(--hairline),inset_0_0_0_1px_var(--border-soft)]">
      {children}
    </RTabs.List>
  );
}
export function Tab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RTabs.Trigger
      value={value}
      className="press inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-bold text-ink-muted transition-colors hover:text-ink data-[state=active]:bg-primary-fill data-[state=active]:text-on-primary"
    >
      {children}
    </RTabs.Trigger>
  );
}
export const TabPanel = RTabs.Content;

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  optional,
  multiline,
  placeholder,
  lang,
  autoFocus,
  maxLength = 200,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  optional?: string;
  multiline?: boolean;
  placeholder?: string;
  lang?: string;
  autoFocus?: boolean;
  maxLength?: number;
  inputClassName?: string;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const cls = clsx(
    'mt-2 block w-full rounded-[16px] border bg-surface-2 px-4 text-ink placeholder:text-ink-muted',
    error ? 'border-high-fg' : 'border-border',
    multiline ? 'min-h-24 py-3' : 'min-h-12',
    inputClassName,
  );
  return (
    <div>
      <label htmlFor={id} className="font-bold">
        {label}
        {optional && <span className="font-normal text-ink-muted"> ({optional})</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea id={id} className={cls} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={!!error || undefined} placeholder={placeholder} lang={lang} maxLength={maxLength} rows={2} />
      ) : (
        <input
          id={id}
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={!!error || undefined}
          placeholder={placeholder}
          lang={lang}
          autoFocus={autoFocus}
          maxLength={maxLength}
          autoComplete="off"
        />
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-bold text-high-fg">
          {error}
        </p>
      )}
    </div>
  );
}
