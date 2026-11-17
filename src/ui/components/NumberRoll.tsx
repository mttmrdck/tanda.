import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/** A spring settles only the digit that changed; no timer or count-up on mount. */
export function NumberRoll({ value }: { value: number | string }) {
  const reduce = useReducedMotion();
  return <span className="inline-flex tabular">
    <span className="sr-only">{String(value)}</span>
    {String(value).split('').map((digit, i) => <span key={i} aria-hidden className="relative inline-block overflow-hidden" style={{ height: '1.2em', minWidth: /\d/.test(digit) ? '.6em' : '.3em' }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={digit} className="inline-block" initial={{ opacity: 0, y: reduce ? 0 : '65%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : '-65%' }} transition={{ type: 'spring', stiffness: 360, damping: 32 }}>{digit}</motion.span>
      </AnimatePresence>
    </span>)}
  </span>;
}
