import { ChevronRight, Hand, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useT } from '../../i18n';
import { useData } from '../../store/useData';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { useSignalCounts } from '../hooks/useSignalCounts';
import { Avatar } from '../components/Shell';
import { dur, ease } from '../motion';
import { peopleNav } from '../peopleNav';

/**
 * People: the local profiles on this device (not accounts — there is no sign-in). Each opens a profile with its
 * communication signals, personal patterns and setup. Only a nickname and an optional age band are kept.
 */
export default function Individuals() {
  const t = useT();
  const [, navigate] = useLocation();
  const env = useMonitoringProfile().snapshot?.care.environment.name;
  const profiles = useData((s) => s.profiles);
  const profile = useData((s) => s.profile);
  const select = useData((s) => s.selectProfile);
  const counts = useSignalCounts();
  // Coming back from a profile: arrive from the left, where the caregiver left the list.
  const [fromProfile] = useState(() => peopleNav.returning);
  useEffect(() => {
    peopleNav.returning = false;
    if (!fromProfile) return;
    const y = peopleNav.scrollY;
    const raf = requestAnimationFrame(() => window.scrollTo(0, y));
    return () => cancelAnimationFrame(raf);
  }, [fromProfile]);

  const open = (id: string, tab?: string) => {
    peopleNav.scrollY = window.scrollY;
    navigate(tab ? `/individuals/${id}/${tab}` : `/individuals/${id}`);
  };

  return (
    <motion.div
      className="people-page lateral-page"
      initial={{ opacity: 0, x: fromProfile ? -16 : 0, y: fromProfile ? 0 : 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: dur.screen, ease: ease.out }}
    >
      <header className="people-head">
        <div className="min-w-0">
          <h1>{t('navGroupPeople')}</h1>
          <p className="home-sub">{t('indIntro')}</p>
        </div>
        <button type="button" onClick={() => navigate('/onboarding/profile')} className="ov-btn ov-btn-primary people-add">
          <Plus size={16} aria-hidden />
          {t('indAdd')}
        </button>
      </header>

      <ul className="people-list" data-testid="individuals">
        {profiles.map((p) => {
          const active = p.id === profile?.id;
          return (
            <li key={p.id} className="ov-card person-row">
              <Link
                href={`/individuals/${p.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  open(p.id);
                }}
                className="person-open"
              >
                <Avatar name={p.nickname} />
                <span className="min-w-0 flex-1">
                  <span className="person-name">
                    {p.nickname}
                    {active && <span className="pill tone-ok">{t('indSelected')}</span>}
                  </span>
                  <span className="person-meta">
                    {active && env ? `${env} · ` : ''}
                    {t('indGestures', { n: counts[p.id] ?? 0 })}
                  </span>
                </span>
              </Link>
              <div className="person-actions">
                {!active && (
                  <button type="button" className="ov-btn ea-quiet" onClick={() => void select(p.id)}>
                    {t('indSwitch', { name: p.nickname })}
                  </button>
                )}
                <button type="button" className="ov-btn ov-btn-ghost person-signals" onClick={() => open(p.id, 'communication')}>
                  <Hand size={15} aria-hidden />
                  {t('ppSignalsBtn')}
                </button>
                <ChevronRight size={17} aria-hidden className="person-chevron" />
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
