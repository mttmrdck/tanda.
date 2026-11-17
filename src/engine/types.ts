/** Core engine types. Pure data — no DOM, no React. */

export interface Pt {
  x: number;
  y: number;
  z?: number;
  /** visibility 0..1 */
  v?: number;
}

export interface RawFrame {
  /** ms */
  t: number;
  /** 33 pose landmarks (un-mirrored, normalised image coordinates) or null if no person */
  pose: Pt[] | null;
  /** 0–2 hands, 21 landmarks each. `label` is MediaPipe handedness — unreliable, used only as fallback. */
  hands: { pts: Pt[]; label?: 'Left' | 'Right' }[];
  /** image width / height, so x and y can be put in the same units. Defaults to 4/3. */
  aspect?: number;
}

/** A raw frame after hands were assigned to the subject's left / right slot. */
export interface SlottedFrame {
  t: number;
  pose: Pt[] | null;
  left: Pt[] | null;
  right: Pt[] | null;
  aspect: number;
}

export interface FeatureFrame {
  t: number;
  /** length D */
  v: Float32Array;
  valid: boolean;
}

export type Category = 'need' | 'feeling' | 'safety' | 'request' | 'social';
export type Urgency = 'low' | 'normal' | 'high';

export interface BiText {
  en: string;
  ms: string;
}

export interface Signal {
  id: string;
  profileId: string;
  name: BiText;
  meaning: BiText;
  category: Category;
  urgency: Urgency;
  icon: string;
  createdAt: string;
}

export interface Example {
  id: string;
  signalId: string;
  n: number;
  d: number;
  /** n*d */
  data: Float32Array;
  source: 'teach' | 'feedback';
  /** how the example was captured; absent on data recorded before this was tracked */
  capture?: CaptureSource;
  createdAt: string;
}

export type RejectReason = 'unknown' | 'low-motion' | 'low-margin' | 'insufficient-data';

export interface Recognition {
  signalId: string | null;
  /** 0..1 */
  confidence: number;
  distance: number;
  margin: number;
  reason?: RejectReason;
}

export type CalmTier = 'calm' | 'rising' | 'high';

/** Where a recording or event came from. 'demo' = the simulated performer, never a real person. */
export type CaptureSource = 'camera' | 'demo';

export interface EventRecord {
  id: string;
  profileId: string;
  ts: string;
  kind: 'signal' | 'calm-tier';
  signalId?: string;
  confidence?: number;
  feedback?: 'yes' | 'no' | 'new';
  tier?: CalmTier;
  score?: number;
  /** camera or simulated demo performer; absent on events recorded before this was tracked */
  source?: CaptureSource;
  /** a caregiver's own observation, kept separate from what the system measured */
  note?: string;
}

export type AgeBand = 'under5' | '5to8' | '9to12' | '13plus';

export interface ComfortSteps {
  calm: string;
  rising: string;
  high: string;
}

export interface Profile {
  id: string;
  nickname: string;
  ageBand?: AgeBand;
  comfortSteps: ComfortSteps;
  createdAt: string;
  /** Added without rewriting legacy profiles; readers fall back to createdAt when absent. */
  updatedAt?: string;
  /** Calm Watch baseline: calm-period motion-energy samples (numbers only) */
  calmBaseline?: number[];
}
