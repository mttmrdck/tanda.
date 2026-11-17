/** Engine constants. Tuned on the synthetic performer — see DECISIONS.md and docs/ARCHITECTURE.md. */

/** Pose landmarks used: nose, ears, shoulders, elbows, wrists, hips. */
export const POSE_IDX = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24] as const;
export const L_SHOULDER = 11;
export const R_SHOULDER = 12;
export const L_WRIST = 15;
export const R_WRIST = 16;
export const HIP_IDX = new Set([23, 24]);

export const D_POSE = 22;
export const D_HAND = 42;
export const D_PRESENCE = 2;
export const D = D_POSE + D_HAND * 2 + D_PRESENCE; // 108

export const RANGE_POSE = [0, D_POSE] as const;
export const RANGE_HAND_L = [D_POSE, D_POSE + D_HAND] as const;
export const RANGE_HAND_R = [D_POSE + D_HAND, D_POSE + 2 * D_HAND] as const;
export const RANGE_PRESENCE = [D_POSE + 2 * D_HAND, D] as const;

/** Weights of the frame distance (Section 5.6). */
export const W_HAND = 0.35;
export const W_PRESENCE = 0.5;

/** Index (within POSE_IDX order) of points used for motion energy in feature space: nose, elbows, wrists. */
export const ENERGY_POSE_SLOTS = [0, 5, 6, 7, 8] as const;

export const SHOULDER_VIS_MIN = 0.5;
export const POINT_VIS_MIN = 0.3;
export const MIN_SCALE = 0.05;
export const DEFAULT_ASPECT = 4 / 3;

/** Resampled clip length. */
export const CLIP_N = 16;
export const DTW_BAND = 3;
export const MAX_INVALID_FRACTION = 0.3;
export const MAX_GAP_MS = 300;

/** Classifier calibration. */
export const TAU_DEFAULT = 2.2;
export const TAU_MIN = 1.3;
export const TAU_MAX = 4.0;
export const MARGIN_MIN = 0.08;
export const MAX_EXAMPLES_PER_SIGNAL = 20;
/** Window motion energy (shoulder-widths / s, feature space) below which the child is considered still. */
export const IDLE_ENERGY = 0.22;

/** Recognizer. */
export const EVAL_INTERVAL_MS = 400;
export const BUFFER_MS = 4000;
export const EMIT_CONFIDENCE = 0.55;
export const COOLDOWN_MS = 3000;

/** 1€ filter defaults (coordinates in 0–1 image units). */
export const ONE_EURO = { minCutoff: 1.0, beta: 8, dCutoff: 1.0 } as const;
export const HAND_RESET_MS = 300;
