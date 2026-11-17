/** Camera access. Video only — audio is never requested. */
export type CameraErrorCode = 'denied' | 'no-device' | 'busy' | 'unplugged' | 'insecure' | 'unknown';

export class CameraError extends Error {
  constructor(public readonly code: CameraErrorCode) {
    super(code);
    this.name = 'CameraError';
  }
}

export function mapCameraError(err: unknown): CameraError {
  if (err instanceof CameraError) return err;
  const name = err instanceof DOMException || err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return new CameraError('denied');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new CameraError('no-device');
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new CameraError('busy');
    case 'SecurityError':
      return new CameraError('insecure');
    default:
      return new CameraError('unknown');
  }
}

export type Facing = 'user' | 'environment';

/** Open a camera: an exact device when given, otherwise the preferred side (front / back) as a hint. */
export async function openCamera(opts: { deviceId?: string; facing?: Facing } = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError(window.isSecureContext ? 'no-device' : 'insecure');
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        ...(opts.deviceId ? { deviceId: { exact: opts.deviceId } } : { facingMode: { ideal: opts.facing ?? 'user' } }),
      },
      audio: false,
    });
  } catch (err) {
    throw mapCameraError(err);
  }
}

/** Which device / side a stream actually came from (facing is unknown on most laptop webcams). */
export function streamInfo(stream: MediaStream): { deviceId: string; facing: Facing | null } {
  const s = stream.getVideoTracks()[0]?.getSettings();
  const f = s?.facingMode;
  return { deviceId: s?.deviceId ?? '', facing: f === 'user' || f === 'environment' ? f : null };
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Video input devices (labels are only available after permission was granted once). */
export async function listCameras(): Promise<{ deviceId: string; label: string }[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'videoinput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
}
