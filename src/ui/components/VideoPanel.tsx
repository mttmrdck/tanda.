import { clsx } from 'clsx';
import { Battery, Camera, CircleCheck, CircleExclamationPoint, LoaderCircle, PersonStanding } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT, type MsgKey } from '../../i18n';
import type { GestureName } from '../../engine/simulator';
import { session, useSession } from '../../store/useSession';
import { onVisionStatus, visionStatus } from '../../vision/loader';
import { Button } from './Button';
import { CameraStage } from './CameraStage';
import { Chip, SegmentedControl, Switch } from './Controls';

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
 * Camera / demo stage with source switching, status line and (for the demo performer) gesture buttons.
 * The camera is only started by an explicit button press.
 */
export function VideoPanel({
  skeleton,
  onSkeleton,
  gestures,
  onPerform,
}: {
  skeleton: boolean;
  onSkeleton: (v: boolean) => void;
  /** demo gestures to offer as buttons */
  gestures: GestureName[];
  onPerform?: (g: GestureName) => void;
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

  return (
    <div className="space-y-3">
      <CameraStage skeleton={skeleton} label={label}>
        {(s.phase === 'idle' || s.phase === 'error') && (
          <div className="absolute inset-0 grid place-items-center p-4 sm:p-6">
            <div className="max-w-sm text-center">
              {s.phase === 'error' && s.error ? (
                <p role="alert" className="flex items-start gap-2 rounded-[16px] bg-high-bg p-3 text-left font-bold text-high-fg">
                  <CircleExclamationPoint aria-hidden className="mt-0.5 size-5 shrink-0" />
                  {t(ERR[s.error] ?? 'errUnknown')}
                </p>
              ) : (
                <>
                  <PersonStanding aria-hidden className="mx-auto size-10 text-ink-muted" />
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

      <div className={clsx('flex flex-wrap items-center justify-between gap-3', s.phase === 'idle' && 'sr-only')}>
        <p className={clsx('flex min-h-12 items-center gap-2 font-bold', status.tone)} data-testid="status-line">
          <status.Icon aria-hidden className={clsx('size-5 shrink-0', status.Icon === LoaderCircle && 'animate-spin motion-reduce:animate-none')} />
          {status.text}
        </p>
        {s.stats?.lowPower && (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-2 px-3 text-sm font-bold text-ink-muted">
            <Battery aria-hidden className="size-4" />
            {t('lowPower')}
          </span>
        )}
      </div>

      {(s.phase === 'running' || s.phase === 'starting') && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SegmentedControl
            label={t('sourceLabel')}
            value={s.kind ?? 'demo'}
            onChange={(k) => void session.start(k)}
            options={[
              { value: 'camera', label: t('sourceCamera') },
              { value: 'demo', label: t('sourceDemo') },
            ]}
          />
          <Button variant="secondary" onClick={() => session.stop()}>
            {t('camStop')}
          </Button>
        </div>
      )}

      {s.kind === 'camera' && <Switch label={t('showSkeleton')} checked={skeleton} onChange={onSkeleton} />}

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
