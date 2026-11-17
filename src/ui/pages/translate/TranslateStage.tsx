import { clsx } from 'clsx';
import { Camera, CircleAlert, CircleCheck, LoaderCircle, ScanLine } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useT, type MsgKey } from '../../../i18n';
import { translateSession, useTranslateCam, type TranslateSourceKind } from '../../../store/translateSession';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/Controls';
import { OverlayCanvas, type FrameSubscribe } from '../../components/OverlayCanvas';

const ERR: Record<string, MsgKey> = {
  denied: 'errDenied',
  'no-device': 'errNoDevice',
  busy: 'errBusy',
  unplugged: 'errUnplugged',
  insecure: 'errInsecure',
  unknown: 'errUnknown',
  vision: 'errVision',
};

const subscribe: FrameSubscribe = (cb) => translateSession.subscribeFrame(cb);

/**
 * Translate's camera stage, driven by Translate's own session (never the Live session). Preview mirrored by CSS
 * only for the front camera and the demo; landmark data is never mirrored.
 */
export function TranslateStage({ source, onSource, overlay }: { source: TranslateSourceKind; onSource: (k: TranslateSourceKind) => void; overlay?: ReactNode }) {
  const t = useT();
  const cam = useTranslateCam();
  const holder = useRef<HTMLDivElement>(null);
  // a new source restarts the camera via useTranslateCamera; the same source (e.g. after an error) starts here
  const choose = (k: TranslateSourceKind) => (k === source ? void translateSession.start(k) : onSource(k));

  useEffect(() => {
    const el = holder.current;
    const v = translateSession.video;
    if (!el || !v || cam.kind !== 'camera' || cam.phase !== 'running') return;
    v.className = 'absolute inset-0 h-full w-full object-contain';
    el.appendChild(v);
    if (v.paused) void v.play().catch(() => undefined);
    return () => {
      if (v.parentElement === el) el.removeChild(v);
    };
  }, [cam.kind, cam.phase]);

  const status =
    cam.phase === 'starting'
      ? { Icon: LoaderCircle, text: t('trStarting'), tone: 'text-ink-muted', spin: true }
      : cam.seeing
        ? { Icon: CircleCheck, text: t('trSeeing'), tone: 'text-calm-fg', spin: false }
        : { Icon: CircleAlert, text: t('trNotSeeing'), tone: 'text-rising-fg', spin: false };

  return (
    <div className="space-y-3">
      <div data-phase={cam.phase} className="camera-stage relative aspect-[4/3] w-full overflow-hidden card-2" data-testid="translate-stage">
        <div className={clsx('absolute inset-0', (cam.kind !== 'camera' || cam.mirrored) && '-scale-x-100')} aria-hidden>
          <div ref={holder} className="absolute inset-0" />
          {cam.kind && <OverlayCanvas figure={cam.kind === 'demo'} skeleton subscribe={subscribe} />}
        </div>
        {overlay}
        {(cam.phase === 'running' || cam.phase === 'starting') && (
          <p className={clsx('stage-pill absolute left-2 top-2 z-10 flex min-h-12 items-center gap-2 px-4 font-bold sm:left-3 sm:top-3', status.tone)} data-testid="translate-status">
            <status.Icon aria-hidden className={clsx('size-5 shrink-0', status.spin && 'animate-spin motion-reduce:animate-none')} />
            {status.text}
          </p>
        )}
        {(cam.phase === 'idle' || cam.phase === 'error') && (
          <div className="stage-idle absolute inset-0 grid place-items-center p-4 text-center">
            <div className="max-w-sm space-y-4">
              {cam.phase === 'error' && cam.error ? (
                <p role="alert" className="flex items-start gap-2 rounded-[16px] bg-high-bg p-3 text-left font-bold text-high-fg">
                  <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
                  {t(ERR[cam.error] ?? 'errUnknown')}
                </p>
              ) : (
                <p className="flex flex-col items-center gap-2 font-semibold">
                  <ScanLine aria-hidden className="size-10 text-ink-muted" />
                  {t('trCameraOff')}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={<Camera aria-hidden className="size-5" />} variant={source === 'camera' ? 'primary' : 'secondary'} onClick={() => choose('camera')}>
                  {t('camStart')}
                </Button>
                <Button variant={source === 'demo' ? 'primary' : 'secondary'} onClick={() => choose('demo')}>
                  {t('sourceDemo')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {(cam.phase === 'running' || cam.phase === 'starting') && (
        <SegmentedControl
          label={t('sourceLabel')}
          value={cam.kind ?? source}
          onChange={choose}
          options={[
            { value: 'camera', label: t('sourceCamera') },
            { value: 'demo', label: t('sourceDemo') },
          ]}
        />
      )}
    </div>
  );
}

/** Start Translate's camera while a camera tab is open; stop it (all tracks) when the tab or route closes. */
export function useTranslateCamera(source: TranslateSourceKind, active: boolean) {
  useEffect(() => {
    if (!active) return;
    void translateSession.start(source);
    return () => translateSession.stop();
  }, [active, source]);
}
