import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className, children, as: As = 'section', ...rest }: HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' | 'li' }) {
  return (
    <As className={clsx('rounded-[20px] border border-border-soft bg-surface p-5 shadow-soft sm:p-6', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardTitle({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={clsx('text-lg', className)}>
      {children}
    </h2>
  );
}
