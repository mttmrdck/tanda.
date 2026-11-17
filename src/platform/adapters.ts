import type { Observation } from './contracts.js';

export interface CameraAdapter {
  readonly integration: 'simulated' | 'browser-webcam' | 'rtsp-onvif';
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Missing observations must be explicit; no implied zero-energy samples. */
  subscribe(consume: (observation: Observation) => void): () => void;
}
export interface PerceptionAdapter<Frame> {
  infer(frame: Frame): Promise<{ energy: number | null; quality: Observation['quality'] }>;
}
export interface FrameAcquisition<Frame> {
  open(): Promise<void>;
  close(): Promise<void>;
  frames(consume: (frame: Frame) => void): () => void;
}
export interface AudioPipeline {
  readonly implemented: false;
  readonly captureEnabled: false;
}
export const audioPipeline: AudioPipeline = { implemented: false, captureEnabled: false };
/** Deliberately no RTSP credentials or network operations until a real adapter is implemented. */
export class UnavailableIpCameraAdapter implements CameraAdapter {
  readonly integration = 'rtsp-onvif' as const;
  async start(): Promise<void> {
    throw new Error('RTSP/ONVIF adapter not implemented or camera-tested.');
  }
  async stop(): Promise<void> {
    /* no resources are opened */
  }
  subscribe(_consume: (observation: Observation) => void) {
    return () => undefined;
  }
}
export class SimulatedCameraAdapter implements CameraAdapter {
  readonly integration = 'simulated' as const;
  private listeners = new Set<(o: Observation) => void>();
  private running = false;
  async start() {
    this.running = true;
  }
  async stop() {
    this.running = false;
  }
  subscribe(consume: (o: Observation) => void) {
    this.listeners.add(consume);
    return () => {
      this.listeners.delete(consume);
    };
  }
  push(o: Observation) {
    if (!this.running) throw new Error('Simulated camera is stopped.');
    if (o.sourceMode !== 'simulated') throw new Error('Simulation requires simulated source labels.');
    for (const consume of this.listeners) consume(o);
  }
}
