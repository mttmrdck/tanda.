import { clsx } from 'clsx';
import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-[12px] font-bold transition-[transform,background-color,border-color,color] duration-[120ms] ease-[var(--ease-out)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-ink hover:bg-surface-2',
  quiet: 'text-primary hover:bg-primary-soft',
  destructive: 'border border-high-fg bg-high-bg text-high-fg hover:brightness-95',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(base, variants[variant], size === 'lg' ? 'min-h-14 px-6 text-lg' : 'min-h-12 px-5', className)}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  children: ReactNode;
}

/** Square 48×48 button with an accessible label (icon-only). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'quiet', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label} className={clsx(base, variants[variant], 'size-12 shrink-0', className)} {...rest}>
      {children}
    </button>
  );
});
