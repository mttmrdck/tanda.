import type { MsgKey } from '../i18n';

/** One wording + tone for the camera state everywhere it is shown (Home, profile, Settings). */
const LABEL: Record<string, MsgKey> = {
  connected: 'monConnected',
  disconnected: 'monDisconnected',
  disabled: 'monDisabled',
  'not-configured': 'monNotConfigured',
  initialising: 'monInitialising',
  unavailable: 'monUnavailable',
};
export const cameraLabel = (state: string): MsgKey => LABEL[state] ?? 'monNotConfigured';
export const cameraTone = (state: string): 'ok' | 'bad' | 'neutral' =>
  state === 'connected' ? 'ok' : state === 'disconnected' || state === 'unavailable' ? 'bad' : 'neutral';
