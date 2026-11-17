import { FrameProcessor } from '../engine/processor';
import type { FeatureFrame } from '../engine/types';
import { loadLandmarkers } from './loader';
import { toRawFrame } from './pipeline';

let lastTs = 0;

/**
 * Run a local video file through the same landmark + feature pipeline as the camera (benchmark only). The video
 * plays muted in a detached element; frames are processed in memory and never stored. The camera must be stopped
 * first (the landmarkers need strictly increasing timestamps).
 */
export async function featuresFromVideo(file: File): Promise<FeatureFrame[]> {
  const lm = await loadLandmarkers();
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.src = url;
  const proc = new FrameProcessor();
  const out: FeatureFrame[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error('video'));
    });
    await v.play();
    let lastTime = -1;
    await new Promise<void>((resolve) => {
      const step = () => {
        if (v.ended || v.paused) return resolve();
        if (v.readyState >= 2 && v.currentTime !== lastTime && v.videoWidth > 0) {
          lastTime = v.currentTime;
          const ts = (lastTs = Math.max(lastTs + 1, Math.round(performance.now())));
          const raw = toRawFrame(Math.round(v.currentTime * 1000), lm.pose.detectForVideo(v, ts), lm.hands.detectForVideo(v, ts), v.videoWidth / v.videoHeight);
          out.push(proc.process(raw).features);
        }
        requestAnimationFrame(step);
      };
      v.onended = () => resolve();
      requestAnimationFrame(step);
    });
  } finally {
    v.pause();
    v.removeAttribute('src');
    v.load();
    URL.revokeObjectURL(url);
  }
  return out;
}
