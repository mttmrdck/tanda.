import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div className="page-heading-copy">
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </header>
  );
}
export function StatusBadge({
  children,
  tone = 'neutral',
  dot = true,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'calm' | 'review' | 'danger' | 'info';
  dot?: boolean;
}) {
  return (
    <span className={clsx('status-badge', `status-${tone}`)}>
      {dot && <span className="status-dot" aria-hidden />}
      {children}
    </span>
  );
}
