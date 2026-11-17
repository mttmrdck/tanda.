import { clsx } from 'clsx';

/* The Tanda mark: four rising strokes — a gesture in motion. Monochrome: one ink colour, stepped in tone so the
   movement still reads at small sizes. Paths are shared by the open symbol and the app-icon form. */
const STROKES: { d: string; o: number }[] = [
  { d: 'M42 145L69 95', o: 1 },
  { d: 'M105 114L116 26', o: 0.82 },
  { d: 'M146 91L168 150', o: 0.62 },
  { d: 'M197 128L225 165', o: 0.44 },
];

/** Open symbol (splash, onboarding). Strokes draw in on mount; uses the current text colour. */
export function TandaSymbol({ className }: { className?: string }) {
  return (
    <svg className={clsx('splash-symbol', className)} aria-hidden viewBox="0 0 240 200" fill="none">
      {STROKES.map((s) => (
        <path key={s.d} className="splash-stroke" pathLength="1" d={s.d} stroke="currentColor" strokeOpacity={s.o} />
      ))}
    </svg>
  );
}

/** App-icon form for navigation: strokes knocked out of an ink square, so it inverts with the theme. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={clsx('brand-mark', className)} aria-hidden viewBox="0 0 240 240">
      <rect width="240" height="240" rx="58" fill="currentColor" />
      <g transform="translate(14 32) scale(0.88)" fill="none" strokeLinecap="round" strokeWidth="27">
        {STROKES.map((s) => (
          <path key={s.d} d={s.d} stroke="var(--bg)" strokeOpacity={s.o} />
        ))}
      </g>
    </svg>
  );
}
