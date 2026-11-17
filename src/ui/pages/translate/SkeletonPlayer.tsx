import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useT } from '../../../i18n';
import { Button } from '../../components/Button';
import { SegmentedControl, Switch } from '../../components/Controls';
import { BONES, decode } from '../../components/SignalGlyph';

/** MediaPipe hand connections (21 points). */
const HAND: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const FRAME_MS = 125;

/**
 * Replay of a recorded sign template as a stick figure (landmarks only — no video, no face). Play/pause,
 * 0.5×/1×, loop, mirror for left-handed learners, highlighted hands, and a frame stepper with a caption.
 * With reduced motion it does not animate on its own: it starts paused on the step-through.
 */
export function SkeletonPlayer({ data, n, label, notes }: { data: Float32Array; n: number; label: string; notes?: string }) {
  const t = useT();
  const id = useId();
  const reduce = useReducedMotion() ?? false;
  const frames = useMemo(() => decode(data, n), [data, n]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const [speed, setSpeed] = useState<'1' | '0.5'>('1');
  const [loop, setLoop] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [highlight, setHighlight] = useState(true);

  useEffect(() => {
    setI(0);
    setPlaying(!reduce);
  }, [data, reduce]);

  useEffect(() => {
    if (!playing) return;
    const step = speed === '1' ? FRAME_MS : FRAME_MS * 2;
    const timer = setInterval(() => {
      setI((k) => (k + 1 < frames.length ? k + 1 : loop ? 0 : k));
    }, step);
    return () => clearInterval(timer);
  }, [playing, speed, loop, frames.length]);

  // without loop, stop on the last frame
  useEffect(() => {
    if (playing && !loop && i >= frames.length - 1) setPlaying(false);
  }, [playing, loop, i, frames.length]);

  const f = frames[i] ?? frames[0];
  if (!f) return null;
  const head = f.pts[0];
  const body = highlight ? 'var(--border)' : 'var(--ink)';
  const caption = t('trFrame', { label, i: i + 1, n: frames.length });

  return (
    <figure className="space-y-3" aria-labelledby={`${id}-cap`}>
      <div className="grid place-items-center rounded-[20px] bg-surface-2 p-3">
        <svg role="img" aria-label={caption} viewBox="-2.3 -2.4 4.6 4.3" className="h-56 w-auto sm:h-64" data-testid="skeleton-player">
          {/* default view is mirrored like a selfie camera; the toggle shows it un-mirrored for left-handed learners */}
          <g transform={mirror ? undefined : 'scale(-1 1)'} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <line x1="-2.2" x2="2.2" y1="1.55" y2="1.55" stroke="var(--border-soft)" strokeWidth="0.05" />
            {BONES.map(([a, b]) => {
              const pa = f.pts[a];
              const pb = f.pts[b];
              return pa && pb ? <line key={`${a}-${b}`} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={body} strokeWidth="0.1" /> : null;
            })}
            {head && <circle cx={head[0]} cy={head[1] - 0.05} r="0.3" stroke={body} strokeWidth="0.09" fill="var(--surface)" />}
            {f.hands.map((h, s) =>
              h ? (
                <g key={s}>
                  {HAND.map(([a, b]) => (
                    <line key={`${a}-${b}`} x1={h[a]![0]} y1={h[a]![1]} x2={h[b]![0]} y2={h[b]![1]} stroke="var(--primary)" strokeWidth={highlight ? 0.07 : 0.045} />
                  ))}
                </g>
              ) : null,
            )}
          </g>
        </svg>
      </div>
      <figcaption id={`${id}-cap`} className="text-center text-sm font-semibold" aria-live="off">
        {caption}
      </figcaption>
      {notes && <p className="text-sm text-ink-muted">{notes}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" aria-label={t('trPrevFrame')} onClick={() => { setPlaying(false); setI((k) => Math.max(0, k - 1)); }}>
          <ChevronLeft aria-hidden className="size-5" />
        </Button>
        <Button aria-pressed={playing} icon={playing ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />} onClick={() => setPlaying((p) => !p)}>
          {playing ? t('trPause') : t('trPlay')}
        </Button>
        <Button variant="secondary" aria-label={t('trNextFrame')} onClick={() => { setPlaying(false); setI((k) => Math.min(frames.length - 1, k + 1)); }}>
          <ChevronRight aria-hidden className="size-5" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <SegmentedControl label={t('trSpeed')} value={speed} onChange={setSpeed} options={[{ value: '0.5', label: '0.5×' }, { value: '1', label: '1×' }]} />
        <Switch label={t('trLoop')} checked={loop} onChange={setLoop} />
        <Switch label={t('trMirror')} checked={mirror} onChange={setMirror} />
        <Switch label={t('trHighlight')} checked={highlight} onChange={setHighlight} />
      </div>
    </figure>
  );
}
