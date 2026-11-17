import { clsx } from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { session, useSession } from '../../store/useSession';
import { OverlayCanvas, type FrameSubscribe } from './OverlayCanvas';

/**
 * The camera / demo stage. The preview is mirrored with CSS only (front camera and demo; never the back camera)
 * — landmark data is never mirrored.
 * The canvas is aria-hidden; `label` provides the equivalent text status.
 */
const subscribeFrame: FrameSubscribe = (cb) => session.subscribeFrame(cb);

export function CameraStage({ skeleton, label, children }: { skeleton: boolean; label: string; children?: ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const kind = useSession((s) => s.kind);
  const phase = useSession((s) => s.phase);
  const mirrored = useSession((s) => s.mirrored);

  useEffect(() => {
    const el = holder.current;
    const v = session.video;
    if (!el || !v || kind !== 'camera' || phase !== 'running') return;
    v.className = 'absolute inset-0 h-full w-full object-contain';
    el.appendChild(v);
    // Moving a <video> between pages detaches it, and a detached media element is paused by the browser.
    // Without this the picture (and detection, which waits for new frames) freezes after switching pages.
    if (v.paused) void v.play().catch(() => undefined);
    return () => {
      if (v.parentElement === el) el.removeChild(v);
    };
  }, [kind, phase]);

  return (
    <div data-phase={phase} className="camera-stage relative aspect-[4/3] w-full overflow-hidden card-2">
      <div role="img" aria-label={label} className={clsx('absolute inset-0', (kind !== 'camera' || mirrored) && '-scale-x-100')} data-testid="stage-mirror">
        <div ref={holder} className="absolute inset-0" />
        {kind && <OverlayCanvas figure={kind === 'demo'} skeleton={skeleton} subscribe={subscribeFrame} />}
      </div>
      {children}
    </div>
  );
}
