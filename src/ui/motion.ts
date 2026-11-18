/**
 * Tanda motion language — one source for motion/react. CSS mirrors these values as --m-* tokens in tanda.css.
 * Every animation orients, connects, confirms, reveals or communicates a real state change; nothing loops.
 * Reduced motion is handled once by <MotionConfig reducedMotion="user"> (transforms dropped, opacity kept).
 */
export const ease = {
  out: [0.22, 1, 0.36, 1],
  in: [0.4, 0, 1, 1],
} as const;

/** Seconds. */
export const dur = {
  micro: 0.18,
  tab: 0.2,
  screen: 0.24,
  exit: 0.14,
  step: 0.26,
  disclosure: 0.28,
} as const;

/** Shared active-indicator movement (rail, top nav, segmented filters). */
export const indicator = { duration: dur.tab, ease: ease.out } as const;
