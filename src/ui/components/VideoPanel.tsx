import { clsx } from 'clsx';
import { Battery, Camera, CircleCheck, CircleExclamationPoint, LoaderCircle, PersonStanding, ScanLine, Square } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useT, type MsgKey } from '../../i18n';
import type { GestureName } from '../../engine/simulator';
import { session, useSession } from '../../store/useSession';
import { onVisionStatus, visionStatus } from '../../vision/loader';
import { Button } from './Button';
import { CameraStage } from './CameraStage';
import { Chip, SegmentedControl } from './Controls';

export const GESTURE_LABEL: Record<GestureName, MsgKey> = {
  wave: 'gWave',
  handToMouth: 'gHandToMouth',
  coverEars: 'gCoverEars',
  armsUp: 'gArmsUp',
  pointRight: 'gPointRight',
  tapTable: 'gTapTable',
  rock: 'gRock',
  flap: 'gFlap',
  idle: 'gIdle',
  flail: 'gFlap',
  squeeze: 'gSqueeze',
};

const ERR: Record<string, MsgKey> = {
  denied: 'errDenied',
  'no-device': 'errNoDevice',
  busy: 'errBusy',
  unplugged: 'errUnplugged',
  insecure: 'errInsecure',
  unknown: 'errUnknown',
  vision: 'errVision',
};

/**
 * Camera / demo stage. While video runs, the status, skeleton toggle and Stop sit ON the stage so the picture
 * and the page's main action fit in one screen; source switching and demo gestures live in `SourceControls`,
 * which each page places itself. The camera is only started by an explicit button press (or resumed on return
 * to a camera page when the caregiver had it running — see SessionSync).
 */
export function VideoPanel({
  skeleton,
  onSkeleton,
  overlay,
}: {
  skeleton: boolean;
  onSkeleton: (v: boolean) => void;
  /** extra layer on top of the stage (teach countdown / recording ring) */
  overlay?: ReactNode;
}) {
  const t = useT();
  const s = useSession();
  const [vision, setVision] = useState(visionStatus());
  useEffect(() => onVisionStatus(setVision), []);

  const label =
    s.kind === 'demo'
      ? t('stageDemo')
      : s.kind === 'camera'
        ? t(s.seeing === 'ok' ? 'stageCameraVisible' : s.seeing === 'lost' ? 'stageCameraLost' : 'stageCameraWaiting')
        : t('stageOff');

  const status: { Icon: typeof Camera; text: string; tone: string } =
    s.phase === 'idle' || s.phase === 'error'
      ? { Icon: Camera, text: t('statusOff'), tone: 'text-ink-muted' }
      : s.phase === 'starting'
        ? { Icon: LoaderCircle, text: vision.state === 'loading' ? t('camPreparing') : t('camStarting'), tone: 'text-ink-muted' }
        : s.seeing === 'ok'
          ? { Icon: CircleCheck, text: t('statusSeeing'), tone: 'text-calm-fg' }
          : s.seeing === 'lost'
            ? { Icon: CircleExclamationPoint, text: t('statusLost'), tone: 'text-rising-fg' }
            : { Icon: LoaderCircle, text: t('statusWaiting'), tone: 'text-ink-muted' };
  const active = s.phase === 'running' || s.phase === 'starting';

  return (
    <div className="video-panel">
      <CameraStage skeleton={skeleton} label={label}>
        {overlay}
        {active && (
          <div className="stage-toolbar pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-3">
            <p className={clsx('stage-pill pointer-events-auto flex min-h-12 items-center gap-2 px-4 font-bold', status.tone)} data-testid="status-line">
              <status.Icon aria-hidden className={clsx('size-5 shrink-0', status.Icon === LoaderCircle && 'animate-spin motion-reduce:animate-none')} />
              {status.text}
            </p>
            <div className="pointer-events-auto flex gap-2">
              {s.kind === 'camera' && (
                <button
                  type="button"
                  aria-pressed={skeleton}
                  aria-label={t('showSkeleton')}
                  title={t('showSkeleton')}
                  onClick={() => onSkeleton(!skeleton)}
                  className={clsx('stage-pill grid size-12 place-items-center', skeleton ? 'text-primary' : 'text-ink-muted')}
                >
                  <PersonStanding aria-hidden className="size-5" />
                </button>
              )}
              <button type="button" onClick={() => session.stop()} className="stage-pill flex min-h-12 items-center gap-2 px-4 font-bold text-ink">
                <Square aria-hidden className="size-4" />
                {t('camStop')}
              </button>
            </div>
          </div>
        )}
        {(s.phase === 'idle' || s.phase === 'error') && (
          <div className="stage-idle absolute inset-0 grid place-items-center p-4 sm:p-6">
            <div className="max-w-sm text-center">
              {s.phase === 'error' && s.error ? (
                <p role="alert" className="flex items-start gap-2 rounded-[16px] bg-high-bg p-3 text-left font-bold text-high-fg">
                  <CircleExclamationPoint aria-hidden className="mt-0.5 size-5 shrink-0" />
                  {t(ERR[s.error] ?? 'errUnknown')}
                </p>
              ) : (
                <>
                  <ScanLine aria-hidden className="mx-auto size-12 text-ink-muted" />
                  <p className="mt-2 font-display text-lg font-semibold">{t('stageOffTitle')}</p>
                  <p className="mt-1 hidden text-ink-muted sm:block">{t('stageOffBody')}</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button icon={<Camera aria-hidden className="size-5" />} variant={s.preferredSource === 'camera' ? 'primary' : 'secondary'} onClick={() => void session.start('camera')}>
                  {s.phase === 'error' && s.error !== 'vision' ? t('errorRetry') : t('camStart')}
                </Button>
                <Button variant={s.preferredSource === 'camera' ? 'secondary' : 'primary'} onClick={() => void session.start('demo')}>
                  {s.phase === 'error' ? t('tryDemoMode') : t('sourceDemo')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CameraStage>
    </div>
  );
}

/** Camera ⇄ demo switch, low-power note, and (for the demo performer) the gesture buttons. Hidden while video is off. */
export function SourceControls({ gestures, onPerform }: { gestures: GestureName[]; onPerform?: (g: GestureName) => void }) {
  const t = useT();
  const s = useSession();
  if (s.phase !== 'running' && s.phase !== 'starting') return null;
  return (
    <div className="source-controls space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SegmentedControl
          label={t('sourceLabel')}
          value={s.kind ?? 'demo'}
          onChange={(k) => void session.start(k)}
          options={[
            { value: 'camera', label: t('sourceCamera') },
            { value: 'demo', label: t('sourceDemo') },
          ]}
        />
        {s.stats?.lowPower && (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-2 px-3 text-sm font-bold text-ink-muted">
            <Battery aria-hidden className="size-4" />
            {t('lowPower')}
          </span>
        )}
      </div>

      {s.kind === 'demo' && s.phase === 'running' && gestures.length > 0 && (
        <fieldset>
          <legend className="font-bold">{t('demoAsk')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {gestures.map((g) => (
              <Chip
                key={g}
                selected={s.demoGesture === g}
                onClick={() => {
                  session.performDemo(g);
                  onPerform?.(g);
                }}
              >
                {t(GESTURE_LABEL[g])}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
