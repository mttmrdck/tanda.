/** Adapted from EasyUI Stat Card (MIT). Product form: no delta, ornamental trend, or default colors. */
import { NumberRoll } from '../components/NumberRoll';
export function StatCard({ label, value, period }: { label: string; value: number; trend: number[]; period: string; animated?: boolean }) {
  return <section aria-label={label} className="card min-w-0 p-4">
    <p className="stat-label pr-5">{label}</p>
    <p className="stat-value mt-3 leading-none"><NumberRoll value={value} /></p>
    <p className="mt-2 text-sm text-ink-muted">{period}</p>
  </section>;
}
