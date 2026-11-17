import { describe, expect, it } from 'vitest';
import { byHour, calmSeries, CSV_HEADER, peakHour, toCsv, topSignals } from '../../src/ui/pages/timelineData';
import type { EventRecord, Signal } from '../../src/engine/types';

const at = (h: number, m = 0) => new Date(2026, 2, 1, h, m).toISOString();
const sig: Signal = { id: 's', profileId: 'p', name: { en: 'Water', ms: 'Air' }, meaning: { en: 'I want "water", please', ms: '' }, category: 'need', urgency: 'normal', icon: 'water', createdAt: '' };
const evs: EventRecord[] = [
  { id: '1', profileId: 'p', ts: at(10, 5), kind: 'signal', signalId: 's', confidence: 0.8, feedback: 'yes' },
  { id: '2', profileId: 'p', ts: at(10, 40), kind: 'signal', signalId: 's', confidence: 0.7 },
  { id: '3', profileId: 'p', ts: at(14), kind: 'signal', signalId: 's', confidence: 0.6, feedback: 'no' },
  { id: '4', profileId: 'p', ts: at(11), kind: 'calm-tier', tier: 'rising', score: 0.5 },
];

describe('timeline data', () => {
  it('counts signals by local hour', () => {
    const h = byHour(evs);
    expect(h[10]!.count).toBe(2);
    expect(h[14]!.count).toBe(1);
  });
  it('top signals ignore corrected recognitions; peak hour is found', () => {
    expect(topSignals(evs)).toEqual([{ signalId: 's', count: 2 }]);
    expect(peakHour(evs, 's')).toBe(10);
  });
  it('calm series is a step series starting calm', () => {
    const c = calmSeries(evs);
    expect(c[0]).toEqual({ h: 0, level: 0, score: 0 });
    expect(c[1]!.level).toBe(1);
  });
  it('CSV has the header row, escapes quotes and blocks formula injection', () => {
    const csv = toCsv([...evs, { ...evs[0]!, id: '5', signalId: 'x' }], [{ ...sig, name: { en: '=HYPERLINK()', ms: '' } }, sig], (s) => ({ name: s.name.en, meaning: s.meaning.en }), () => '10:05');
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines[1]).toContain('"I want ""water"", please"');
    expect(csv).not.toContain(',=HYPERLINK');
  });
  it('CSV says where each event came from (camera, demo, or unrecorded for older data) and keeps caregiver notes', () => {
    const csv = toCsv([{ ...evs[0]!, source: 'demo', note: 'Rocking before lunch' }, { ...evs[0]!, id: '6' }], [sig], (s) => ({ name: s.name.en, meaning: s.meaning.en }), () => '10:05');
    const [, demo, old] = csv.trim().split('\n');
    expect(demo!.endsWith(',demo,Rocking before lunch')).toBe(true);
    expect(old!.endsWith(',unrecorded,')).toBe(true);
  });
});
