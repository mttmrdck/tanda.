import { emptyBaseline, type Observation, type PersonalBaseline } from './contracts.js';

/** Engineering defaults for an experimental MVP, not a validated care policy. */
export const BASELINE_SAMPLE_MIN = 20;
export const BASELINE_COVERAGE_MIN_MS = 19000;
export const MAX_GAP_MS = 5000;
export const contextFor = (o: Observation) => `${o.sourceMode}:${o.roomId}:${Math.floor(o.localHour / 6)}`;
export function collectBaseline(current: PersonalBaseline, o: Observation): PersonalBaseline {
  if (o.quality !== 'good' || o.energy === null || !o.reviewedContext)
    return { ...current, state: current.count ? current.state : 'insufficient' };
  const context = contextFor(o);
  if (current.context && current.context !== context) return { ...current, state: 'requires-review' };
  if (current.state === 'available' || current.state === 'requires-review') return current;
  const deltaMs = current.lastAt ? Date.parse(o.at) - Date.parse(current.lastAt) : 0;
  if (current.lastAt && deltaMs < 1000) return current;
  const count = current.count + 1;
  const delta = o.energy - current.mean;
  const mean = current.mean + delta / count;
  const next: PersonalBaseline = {
    ...current,
    context,
    count,
    mean,
    m2: current.m2 + delta * (o.energy - mean),
    coverageMs: current.coverageMs + (deltaMs > 0 && deltaMs <= MAX_GAP_MS ? deltaMs : 0),
    activeCount: current.activeCount + (o.energy > 0.1 ? 1 : 0),
    firstAt: current.firstAt ?? o.at,
    lastAt: o.at,
    state: 'collecting',
  };
  if (count >= BASELINE_SAMPLE_MIN && next.coverageMs >= BASELINE_COVERAGE_MIN_MS) next.state = 'available';
  return next;
}
export function deviation(b: PersonalBaseline, o: Observation): boolean {
  if (b.state !== 'available' || contextFor(o) !== b.context || o.quality !== 'good' || o.energy === null) return false;
  const sd = Math.sqrt(b.m2 / Math.max(1, b.count - 1));
  return Math.abs(o.energy - b.mean) > Math.max(0.5, 3 * sd);
}
export function resetBaseline() {
  return { ...emptyBaseline(), state: 'collecting' as const };
}
