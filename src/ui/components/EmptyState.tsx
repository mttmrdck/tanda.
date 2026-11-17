import type { ReactNode } from 'react';

/** Simple hand-drawn illustration: two hands making a gesture. Decorative. */
function Illustration() {
  return (
    <svg aria-hidden viewBox="0 0 160 110" className="h-24 w-auto text-primary">
      <circle cx="80" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M50 105c4-28 14-42 30-42s26 14 30 42" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 72l-22-26M102 72l22-26" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 40c2-6 8-8 12-4M130 40c-2-6-8-8-12-4" fill="none" stroke="var(--rising-fg)" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 30l6 2M138 30l-6 2M28 20l4 5M132 20l-4 5" stroke="var(--rising-fg)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border bg-surface-2 px-6 py-10 text-center">
      <Illustration />
      <h2 className="text-xl">{title}</h2>
      <p className="max-w-md text-ink-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
