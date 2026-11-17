import { useEffect, useRef, type ReactNode } from 'react';
import { session, useSession } from '../../store/useSession';
import { OverlayCanvas } from './OverlayCanvas';

/**
 * The camera / demo stage. The preview is mirrored with CSS only — landmark data is never mirrored.
 * The canvas is aria-hidden; `label` provides the equivalent text status.
 */
export function CameraStage({ skeleton, label, children }: { skeleton: boolean; label: string; children?: ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const kind = useSession((s) => s.kind);
  const phase = useSession((s) => s.phase);

  useEffect(() => {
    const el = holder.current;
    const v = session.video;
    if (!el || !v || kind !== 'camera' || phase !== 'running') return;
    v.className = 'absolute inset-0 h-full w-full object-contain';
    el.appendChild(v);
    return () => {
      if (v.parentElement === el) el.removeChild(v);
    };
  }, [kind, phase]);

  return (
    <div
      role="img"
      aria-label={label}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] border border-border-soft bg-surface-2"
    >
      <div className="absolute inset-0 -scale-x-100" data-testid="stage-mirror">
        <div ref={holder} className="absolute inset-0" />
        {kind && <OverlayCanvas figure={kind === 'demo'} skeleton={skeleton} />}
      </div>
      {children}
    </div>
  );
}
