import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { STROKES } from '../components/TandaSymbol';
import { ease } from '../motion';
import { loadPlatform } from '../entry';

/**
 * Brand introduction: the four strokes of the Tanda symbol draw themselves along their own paths (the symbol's
 * exact geometry from TandaSymbol), the wordmark follows, and the whole identity steps back into Home.
 *
 * Timeline (seconds). Strokes overlap as one wave; gaps shrink 140 → 120 → 100ms so it accelerates into place.
 *   0.00–0.38  still canvas
 *   0.38–0.82  stroke 1 draws (0.44s)        0.52–0.96  stroke 2 (0.44s)
 *   0.64–1.06  stroke 3 (0.42s)              0.74–1.14  stroke 4 (0.40s)
 *   0.38–1.42  symbol settles 0.96 → 1 (carries the strokes; one arrival, no extra motion)
 *   1.16–1.62  wordmark: fade + 10px rise
 *   2.60–3.12  hand-over: Home mounts underneath. The identity steps back to 0.97 and clears first (0.30s),
 *              the surface follows (0.42s from +0.10s, ease-in: it is leaving), and the navigation (+0.04s) and
 *              page (+0.15s) arrive beneath it — one continuous space, no blank frame, no text collision.
 * Reduced motion: the finished identity is shown at once, held briefly, then fades into Home.
 */
const START = [0.38, 0.52, 0.64, 0.74] as const;
const DRAW = [0.44, 0.44, 0.42, 0.4] as const;
const HOLD_UNTIL = 2.6;
const HOLD_REDUCED = 1.1;

export default function Splash({ leaving, onLeave, onDone }: { leaving: boolean; onLeave: () => void; onDone: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const left = useRef(false);

  useEffect(() => {
    // Warm the Home code while the identity plays, so the hand-over never shows a loading frame.
    void loadPlatform();
    const timer = window.setTimeout(() => {
      if (left.current) return;
      left.current = true;
      onLeave();
    }, (reduce ? HOLD_REDUCED : HOLD_UNTIL) * 1000);
    return () => window.clearTimeout(timer);
    // The timeline is set once; onLeave identity changes must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const enter = (delay: number, rise: number, duration: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: rise },
          animate: { opacity: 1, y: 0 },
          transition: { duration, delay, ease: ease.out },
        };

  return (
    <motion.main
      className="tanda-intro"
      aria-labelledby="intro-name"
      aria-hidden={leaving || undefined}
      inert={leaving}
      data-leaving={leaving || undefined}
      initial={false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduce ? 0.2 : 0.42, delay: reduce ? 0 : 0.1, ease: ease.in }}
      onAnimationComplete={() => leaving && onDone()}
    >
      <motion.div
        className="intro-identity"
        initial={false}
        animate={leaving ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: ease.in }}
      >
        <motion.svg
          className="intro-symbol"
          viewBox="0 0 240 200"
          fill="none"
          aria-hidden
          initial={reduce ? false : { scale: 0.96 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.04, delay: START[0], ease: ease.out }}
        >
          {STROKES.map((s, i) => (
            <motion.path
              key={s.d}
              className="intro-stroke"
              d={s.d}
              stroke="currentColor"
              strokeOpacity={s.o}
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: DRAW[i], delay: START[i], ease: ease.out },
                // Hide the round cap's zero-length dot until the stroke actually starts to draw.
                opacity: { duration: 0.06, delay: START[i] ?? 0 },
              }}
            />
          ))}
        </motion.svg>
        <motion.h1 id="intro-name" className="intro-wordmark" {...enter(1.16, 10, 0.46)}>
          tanda
        </motion.h1>
      </motion.div>
    </motion.main>
  );
}
