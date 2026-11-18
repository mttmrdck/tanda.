import { useLocation } from 'wouter';
import { useT } from '../../i18n';
import { useData } from '../../store/useData';
import { ImportPanel } from './Handover';

/** Import during onboarding (consent given, no profile yet). */
export default function ImportPage() {
  const t = useT();
  const [, navigate] = useLocation();
  return (
    <div className="space-y-6 pt-4">
      <h1 className="text-2xl sm:text-3xl">{t('importTitle')}</h1>
      <ImportPanel
        onDone={(id) => {
          void useData.getState().selectProfile(id);
          navigate('/live');
        }}
      />
    </div>
  );
}
