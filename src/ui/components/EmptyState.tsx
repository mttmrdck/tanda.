import type { ReactNode } from 'react';

import { Hand } from 'lucide-react';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface px-6 py-6 text-center">
      <Hand aria-hidden className="size-8 text-ink-muted" />
      <h2 className="text-xl">{title}</h2>
      <p className="max-w-md text-ink-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
