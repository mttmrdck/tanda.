import type { ReactNode } from 'react';

import { Hand } from 'lucide-react';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state flex flex-col items-center gap-3 bg-surface px-6 py-6 text-center">
      <span className="empty-state-mark">
        <Hand aria-hidden className="size-8 text-ink-muted" />
      </span>
      <h2 className="text-xl">{title}</h2>
      <p className="max-w-md text-ink-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
