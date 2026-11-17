import { ShieldCheck } from 'lucide-react';
import { useT } from '../../i18n';

/** Four-stroke vector treatment of the supplied mark, without the app-icon enclosure. */
function TandaSymbol() {
  return <svg className="splash-symbol" aria-hidden viewBox="0 0 240 200" fill="none">
    <path className="splash-stroke" pathLength="1" d="M42 145L69 95" stroke="#087BFF" />
    <path className="splash-stroke" pathLength="1" d="M105 114L116 26" stroke="#168BFF" />
    <path className="splash-stroke" pathLength="1" d="M146 91L168 150" stroke="#339FFF" />
    <path className="splash-stroke" pathLength="1" d="M197 128L225 165" stroke="#76C6FF" />
  </svg>;
}

/** Standalone preview of the supplied splash brief. There is no automatic navigation. */
export default function Splash() {
  const t = useT();
  return <main id="main" tabIndex={-1} className="tanda-splash" aria-labelledby="splash-name">
    <div aria-hidden className="splash-atmosphere" />
    <div className="splash-identity">
      <TandaSymbol />
      <h1 id="splash-name" className="splash-wordmark">tanda.</h1>
      <p className="splash-tagline">{t('splashTagline')}</p>
    </div>
    <p className="splash-privacy"><ShieldCheck aria-hidden size={14} strokeWidth={1.5} />{t('splashPrivacy')}</p>
  </main>;
}
