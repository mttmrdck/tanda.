import { useEffect, useState } from 'react';
import { onVisionStatus, visionStatus, type VisionStatus } from '../../vision/loader';
import { session, useSession } from '../../store/useSession';
import { CameraStage } from '../components/CameraStage';
import { ALL_GESTURES } from '../../engine/simulator';

/** Developer diagnostics. Not linked from navigation; only bundled in non-production builds. */
export default function DebugPage() {
  const s = useSession();
  const [vision, setVision] = useState<VisionStatus>(visionStatus());
  const [emissions, setEmissions] = useState<string[]>([]);

  useEffect(() => {
    session.setMode('debug');
    const off1 = onVisionStatus(setVision);
    const off2 = session.onEmission((e) => setEmissions((x) => [`${e.signalId} ${(e.confidence * 100).toFixed(0)}`, ...x].slice(0, 10)));
    return () => {
      off1();
      off2();
      session.stop();
      session.setMode('live');
    };
  }, []);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      <h1 className="text-xl md:col-span-2">Debug</h1>
      <div>
        <CameraStage skeleton label={`source ${s.kind ?? 'none'}, seeing ${s.seeing}`} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="min-h-12 rounded-[12px] border border-border px-4" onClick={() => void session.start('camera')}>
            Camera
          </button>
          <button type="button" className="min-h-12 rounded-[12px] border border-border px-4" onClick={() => void session.start('demo')}>
            Demo
          </button>
          <button type="button" className="min-h-12 rounded-[12px] border border-border px-4" onClick={() => session.stop()}>
            Stop
          </button>
        </div>
        {s.kind === 'demo' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_GESTURES.map((g) => (
              <button key={g} type="button" className="min-h-12 rounded-[12px] border border-border px-3" onClick={() => session.performDemo(g)}>
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 self-start text-sm tabular" data-testid="debug-state">
        <dt>vision</dt>
        <dd data-testid="vision">{vision.state === 'ready' ? `ready ${vision.delegate}` : vision.state}</dd>
        <dt>phase</dt>
        <dd data-testid="phase">{s.phase}{s.error ? ` (${s.error})` : ''}</dd>
        <dt>seeing</dt>
        <dd data-testid="seeing">{s.seeing}</dd>
        <dt>fps</dt>
        <dd>{s.stats ? `${s.stats.fps} / ${s.stats.targetFps}${s.stats.lowPower ? ' low-power' : ''}` : '–'}</dd>
        <dt>inference</dt>
        <dd>{s.stats ? `${s.stats.inferenceMs.toFixed(1)} ms` : '–'}</dd>
        <dt>last eval</dt>
        <dd>{s.lastEval ? `${s.lastEval.result.signalId ?? s.lastEval.result.reason} e=${s.lastEval.energy.toFixed(2)}` : '–'}</dd>
        <dt>calm</dt>
        <dd data-testid="calm">{s.calm ? `${s.calm.tier} ${s.calm.score.toFixed(2)} p=${s.calm.periodicity.toFixed(2)}` : '–'}</dd>
        <dt>emissions</dt>
        <dd data-testid="emissions">{emissions.join(', ') || '–'}</dd>
      </dl>
    </main>
  );
}
