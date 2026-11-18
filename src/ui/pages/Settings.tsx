import { ArrowUpRight, Share2, ShieldCheck, Trash } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { useT } from '../../i18n';
import { deleteAllData } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { session } from '../../store/useSession';
import { listCameras } from '../../vision/camera';
import { disposeLandmarkers } from '../../vision/loader';
import { AppearanceControl } from '../components/AppearanceControl';
import { PrivacyChip } from '../components/Shell';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { SegmentedControl, Select, Slider, Switch } from '../components/Controls';
import { ConfirmDelete } from '../components/Dialog';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { cameraLabel, cameraTone } from '../cameraStatus';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card aria-labelledby={id} className="settings-group">
      <h2 id={id} className="text-xl">
        {title}
      </h2>
      <div className="settings-content">{children}</div>
    </Card>
  );
}

export default function Settings() {
  const t = useT();
  const s = useSettings();
  const [, navigate] = useLocation();
  const [cams, setCams] = useState<{ deviceId: string; label: string }[]>([]);
  const [delAll, setDelAll] = useState(false);
  const health = useMonitoringProfile().snapshot?.health;
  const camState = health?.camera.state ?? 'not-configured';
  const camTone = cameraTone(camState);

  useEffect(() => {
    void listCameras()
      .then(setCams)
      .catch(() => setCams([]));
  }, []);

  return (
    <div className="profile-page space-y-5">
      <PageHeader title={t('settingsTitle')} description={t('vdSettingsIntro')}/>
      <div className="settings-layout">
        <Section id="s-exp" title={t('setExpTitle')}>
          <Switch label={t('setAdvanced')} hint={t('setAdvancedHint')} checked={s.advanced} onChange={(advanced) => s.set({ advanced })} />
        </Section>

        <Section id="s-devices" title={t('monDevices')}>
          <dl className="person-facts">
            <div>
              <dt>{t('monCamera')}</dt>
              <dd>
                <span className={`pill tone-${camTone}`}>{t(cameraLabel(camState))}</span>
              </dd>
            </div>
            <div>
              <dt>{t('monLocalProcessing')}</dt>
              <dd>{t(health?.gateway.state === 'running' ? 'monRunning' : 'monStopped')}</dd>
            </div>
            <div>
              <dt>{t('setRemote')}</dt>
              <dd>{t('setRemoteOff')}</dd>
            </div>
          </dl>
          <Link href="/devices" className="ov-btn ov-btn-ghost self-start">
            {t('setOpenDevices')}
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        </Section>

        <Section id="s-privacy" title={t('setPrivacy')}>
          <ul className="privacy-list">
            {(['setPriv1', 'setPriv2', 'setPriv3'] as const).map((k) => (
              <li key={k}>
                <ShieldCheck size={16} aria-hidden className="tone-text-ok" />
                {t(k)}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="s-general" title={t('secGeneral')}>
          <PrivacyChip />
          <SegmentedControl
            label={t('language')}
            value={s.lang}
            onChange={(lang) => s.set({ lang })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ms', label: 'Bahasa Malaysia' },
            ]}
          />
          <AppearanceControl value={s.theme} onChange={theme => s.set({ theme })} />
        </Section>

        <Section id="s-recog" title={t('secRecognition')}>
          <Slider
            label={t('sensitivity')}
            hint={t('sensHint')}
            value={s.sensitivity}
            min={0.7}
            max={1.4}
            step={0.05}
            onChange={(sensitivity) => s.set({ sensitivity: Math.round(sensitivity * 100) / 100 })}
            valueText={s.sensitivity < 0.9 ? t('sensFewer') : s.sensitivity > 1.15 ? t('sensMore') : t('urgNormal')}
            left={t('sensFewer')}
            right={t('sensMore')}
          />
          <Slider
            label={t('windowLen')}
            hint={t('windowHint')}
            value={s.windowMs / 1000}
            min={1}
            max={4}
            step={0.5}
            onChange={(v) => s.set({ windowMs: Math.round(v * 2) * 500 })}
            valueText={t('seconds', { s: new Intl.NumberFormat(s.lang === 'ms' ? 'ms-MY' : 'en-GB').format(s.windowMs / 1000) })}
          />
          <Switch label={t('speakAloud')} hint={t('speakHint')} checked={s.speakAloud} onChange={(speakAloud) => s.set({ speakAloud })} />
          <Switch label={t('vibration')} hint={t('vibrationHint')} checked={s.vibration} onChange={(vibration) => s.set({ vibration })} />
          <Switch label={t('skeletonTeach')} checked={s.skeletonTeach} onChange={(skeletonTeach) => s.set({ skeletonTeach })} />
          <Switch label={t('skeletonLive')} checked={s.skeletonLive} onChange={(skeletonLive) => s.set({ skeletonLive })} />
        </Section>

        <Section id="s-camera" title={t('secCamera')}>
          <Select
            label={t('fps')}
            hint={t('fpsHint')}
            value={String(s.targetFps) as '10' | '15' | '20' | '30'}
            onChange={(v) => s.set({ targetFps: Number(v) as 10 | 15 | 20 | 30 })}
            options={(['10', '15', '20', '30'] as const).map((v) => ({ value: v, label: v }))}
          />
          <Switch label={t('batterySaver')} checked={s.batterySaver} onChange={(batterySaver) => s.set({ batterySaver })} />
          <Select
            label={t('cameraDevice')}
            hint={t('cameraNamesHint')}
            value={s.cameraDeviceId || 'default'}
            onChange={(v) => s.set({ cameraDeviceId: v === 'default' ? '' : v })}
            options={[{ value: 'default', label: t('cameraDefault') }, ...cams.filter((c) => c.deviceId && c.deviceId !== 'default').map((c) => ({ value: c.deviceId, label: c.label }))]}
          />
        </Section>

        <Section id="s-labs" title={t('labsTitle')}>
          <p className="text-sm text-ink-muted">{t('labsHint')}</p>
          <Switch label={t('labsSignPacks')} hint={t('labsSignPacksHint')} checked={s.labsSignPacks} onChange={(v) => s.set({ labsSignPacks: v })} />
          {s.labsSignPacks && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/signs')}>
                {t('labsOpenPacks')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/signs/author')}>
                {t('labsAuthor')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/signs/benchmark')}>
                {t('labsBenchmark')}
              </Button>
            </div>
          )}
        </Section>

        <Section id="s-data" title={t('secData')}>
          <Button variant="secondary" className="handover-button w-full" icon={<Share2 aria-hidden className="size-5 shrink-0" />} onClick={() => navigate('/handover')}>
            {t('handoverLink')}
          </Button>
          <div className="settings-danger rounded-[12px] bg-surface-2 p-4">
            <p className="font-bold text-high-fg">{t('deleteAll')}</p>
            <p className="mt-1 text-sm text-ink-muted">{t('deleteAllBody')}</p>
            <Button variant="destructive" className="mt-3" icon={<Trash aria-hidden className="size-5" />} onClick={() => setDelAll(true)}>
              {t('deleteAll')}
            </Button>
          </div>
          <p className="text-sm text-ink-muted tabular">{t('appVersion', { v: __APP_VERSION__ })}</p>
        </Section>
      </div>

      <ConfirmDelete
        open={delAll}
        onOpenChange={setDelAll}
        title={t('deleteAll')}
        body={t('deleteAllBody')}
        confirmLabel={t('delete')}
        confirmWord={t('deleteWord')}
        onConfirm={async () => {
          session.stop();
          disposeLandmarkers();
          await deleteAllData();
          useSettings.getState().reset();
          await useData.getState().load();
          toast.success(t('deleteAllDone'));
          navigate('/onboarding');
        }}
      />
    </div>
  );
}
