import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { updateProfile } from '../store/repo';
import { useSettings } from '../store/useApp';
import { useData } from '../store/useData';
import { session } from '../store/useSession';

const CAMERA_ROUTES = ['/', '/teach', '/debug'];

/** Keeps the imperative session in step with routes, settings and the active profile. */
export function SessionSync() {
  const [loc] = useLocation();
  const models = useData((s) => s.models);
  const profile = useData((s) => s.profile);
  const sensitivity = useSettings((s) => s.sensitivity);
  const windowMs = useSettings((s) => s.windowMs);
  const targetFps = useSettings((s) => s.targetFps);
  const batterySaver = useSettings((s) => s.batterySaver);
  const deviceId = useSettings((s) => s.cameraDeviceId);

  // Stop the camera (all tracks) when leaving camera pages.
  useEffect(() => {
    const onCameraPage = CAMERA_ROUTES.some((r) => loc === r || (r !== '/' && loc.startsWith(`${r}/`)));
    if (!onCameraPage) session.stop();
    session.setMode(loc.startsWith('/teach') ? 'teach' : 'live');
  }, [loc]);

  useEffect(() => session.setModels(models), [models]);
  useEffect(() => session.setRecognizerOptions({ sensitivity, windowMs }), [sensitivity, windowMs]);
  useEffect(() => session.setCameraOptions({ targetFps: batterySaver ? 10 : targetFps, deviceId }), [targetFps, batterySaver, deviceId]);

  // Calm Watch baseline per profile: load on switch, save periodically and on switch/unload.
  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    const p = useData.getState().profile;
    session.setCalmBaseline(p?.calmBaseline ?? []);
    const save = () => {
      const samples = session.calmBaseline();
      if (samples.length) void updateProfile(profileId, { calmBaseline: samples }).catch(() => undefined);
    };
    const timer = setInterval(save, 60_000);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [profileId]);

  // Stop the camera when the page is torn down.
  useEffect(() => () => session.stop(), []);
  return null;
}
