import type { LucideIcon } from 'lucide-react';
import { StatCard } from '../vendor/stat-card';

/** Product wrapper: screens never depend on registry props or visual defaults. */
export function SummaryStat({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: LucideIcon }) {
  return <div className="relative min-w-0"><Icon aria-hidden className="absolute right-4 top-4 size-4 text-ink-muted" /><StatCard label={label} value={value} trend={[]} period={detail} animated={false} /></div>;
}
