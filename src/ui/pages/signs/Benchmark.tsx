import { FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { CLIP_N, D, EMIT_CONFIDENCE, IDLE_ENERGY } from '../../../engine/constants';
import { DEMO_GESTURE, DEMO_PACK_ID } from '../../../engine/sign/demoPack';
import { heldWindow, MOVE_MS } from '../../../engine/sign/window';
import { benchmark, parseLabels, type BenchItem, type BenchResult } from '../../../engine/sign/metrics';
import { recogniseDynamic, recogniseStatic, type PackModels } from '../../../engine/sign/models';
import type { SignPack } from '../../../engine/sign/pack';
import { bestSubWindow, featureMotionEnergy } from '../../../engine/motion';
import { clipFeatures } from '../../../engine/processor';
import { resampleClip } from '../../../engine/resample';
import { simulateClip } from '../../../engine/simulator';
import type { FeatureFrame } from '../../../engine/types';
import { useT } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { modelsFor, useSignPacks } from '../../../store/useSignPacks';
import { session } from '../../../store/useSession';
import { featuresFromVideo } from '../../../vision/videoFile';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Select, Switch, TextField } from '../../components/Controls';
import { EmptyState } from '../../components/EmptyState';
import { packTitle } from './SignBits';

/** Movement first (busiest 2 s); if no confident movement sign, a held handshape (held 1 s window). */
function predict(frames: readonly FeatureFrame[], models: PackModels): string | null {
  const win = bestSubWindow(frames, MOVE_MS);
  const energy = featureMotionEnergy(win);
  const clip = resampleClip(win, CLIP_N, D);
  if (clip && energy >= IDLE_ENERGY && models.dynamic.length) {
    const r = recogniseDynamic(clip, models, energy);
    if (r.signalId && r.confidence >= EMIT_CONFIDENCE) return r.signalId;
  }
  const still = heldWindow(frames);
  const held = resampleClip(still, CLIP_N, D);
  if (held && featureMotionEnergy(still) < IDLE_ENERGY && models.static.length) {
    const r = recogniseStatic(held, models);
    if (r.signId && r.confidence >= EMIT_CONFIDENCE) return r.signId;
  }
  return null;
}

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`);

export default function Benchmark() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { packs, load } = useSignPacks();
  useEffect(() => void load(), [load]);
  const usable = packs.filter((p) => p.signs.length > 0);
  const [packId, setPackId] = useState(DEMO_PACK_ID);
  const pack = packs.find((p) => p.id === packId);
  const [clips, setClips] = useState<File[]>([]);
  const [labelsText, setLabelsText] = useState('');
  const [signers, setSigners] = useState('');
  const [adults, setAdults] = useState(false);
  const [hearing, setHearing] = useState('');
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<{ res: BenchResult; synthetic: boolean; skipped: string[]; label: string } | null>(null);

  const idFor = (p: SignPack, label: string) => p.signs.find((s) => s.id === label || s.gloss.toLowerCase() === label.toLowerCase())?.id;

  const runReal = async () => {
    if (!pack) return;
    session.stop();
    const labels = parseLabels(labelsText);
    const models = modelsFor(pack);
    const items: BenchItem[] = [];
    const skipped: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const f = clips[i]!;
      setProgress(t('spBenchRunning', { i: i + 1, n: clips.length }));
      const truth = idFor(pack, labels.get(f.name) ?? '');
      if (!truth) {
        skipped.push(f.name);
        continue;
      }
      items.push({ truth, pred: predict(await featuresFromVideo(f), models) });
    }
    setProgress('');
    setResult({ res: benchmark(pack.signs.map((s) => s.id), items), synthetic: false, skipped, label: t('spBenchLabel', { n: signers.trim() || '?', hearing: hearing.trim() || '?' }) });
  };

  const runSynthetic = () => {
    const demo = packs.find((p) => p.id === DEMO_PACK_ID);
    if (!demo) return;
    const models = modelsFor(demo);
    const items: BenchItem[] = [];
    for (const s of demo.signs) {
      const g = DEMO_GESTURE[s.id];
      if (!g) continue;
      for (let seed = 1; seed <= 5; seed++) {
        const frames = clipFeatures(simulateClip(g, { seed: 50_000 + seed, noise: 0.006, durationMs: 2500, dropout: 0.02 }));
        items.push({ truth: s.id, pred: predict(frames, models) });
      }
    }
    setResult({ res: benchmark(demo.signs.map((s) => s.id), items), synthetic: true, skipped: [], label: t('spBenchSyntheticLabel') });
  };

  const glossOf = (id: string) => [...packs].flatMap((p) => p.signs).find((s) => s.id === id)?.gloss ?? id;
  const ready = !!pack && clips.length > 0 && labelsText.trim().length > 0 && adults && signers.trim().length > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/signs" className="inline-flex min-h-12 items-center font-bold text-primary">
          ← {t('spBack')}
        </Link>
        <h1 className="text-2xl sm:text-3xl">{t('spBenchTitle')}</h1>
        <p className="text-ink-muted">{t('spBenchIntro')}</p>
      </header>

      <Card className="space-y-4">
        <Select label={t('spChoosePack')} value={packId} onChange={setPackId} options={usable.map((p) => ({ value: p.id, label: packTitle(p, lang) }))} />
        <div>
          <label htmlFor="bench-clips" className="block font-bold">
            {t('spBenchClips')}
          </label>
          <input id="bench-clips" type="file" accept="video/*" multiple className="mt-2 block min-h-12" onChange={(e) => setClips([...(e.target.files ?? [])])} />
        </div>
        <div>
          <label htmlFor="bench-labels" className="block font-bold">
            {t('spBenchLabels')}
          </label>
          <input id="bench-labels" type="file" accept=".csv,.txt,text/csv,text/plain" className="mt-2 block min-h-12" onChange={(e) => void e.target.files?.[0]?.text().then(setLabelsText)} />
        </div>
        <TextField label={t('spBenchSigners')} value={signers} onChange={setSigners} maxLength={4} />
        <TextField label={t('spBenchHearing')} value={hearing} onChange={setHearing} maxLength={120} />
        <Switch label={t('spBenchAdults')} checked={adults} onChange={setAdults} />
        <div className="flex flex-wrap gap-3">
          <Button size="lg" disabled={!ready} onClick={() => void runReal()}>
            {t('spBenchRun')}
          </Button>
          <Button variant="secondary" icon={<FlaskConical aria-hidden className="size-5" />} onClick={runSynthetic}>
            {t('spBenchSynthetic')}
          </Button>
        </div>
        {progress && <p role="status">{progress}</p>}
      </Card>

      {!result ? (
        <EmptyState title={t('spBenchTitle')} body={t('spBenchEmpty')} />
      ) : (
        <Card className="space-y-4" aria-labelledby="bench-res" data-testid="bench-result">
          <h2 id="bench-res" className="flex items-center gap-2 text-lg">
            {result.synthetic && <FlaskConical aria-hidden className="size-5 text-rising-fg" />}
            {result.label}
          </h2>
          <p className="font-bold">{t('spBenchAccuracy', { acc: pct(result.res.accuracy), ns: pct(result.res.notSureRate), total: result.res.total })}</p>
          {result.skipped.length > 0 && <p>{t('spBenchSkipped', { list: result.skipped.join(', ') })}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-4">{t('spBenchSign')}</th>
                  <th className="py-2 pr-4">{t('spBenchPrecision')}</th>
                  <th className="py-2 pr-4">{t('spBenchRecall')}</th>
                  <th className="py-2">{t('spBenchSupport')}</th>
                </tr>
              </thead>
              <tbody>
                {result.res.perSign.map((r) => (
                  <tr key={r.label} className="border-t border-border-soft">
                    <td className="py-2 pr-4">{glossOf(r.label)}</td>
                    <td className="py-2 pr-4 tabular">{pct(r.precision)}</td>
                    <td className="py-2 pr-4 tabular">{pct(r.recall)}</td>
                    <td className="py-2 tabular">{r.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="font-bold">{t('spBenchMatrix')}</h3>
          <div className="overflow-x-auto">
            <table className="text-sm tabular">
              <thead>
                <tr>
                  <th />
                  {[...result.res.labels.map(glossOf), t('spNotSure')].map((h) => (
                    <th key={h} scope="col" className="px-2 py-1 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.res.matrix.map((row, i) => (
                  <tr key={result.res.labels[i]} className="border-t border-border-soft">
                    <th scope="row" className="py-1 pr-2 text-left font-semibold">
                      {glossOf(result.res.labels[i]!)}
                    </th>
                    {row.map((v, j) => (
                      <td key={j} className={j === i && v > 0 ? 'px-2 py-1 text-center font-bold' : 'px-2 py-1 text-center'}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
