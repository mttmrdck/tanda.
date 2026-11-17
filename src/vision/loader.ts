import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Shared, idempotent MediaPipe initialisation (safe under React StrictMode double-mount).
 * Models and WASM are served locally from `public/` (see scripts/setup-assets.mjs). No CDN.
 */
export interface Landmarkers {
  pose: PoseLandmarker;
  hands: HandLandmarker;
  delegate: 'GPU' | 'CPU';
}

export type VisionStatus = { state: 'idle' } | { state: 'loading' } | { state: 'ready'; delegate: 'GPU' | 'CPU' } | { state: 'error'; message: string };

let promise: Promise<Landmarkers> | null = null;
let current: Landmarkers | null = null;
let status: VisionStatus = { state: 'idle' };
const listeners = new Set<(s: VisionStatus) => void>();

function setStatus(s: VisionStatus) {
  status = s;
  for (const l of listeners) l(s);
}

export function visionStatus(): VisionStatus {
  return status;
}

export function onVisionStatus(cb: (s: VisionStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const base = () => import.meta.env.BASE_URL.replace(/\/?$/, '/');

async function create(): Promise<Landmarkers> {
  const { FilesetResolver, PoseLandmarker, HandLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(`${base()}mediapipe/wasm`);
  const build = async (delegate: 'GPU' | 'CPU') => {
    const pose = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${base()}models/pose_landmarker_lite.task`, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    try {
      const hands = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base()}models/hand_landmarker.task`, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      return { pose, hands, delegate };
    } catch (err) {
      pose.close();
      throw err;
    }
  };
  try {
    return await build('GPU');
  } catch {
    return await build('CPU');
  }
}

/** Load (once) and return both landmarkers. */
export function loadLandmarkers(): Promise<Landmarkers> {
  if (!promise) {
    setStatus({ state: 'loading' });
    promise = create().then(
      (l) => {
        current = l;
        setStatus({ state: 'ready', delegate: l.delegate });
        return l;
      },
      (err: unknown) => {
        promise = null;
        setStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
        throw err;
      },
    );
  }
  return promise;
}

/** Release the models (used on "delete all data" and page teardown). */
export function disposeLandmarkers(): void {
  current?.pose.close();
  current?.hands.close();
  current = null;
  promise = null;
  setStatus({ state: 'idle' });
}
