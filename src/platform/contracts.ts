import { z } from 'zod';

export const individualSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(60),
  category: z.enum(['unspecified', 'child', 'older-adult']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Individual = z.infer<typeof individualSchema>;
export const consentSchema = z.object({
  video: z.boolean(),
  authorityConfirmed: z.boolean(),
  audio: z.literal(false),
  reviewedAt: z.string().datetime().nullable(),
});
export const environmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  cameraId: z.string().min(1),
});
export const careSchema = z.object({
  category: z.enum(['unspecified', 'child', 'older-adult']),
  environment: environmentSchema,
  consent: consentSchema,
  movementEnabled: z.boolean(),
  baselineContextReviewed: z.boolean(),
  caregiverLabel: z.string().max(60),
  schedules: z
    .array(z.object({ startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(1).max(24) }))
    .max(8),
});
export type CareProfile = z.infer<typeof careSchema>;
export const cameraSchema = z.object({
  id: z.string(),
  name: z.string(),
  integration: z.enum(['simulated', 'browser-webcam', 'rtsp-onvif']),
  roomId: z.string(),
  state: z.enum(['not-configured', 'initialising', 'connected', 'disconnected', 'disabled', 'unavailable']),
  simulated: z.boolean(),
  lastObservation: z.string().datetime().nullable(),
});
export type CameraDevice = z.infer<typeof cameraSchema>;
export const gatewaySchema = z.object({
  id: z.string(),
  state: z.enum(['stopped', 'running', 'unavailable']),
  mode: z.enum(['browser-demo', 'edge-simulation', 'browser-camera']),
  remoteNotifications: z.literal('unavailable'),
  audio: z.literal('not-implemented'),
});
export type GatewayDevice = z.infer<typeof gatewaySchema>;
export const observationSchema = z.object({
  individualId: z.string().min(1),
  sourceId: z.string().min(1),
  roomId: z.string().min(1),
  at: z.string().datetime(),
  localHour: z.number().int().min(0).max(23),
  quality: z.enum(['good', 'occluded', 'low-light', 'disconnected', 'missing']),
  energy: z.number().finite().min(0).max(1000).nullable(),
  sourceMode: z.enum(['simulated', 'browser-camera']),
  reviewedContext: z.boolean(),
});
export type Observation = z.infer<typeof observationSchema>;
export const baselineSchema = z.object({
  state: z.enum(['not-configured', 'collecting', 'insufficient', 'available', 'requires-review']),
  context: z.string(),
  count: z.number().int().nonnegative(),
  mean: z.number().finite(),
  m2: z.number().finite().nonnegative(),
  coverageMs: z.number().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  firstAt: z.string().datetime().nullable(),
  lastAt: z.string().datetime().nullable(),
});
export type PersonalBaseline = z.infer<typeof baselineSchema>;
export const feedbackSchema = z.object({
  at: z.string().datetime(),
  action: z.enum(['acknowledge', 'dismiss', 'note']),
  note: z.string().max(500),
});
export const monitoringEventSchema = z.object({
  id: z.string().min(1),
  individualId: z.string().min(1),
  sourceId: z.string(),
  roomId: z.string(),
  category: z.enum(['environment', 'behaviour', 'communication', 'audio']),
  type: z.enum([
    'monitoring-started',
    'camera-disconnected',
    'observation-unavailable',
    'baseline-available',
    'movement-deviation',
  ]),
  at: z.string().datetime(),
  priority: z.enum(['information', 'review', 'high-priority']),
  quality: observationSchema.shape.quality,
  confidence: z.number().min(0).max(1).nullable(),
  explanation: z.enum(['started', 'disconnected', 'poor-quality', 'baseline-ready', 'sustained-deviation']),
  simulated: z.boolean(),
  status: z.enum(['new', 'acknowledged', 'dismissed']),
  acknowledgedAt: z.string().datetime().nullable(),
  note: z.string().max(500),
  history: z.array(feedbackSchema).max(200),
});
export type MonitoringEvent = z.infer<typeof monitoringEventSchema>;
export type Alert = MonitoringEvent & { priority: 'review' | 'high-priority' };
export type CaregiverFeedback = z.infer<typeof feedbackSchema>;
export const healthSchema = z.object({
  camera: cameraSchema,
  gateway: gatewaySchema,
  observationQuality: observationSchema.shape.quality,
  lastSuccessfulObservation: z.string().datetime().nullable(),
});
export type DeviceHealth = z.infer<typeof healthSchema>;
export const snapshotSchema = z.object({
  version: z.literal(1),
  individualId: z.string().min(1),
  care: careSchema,
  health: healthSchema,
  baseline: baselineSchema,
  events: z.array(monitoringEventSchema).max(10000),
  retention: z.literal('event-metadata-only'),
});
export type MonitoringSnapshot = z.infer<typeof snapshotSchema>;

export function initialSnapshot(individualId: string): MonitoringSnapshot {
  return snapshotSchema.parse({
    version: 1,
    individualId,
    retention: 'event-metadata-only',
    care: {
      category: 'unspecified',
      environment: { id: 'room-1', name: 'Care environment', cameraId: 'camera-1' },
      consent: { video: false, authorityConfirmed: false, audio: false, reviewedAt: null },
      movementEnabled: false,
      baselineContextReviewed: false,
      caregiverLabel: '',
      schedules: [],
    },
    health: {
      camera: {
        id: 'camera-1',
        name: 'Simulated camera',
        integration: 'simulated',
        roomId: 'room-1',
        state: 'not-configured',
        simulated: true,
        lastObservation: null,
      },
      gateway: {
        id: 'gateway-1',
        state: 'stopped',
        mode: 'browser-demo',
        remoteNotifications: 'unavailable',
        audio: 'not-implemented',
      },
      observationQuality: 'missing',
      lastSuccessfulObservation: null,
    },
    baseline: emptyBaseline(),
    events: [],
  });
}
export function emptyBaseline(): PersonalBaseline {
  return {
    state: 'not-configured',
    context: '',
    count: 0,
    mean: 0,
    m2: 0,
    coverageMs: 0,
    activeCount: 0,
    firstAt: null,
    lastAt: null,
  };
}
