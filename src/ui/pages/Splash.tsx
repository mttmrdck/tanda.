import { ShieldCheck } from 'lucide-react';
import { useT } from '../../i18n';
import { TandaSymbol } from '../components/TandaSymbol';

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
