import { Ban, Eye, Hand, Lock, MicOff, ShieldCheck, Sparkles, CloudUpload } from 'lucide-react';
import { useT } from '../../i18n';
import { Card } from '../components/Card';

export default function About() {
  const t = useT();
  const how = [
    { title: t('how1Title'), body: t('how1Body'), Icon: Hand },
    { title: t('how2Title'), body: t('how2Body'), Icon: Sparkles },
    { title: t('how3Title'), body: t('how3Body'), Icon: Eye },
    { title: t('how4Title'), body: t('how4Body'), Icon: ShieldCheck },
  ];
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl">{t('aboutTitle')}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{t('monTagline')}</p>
      </header>

      <p className="max-w-3xl text-ink-muted">{t('monPhilosophy')}</p>

      <section aria-labelledby="how">
        <h2 id="how" className="text-xl">
          {t('aboutHow')}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {how.map((h, i) => (
            <Card as="li" key={h.title} className="flex gap-4">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <h.Icon className="size-6" />
              </span>
              <div>
                <h3 className="text-lg">
                  <span className="sr-only">{i + 1}. </span>
                  {h.title}
                </h3>
                <p className="mt-1 text-ink-muted">{h.body}</p>
              </div>
            </Card>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card aria-labelledby="never">
          <h2 id="never" className="text-xl">
            {t('aboutNever')}
          </h2>
          <ul className="mt-4 space-y-3">
            {[
              { k: 'noFaces' as const, Icon: Ban },
              { k: 'neverAudio' as const, Icon: MicOff },
              { k: 'neverUpload' as const, Icon: CloudUpload },
              { k: 'neverDiagnose' as const, Icon: ShieldCheck },
              { k: 'neverTrack' as const, Icon: Lock },
            ].map(({ k, Icon }) => (
              <li key={k} className="flex gap-3">
                <Icon aria-hidden className="mt-1 size-5 shrink-0 text-calm-fg" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card aria-labelledby="limits">
          <h2 id="limits" className="text-xl">
            {t('aboutLimits')}
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-ink-muted">
            {(['limit1', 'limit2', 'limit3', 'limit4', 'limit5'] as const).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </Card>
        <Card aria-labelledby="privacy">
          <h2 id="privacy" className="text-xl">
            {t('aboutPrivacy')}
          </h2>
          <div className="mt-3 space-y-3 text-ink-muted">
            <p>{t('privacyBody1')}</p>
            <p>{t('privacyBody2')}</p>
            <p>{t('privacyBody3')}</p>
            <p>{t('privacyBody4')}</p>
          </div>
        </Card>
        <Card aria-labelledby="a11y">
          <h2 id="a11y" className="text-xl">
            {t('aboutA11y')}
          </h2>
          <p className="mt-3 text-ink-muted">{t('aboutA11yBody')}</p>
          <h2 className="mt-6 text-xl">{t('aboutCredits')}</h2>
          <p className="mt-3 text-ink-muted">{t('aboutCreditsBody')}</p>
        </Card>
      </div>
      <p className="rounded-[16px] border border-border-soft bg-surface-2 p-4 font-bold">{t('disclaimer')}</p>
    </div>
  );
}
