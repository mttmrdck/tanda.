import { PressButton } from '../vendor/press-button';
import { clsx } from 'clsx';
import { SignalLoader } from './SignalLoader';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

const base =
  'crafted-button press inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] disabled:cursor-not-allowed disabled:opacity-55';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-fill text-on-primary hover:bg-primary-hover',
  secondary: 'bg-surface-2 text-ink hover:bg-primary-soft',
  quiet: 'text-primary hover:bg-primary-soft',
  destructive: 'bg-high-bg text-high-fg shadow-[inset_0_0_0_1px_var(--high-fg)] hover:brightness-110',
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
    <PressButton
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(base, variants[variant], size === 'lg' ? 'min-h-12 px-7 text-base' : 'min-h-12 px-5', className)}
      {...rest}
    >
      {loading ? <SignalLoader /> : icon}
      {children}
    </PressButton>
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
    <PressButton ref={ref} type={type} aria-label={label} title={label} className={clsx(base, variants[variant], 'size-12 shrink-0', className)} {...rest}>
      {children}
    </PressButton>
  );
});
