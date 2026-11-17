import { clsx } from 'clsx';

/** Four-stroke vector treatment of the supplied mark, without the app-icon enclosure. Strokes draw in on mount. */
export function TandaSymbol({ className }: { className?: string }) {
  return (
    <svg className={clsx('splash-symbol', className)} aria-hidden viewBox="0 0 240 200" fill="none">
      <path className="splash-stroke" pathLength="1" d="M42 145L69 95" stroke="#087BFF" />
      <path className="splash-stroke" pathLength="1" d="M105 114L116 26" stroke="#168BFF" />
      <path className="splash-stroke" pathLength="1" d="M146 91L168 150" stroke="#339FFF" />
      <path className="splash-stroke" pathLength="1" d="M197 128L225 165" stroke="#76C6FF" />
    </svg>
  );
}
