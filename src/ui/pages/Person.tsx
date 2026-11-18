import * as Tabs from '@radix-ui/react-tabs';
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Hand, Radio, Share2, ShieldCheck, Trash } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'wouter';
import type { AgeBand } from '../../engine/types';
import { pickText, useT, type MsgKey } from '../../i18n';
import { BASELINE_SAMPLE_MIN } from '../../platform/behaviour';
import { deleteProfile, updateProfile } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button } from '../components/Button';
import { Select, TextField } from '../components/Controls';
import { ConfirmDelete } from '../components/Dialog';
import { MonitoringConfig } from '../components/MonitoringConfig';
import { Avatar } from '../components/Shell';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { dur, ease, indicator } from '../motion';
import { peopleNav } from '../peopleNav';
import { cameraLabel, cameraTone } from '../cameraStatus';
import { Disclosure } from './Platform';

const TABS = [
  { id: 'overview', label: 'monOverview' },
  { id: 'communication', label: 'navCommunication' },
  { id: 'patterns', label: 'ppPatterns' },
  { id: 'setup', label: 'ppSetup' },
] as const satisfies readonly { id: string; label: MsgKey }[];
type Tab = (typeof TABS)[number]['id'];
const isTab = (v: string | undefined): v is Tab => TABS.some((x) => x.id === v);

const AGE: { value: AgeBand | 'none'; label: MsgKey }[] = [
  { value: 'none', label: 'ageNone' },
  { value: 'under5', label: 'ageUnder5' },
  { value: '5to8', label: 'age5to8' },
  { value: '9to12', label: 'age9to12' },
  { value: '13plus', label: 'age13plus' },
];

const BASELINE: Record<string, MsgKey> = {
  'not-configured': 'monNotConfigured',
  collecting: 'monCollecting',
  insufficient: 'monInsufficient',
  available: 'monAvailable',
  'requires-review': 'monRequiresReview',
};

/** One individual's profile: a deeper level under People, with four sections. Opening it selects the individual. */
export default function Person() {
  const t = useT();
  const params = useParams<{ id: string; tab?: string }>();
  const [, navigate] = useLocation();
  const profiles = useData((s) => s.profiles);
  const profile = useData((s) => s.profile);
  const signals = useData((s) => s.signals);
  const select = useData((s) => s.selectProfile);
  const lang = useSettings((x) => x.lang);
  const advanced = useSettings((x) => x.advanced);
  const m = useMonitoringProfile();
  const s = m.snapshot;
  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'overview');
  const exists = profiles.some((p) => p.id === params.id);
  const ready = profile?.id === params.id;

  useEffect(() => {
    if (exists && !ready) void select(params.id);
  }, [exists, ready, params.id, select]);

  const back = () => {
    peopleNav.returning = true;
    navigate('/individuals');
  };

  if (!exists)
    return (
      <div className="person-page">
        <p className="home-sub">{t('ppMissing')}</p>
        <Link href="/individuals" className="ov-btn ov-btn-ghost mt-4">
          <ChevronLeft size={16} aria-hidden />
          {t('navGroupPeople')}
        </Link>
      </div>
    );
  if (!ready || !profile) return <div className="person-page" aria-busy />;

  const events = s?.events ?? [];
  const pending = events.filter((e) => e.status === 'new' && e.priority !== 'information').length;
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const today = events.filter((e) => Date.parse(e.at) >= startOfDay).length;
  const camState = s?.health.camera.state ?? 'not-configured';
  const camTone = cameraTone(camState);
  const consented = !!s?.care.consent.video && !!s.care.consent.authorityConfirmed;
  const samples = s?.baseline.count ?? 0;

  return (
    <motion.div
      className="person-page lateral-page"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: dur.screen, ease: ease.out }}
    >
      <div className="person-top">
        <button type="button" className="person-back" onClick={back}>
          <ChevronLeft size={17} aria-hidden />
          {t('navGroupPeople')}
        </button>
        <span className={`pill tone-${camTone}`}>
          <span className={`dot tone-${camTone}`} aria-hidden />
          {t(cameraLabel(camState))}
        </span>
      </div>

      <header className="person-head">
        <Avatar name={profile.nickname} size="lg" />
        <div className="min-w-0">
          <h1>{profile.nickname}</h1>
          <p className="home-sub">{s?.care.environment.name ?? t('monNotConfigured')}</p>
        </div>
      </header>

      <Tabs.Root value={tab} onValueChange={(v) => isTab(v) && setTab(v)} className="person-tabs">
        <Tabs.List className="ea-segments person-seg" aria-label={t('ppTabs')}>
          {TABS.map((x) => (
            <Tabs.Trigger key={x.id} value={x.id} className="seg-tab">
              {tab === x.id && <motion.span layoutId="person-tab" className="ea-seg-bg" transition={indicator} aria-hidden />}
              <span>{t(x.label)}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <AnimatePresence initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: dur.micro, ease: ease.out } }}
          >
            {tab === 'overview' && (
              <Tabs.Content value="overview" className="person-panel">
                <section className="ov-card person-card-pad">
                  <div className="person-kicker-row">
                    <span className="ov-label">{t('ppToday')}</span>
                    <span className="person-small">{t('ppObsToday', { n: today })}</span>
                  </div>
                  <p className="person-summary">{t('ppSummary', { signals: signals.length, pending })}</p>
                  <div className="person-actions-row">
                    <button type="button" className="ov-btn ov-btn-primary" onClick={() => setTab('communication')}>
                      <Hand size={16} aria-hidden />
                      {t('ppOpenComm')}
                    </button>
                    {pending > 0 && (
                      <Link href="/events" className="ov-btn ov-btn-warn">
                        {t('ovReviewObs')}
                        <ArrowUpRight size={16} aria-hidden />
                      </Link>
                    )}
                  </div>
                </section>
                <div className="person-stats">
                  <button type="button" className="ov-card person-stat" onClick={() => setTab('communication')}>
                    <span className="person-small">{t('ppSignalsStat')}</span>
                    <span className="person-stat-num">{t('ppTaught', { n: signals.length })}</span>
                    <span className="person-stat-link">
                      {t('ppRecogniseOrTeach')}
                      <ChevronRight size={14} aria-hidden />
                    </span>
                  </button>
                  <button type="button" className="ov-card person-stat" onClick={() => setTab('patterns')}>
                    <span className="person-small">{t('ppReference')}</span>
                    <span className="person-stat-num">{t('ppSamples', { n: samples })}</span>
                    <span className="person-stat-link">
                      {t('ppViewRhythm')}
                      <ChevronRight size={14} aria-hidden />
                    </span>
                  </button>
                </div>
              </Tabs.Content>
            )}

            {tab === 'communication' && (
              <Tabs.Content value="communication" className="person-panel">
                <section className="ov-card person-card-pad">
                  <p className="person-summary">{t('ppCommIntro', { name: profile.nickname })}</p>
                  <div className="person-actions-row">
                    <Link href="/live" className="ov-btn ov-btn-primary">
                      <Radio size={16} aria-hidden />
                      {t('liveTitle')}
                    </Link>
                    <Link href="/teach" className="ov-btn ov-btn-ghost">
                      <Hand size={16} aria-hidden />
                      {t('teachTitle')}
                    </Link>
                    <Link href="/signals" className="ov-btn ea-quiet">
                      <BookOpen size={16} aria-hidden />
                      {t('signalsTitle')}
                    </Link>
                  </div>
                </section>
                <h2 className="person-h2">{t('ppLibrary', { n: signals.length })}</h2>
                {signals.length === 0 ? (
                  <p className="ov-card person-card-pad person-small">{t('ppNoSignals')}</p>
                ) : (
                  <ul className="person-signals-list">
                    {signals.map((x) => (
                      <li key={x.id} className="ov-card person-signal">
                        <span className="min-w-0 flex-1">
                          <span className="person-signal-meaning">“{pickText(x.meaning, lang)}”</span>
                          <span className="person-small">{pickText(x.name, lang)}</span>
                        </span>
                        <Link href={`/teach/${x.id}/add`} className="ov-btn ea-quiet">
                          {t('addExamples')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Tabs.Content>
            )}

            {tab === 'patterns' && (
              <Tabs.Content value="patterns" className="person-panel">
                <section className="ov-card person-card-pad">
                  <h2 className="person-h2 mt-0">{t('ppRhythmTitle')}</h2>
                  <p className="person-summary">
                    {t(BASELINE[s?.baseline.state ?? 'not-configured'] ?? 'monNotConfigured')}
                  </p>
                  <div className="person-progress" aria-hidden>
                    <span style={{ transform: `scaleX(${Math.min(samples, BASELINE_SAMPLE_MIN) / BASELINE_SAMPLE_MIN})` }} />
                  </div>
                  <p className="person-small">
                    {t('monBaselineSamples', { n: samples, seconds: Math.round((s?.baseline.coverageMs ?? 0) / 1000) })}
                  </p>
                  <p className="person-small">{t('ppNonDiag')}</p>
                  <div className="person-actions-row">
                    <Link href="/movement" className="ov-btn ov-btn-ghost">
                      {t('navMovement')}
                    </Link>
                    <Link href="/timeline" className="ov-btn ea-quiet">
                      {t('navInsights')}
                    </Link>
                  </div>
                </section>
                <Disclosure open={advanced}>
                  <dl className="ov-card person-card-pad tech-row">
                    <div>
                      <dt>{t('ppBaselineState')}</dt>
                      <dd>{s?.baseline.state ?? 'not-configured'}</dd>
                    </div>
                    <div>
                      <dt>{t('ppAcceptedSamples')}</dt>
                      <dd className="tabular">
                        {samples} / {BASELINE_SAMPLE_MIN}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('ppCoverage')}</dt>
                      <dd className="tabular">{Math.round((s?.baseline.coverageMs ?? 0) / 1000)} s</dd>
                    </div>
                  </dl>
                </Disclosure>
              </Tabs.Content>
            )}

            {tab === 'setup' && (
              <Tabs.Content value="setup" className="person-panel">
                <SetupSection consented={consented} env={s?.care.environment.name ?? t('monNotConfigured')} />
              </Tabs.Content>
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs.Root>
    </motion.div>
  );
}

function SetupSection({ consented, env }: { consented: boolean; env: string }) {
  const t = useT();
  const [, navigate] = useLocation();
  const profile = useData((s) => s.profile);
  const care = useMonitoringProfile().snapshot?.care;
  const [nick, setNick] = useState(profile?.nickname ?? '');
  const [age, setAge] = useState<AgeBand | 'none'>(profile?.ageBand ?? 'none');
  const [del, setDel] = useState(false);
  if (!profile) return null;

  const save = async () => {
    if (!nick.trim()) return;
    try {
      const p = await updateProfile(profile.id, { nickname: nick.trim(), ageBand: age === 'none' ? undefined : age });
      useData.getState().setProfile(p);
      await useData.getState().load();
      toast.success(t('saved'));
    } catch {
      toast.error(t('storageError'));
    }
  };

  return (
    <>
      <section className="ov-card person-card-pad" aria-labelledby="pp-consent">
        <h2 id="pp-consent" className="person-h2 mt-0">
          {t('ppConsentTitle')}
        </h2>
        <dl className="person-facts">
          <div>
            <dt>{t('ppSpace')}</dt>
            <dd>{env}</dd>
          </div>
          <div>
            <dt>{t('ppConsent')}</dt>
            <dd className={consented ? 'tone-text-ok' : 'tone-text-warn'}>
              <ShieldCheck size={15} aria-hidden />
              {t(consented ? 'ppConfirmed' : 'ppNotConfirmed')}
            </dd>
          </div>
          <div>
            <dt>{t('ppStorage')}</dt>
            <dd>{t('ppStorageOff')}</dd>
          </div>
        </dl>
      </section>

      <section className="ov-card person-card-pad" aria-labelledby="pp-edit">
        <h2 id="pp-edit" className="person-h2 mt-0">
          {t('secProfile')}
        </h2>
        <form
          className="settings-form space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <TextField
            label={t('obNickname')}
            hint={t('obNicknameHint')}
            value={nick}
            onChange={setNick}
            maxLength={40}
            {...(nick.trim() ? {} : { error: t('obNicknameRequired') })}
          />
          {care?.category !== 'older-adult' && (
            <Select
              label={`${t('obAgeBand')} (${t('optional')})`}
              value={age}
              onChange={setAge}
              options={AGE.map((a) => ({ value: a.value, label: t(a.label) }))}
            />
          )}
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="submit">{t('profileSave')}</Button>
            <Button variant="destructive" icon={<Trash aria-hidden className="size-5" />} onClick={() => setDel(true)}>
              {t('deleteProfile')}
            </Button>
          </div>
        </form>
      </section>

      <section className="ov-card person-card-pad" aria-labelledby="pp-ho">
        <h2 id="pp-ho" className="person-h2 mt-0">
          {t('indHandover')}
        </h2>
        <p className="person-small">{t('indHandoverBody', { name: profile.nickname })}</p>
        <div className="person-actions-row">
          <Link href="/handover" className="ov-btn ov-btn-ghost">
            <Share2 size={16} aria-hidden />
            {t('navHandover')}
          </Link>
        </div>
      </section>

      <MonitoringConfig />

      <ConfirmDelete
        open={del}
        onOpenChange={setDel}
        title={t('deleteProfileTitle', { name: profile.nickname })}
        body={t('deleteProfileBody', { name: profile.nickname })}
        confirmLabel={t('delete')}
        onConfirm={async () => {
          await deleteProfile(profile.id);
          useSettings.getState().set({ activeProfileId: '' });
          await useData.getState().load();
          toast.success(t('profileDeleted'));
          navigate(useData.getState().profiles.length ? '/individuals' : '/onboarding/profile');
        }}
      />
    </>
  );
}
