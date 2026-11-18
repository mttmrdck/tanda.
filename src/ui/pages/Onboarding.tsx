import { Camera, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { dur, ease } from '../motion';
import { Link, useLocation } from 'wouter';
import { useT, type MsgKey } from '../../i18n';
import type { AgeBand } from '../../engine/types';
import { createProfile, RepoError } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { session, useSession } from '../../store/useSession';
import { Button } from '../components/Button';
import { TandaSymbol } from '../components/TandaSymbol';
import { SegmentedControl, Select, TextField } from '../components/Controls';

type Step = 'welcome' | 'consent' | 'profile' | 'ready';
const ORDER: Record<Step, number> = { welcome: 0, consent: 1, profile: 2, ready: 3 };

const AGE: { value: AgeBand | 'none'; label: MsgKey }[] = [
  { value: 'none', label: 'ageNone' },
  { value: 'under5', label: 'ageUnder5' },
  { value: '5to8', label: 'age5to8' },
  { value: '9to12', label: 'age9to12' },
  { value: '13plus', label: 'age13plus' },
];

export default function Onboarding({ startAt }: { startAt?: Step }) {
  const t = useT();
  const settings = useSettings();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(startAt ?? (settings.consented ? 'profile' : 'welcome'));
  // Direction of travel: Continue enters from the right, Back from the left. 0 = first paint (no movement).
  const [dir, setDir] = useState(0);
  const go = (next: Step) => {
    setDir(ORDER[next] >= ORDER[step] ? 1 : -1);
    setStep(next);
  };
  const [consent, setConsent] = useState([false, false, false]);
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState<AgeBand | 'none'>('none');
  const [nickError, setNickError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [createdName, setCreatedName] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const stepIndex = { welcome: 1, consent: 2, profile: 3, ready: 3 }[step];

  const create = async () => {
    if (!nickname.trim()) {
      setNickError(t('obNicknameRequired'));
      return;
    }
    setBusy(true);
    setSaveError('');
    try {
      const p = await createProfile({ nickname, ...(age !== 'none' ? { ageBand: age } : {}) });
      settings.set({ activeProfileId: p.id });
      await useData.getState().load();
      setCreatedName(p.nickname);
      go('ready');
    } catch (err) {
      setSaveError(t(err instanceof RepoError && err.code === 'quota' ? 'storageQuota' : 'storageError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={step === 'welcome' ? undefined : 'pt-4'}>
      {step !== 'ready' && step !== 'welcome' && (
        <>
          <p className="text-sm font-bold text-ink-muted tabular">{t('obStep', { n: stepIndex, total: 3 })}</p>
          <div className="ob-progress" aria-hidden>
            <span style={{ transform: `scaleX(${stepIndex / 3})` }} />
          </div>
        </>
      )}
      <motion.div
        key={step}
        initial={dir === 0 ? false : { opacity: 0, x: 16 * dir }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: dur.step, ease: ease.out }}
      >

      {step === 'welcome' && (
        <section aria-labelledby="ob-h" className="ob-welcome">
          <div className="ob-welcome-inner">
            <TandaSymbol className="ob-welcome-mark" />
            <h1 id="ob-h" ref={heading} tabIndex={-1} className="ob-welcome-title outline-none">
              {t('obWelcomeTitle')}
            </h1>
            <p className="ob-welcome-body">{t('obWelcomeBody')}</p>
            <Button size="lg" className="ob-welcome-cta" onClick={() => go('consent')}>
              {t('obStart')}
            </Button>
            <details className="ob-welcome-not">
              <summary>
                {t('obWhatNot')}
                <ChevronDown aria-hidden className="size-4" />
              </summary>
              <ul>
                {(['disclaimer', 'obNotMind', 'noFaces', 'obNoUpload'] as const).map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </details>
          </div>
          <p className="ob-welcome-privacy">
            <ShieldCheck aria-hidden className="size-4" strokeWidth={1.5} />
            {t('splashPrivacy')}
          </p>
        </section>
      )}

      {step === 'consent' && (
        <section aria-labelledby="ob-h" className="mt-2">
          <h1 id="ob-h" ref={heading} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">
            {t('obConsentTitle')}
          </h1>
          <fieldset className="mt-6 space-y-3" aria-describedby="consent-hint">
            <legend className="sr-only">{t('obConsentTitle')}</legend>
            {(['obConsent1', 'obConsent2', 'obConsent3'] as const).map((k, i) => (
              <label key={k} className="flex min-h-14 cursor-pointer items-start gap-4 rounded-[16px] border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={consent[i]}
                  onChange={(e) => setConsent((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] border-2 border-border bg-surface peer-checked:border-primary peer-checked:bg-primary-fill peer-checked:text-on-primary peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                  {consent[i] && <Check className="size-5" />}
                </span>
                <span>{t(k)}</span>
              </label>
            ))}
          </fieldset>
          <p id="consent-hint" className="mt-3 text-sm text-ink-muted">
            {t('obConsentHint')}{' '}
            <Link href="/about" className="font-bold text-primary underline underline-offset-4">
              {t('obReadPrivacy')}
            </Link>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => go('welcome')}>
              {t('back')}
            </Button>
            <Button
              disabled={!consent.every(Boolean)}
              onClick={() => {
                settings.set({ consented: true });
                go('profile');
              }}
            >
              {t('continue')}
            </Button>
          </div>
        </section>
      )}

      {step === 'profile' && (
        <section aria-labelledby="ob-h" className="mt-2">
          <h1 id="ob-h" ref={heading} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">
            {t('obProfileTitle')}
          </h1>
          <form
            className="mt-6 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <TextField
              label={t('obNickname')}
              hint={t('obNicknameHint')}
              value={nickname}
              onChange={(v) => {
                setNickname(v);
                if (v.trim()) setNickError('');
              }}
              error={nickError}
              maxLength={40}
            />
            <Select label={`${t('obAgeBand')} (${t('optional')})`} value={age} onChange={setAge} options={AGE.map((a) => ({ value: a.value, label: t(a.label) }))} />
            <SegmentedControl
              label={t('obLanguage')}
              value={settings.lang}
              onChange={(lang) => settings.set({ lang })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ms', label: 'Bahasa Malaysia' },
              ]}
            />
            {saveError && (
              <p role="alert" className="rounded-[16px] bg-high-bg p-4 font-bold text-high-fg">
                {saveError}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {!settings.consented && (
                <Button variant="secondary" onClick={() => go('consent')}>
                  {t('back')}
                </Button>
              )}
              <Button type="submit" loading={busy}>
                {t('obCreate')}
              </Button>
            </div>
          </form>
          <p className="mt-8 border-t border-border-soft pt-6">
            <Link href="/import" className="inline-flex min-h-12 items-center font-bold text-primary underline underline-offset-4">
              {t('obImportLink')}
            </Link>
          </p>
        </section>
      )}

      {step === 'ready' && (
        <section aria-labelledby="ob-h" className="mt-2">
          <svg className="ob-done" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
            <circle cx="22" cy="22" r="20.5" />
            <motion.path
              d="M14 22.5l5.5 5.5L30.5 16.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.32, ease: ease.out, delay: 0.12 }}
            />
          </svg>
          <h1 id="ob-h" ref={heading} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">
            {t('obReadyTitle', { name: createdName })}
          </h1>
          <p className="mt-4 text-lg text-ink-muted">{t('obReadyBody')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => {
                useSession.setState({ preferredSource: 'demo' });
                navigate('/');
                void session.start('demo');
              }}
            >
              {t('tryDemo')}
            </Button>
            <Button size="lg" variant="secondary" icon={<Camera aria-hidden className="size-5" />} onClick={() => {
                useSession.setState({ preferredSource: 'camera' });
                navigate('/');
              }}>
              {t('obUseCamera')}
            </Button>
          </div>
        </section>
      )}
      </motion.div>
    </div>
  );
}
