import { Share2, Trash } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import type { AgeBand, ComfortSteps } from '../../engine/types';
import { useT, type MsgKey } from '../../i18n';
import { deleteAllData, deleteProfile, updateProfile } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { session } from '../../store/useSession';
import { listCameras } from '../../vision/camera';
import { disposeLandmarkers } from '../../vision/loader';
import { AppearanceControl } from '../components/AppearanceControl';
import { PrivacyChip } from '../components/Shell';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SegmentedControl, Select, Slider, Switch, TextField } from '../components/Controls';
import { ConfirmDelete } from '../components/Dialog';

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

const AGE: { value: AgeBand | 'none'; label: MsgKey }[] = [
  { value: 'none', label: 'ageNone' },
  { value: 'under5', label: 'ageUnder5' },
  { value: '5to8', label: 'age5to8' },
  { value: '9to12', label: 'age9to12' },
  { value: '13plus', label: 'age13plus' },
];

export default function Settings() {
  const t = useT();
  const s = useSettings();
  const profile = useData((x) => x.profile);
  const [, navigate] = useLocation();
  const [cams, setCams] = useState<{ deviceId: string; label: string }[]>([]);
  const [nick, setNick] = useState(profile?.nickname ?? '');
  const [age, setAge] = useState<AgeBand | 'none'>(profile?.ageBand ?? 'none');
  const [comfort, setComfort] = useState<ComfortSteps>(profile?.comfortSteps ?? { calm: '', rising: '', high: '' });
  const [delAll, setDelAll] = useState(false);
  const [delProfile, setDelProfile] = useState(false);

  useEffect(() => {
    void listCameras()
      .then(setCams)
      .catch(() => setCams([]));
  }, []);

  useEffect(() => {
    setNick(profile?.nickname ?? '');
    setAge(profile?.ageBand ?? 'none');
    setComfort(profile?.comfortSteps ?? { calm: '', rising: '', high: '' });
  }, [profile]);

  const saveProfile = async (patch: Parameters<typeof updateProfile>[1]) => {
    if (!profile) return;
    try {
      const p = await updateProfile(profile.id, patch);
      useData.getState().setProfile(p);
      toast.success(t('saved'));
    } catch {
      toast.error(t('storageError'));
    }
  };

  return (
    <div className="profile-page space-y-5">
      <h1 className="text-2xl sm:text-3xl">{t('settingsTitle')}</h1>
      <div className="settings-layout">
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

        <Section id="s-profile" title={t('secProfile')}>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nick.trim()) return;
              const patch: Parameters<typeof updateProfile>[1] = { nickname: nick.trim() };
              if (age !== 'none') patch.ageBand = age;
              void saveProfile(age === 'none' ? { ...patch, ageBand: undefined } : patch);
            }}
          >
            <TextField label={t('obNickname')} hint={t('obNicknameHint')} value={nick} onChange={setNick} maxLength={40} error={nick.trim() ? undefined : t('obNicknameRequired')} />
            <Select label={`${t('obAgeBand')} (${t('optional')})`} value={age} onChange={setAge} options={AGE.map((a) => ({ value: a.value, label: t(a.label) }))} />
            <div className="flex flex-wrap justify-between gap-3">
              <Button type="submit">{t('profileSave')}</Button>
              <Button variant="quiet" className="text-high-fg hover:bg-high-bg" icon={<Trash aria-hidden className="size-5" />} onClick={() => setDelProfile(true)}>
                {t('deleteProfile')}
              </Button>
            </div>
          </form>
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

        <Section id="s-comfort" title={t('secComfort')}>
          <p className="text-ink-muted">{t('comfortHint')}</p>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile({ comfortSteps: { calm: comfort.calm.trim(), rising: comfort.rising.trim(), high: comfort.high.trim() } });
            }}
          >
            <TextField label={t('comfortCalm')} value={comfort.calm} onChange={(calm) => setComfort({ ...comfort, calm })} placeholder={t('comfortPlaceholderCalm')} multiline maxLength={300} />
            <TextField label={t('comfortRising')} value={comfort.rising} onChange={(rising) => setComfort({ ...comfort, rising })} placeholder={t('comfortPlaceholderRising')} multiline maxLength={300} />
            <TextField label={t('comfortHigh')} value={comfort.high} onChange={(high) => setComfort({ ...comfort, high })} placeholder={t('comfortPlaceholderHigh')} multiline maxLength={300} />
            <Button type="submit">{t('save')}</Button>
          </form>
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
      <ConfirmDelete
        open={delProfile}
        onOpenChange={setDelProfile}
        title={t('deleteProfileTitle', { name: profile?.nickname ?? '' })}
        body={t('deleteProfileBody', { name: profile?.nickname ?? '' })}
        confirmLabel={t('delete')}
        onConfirm={async () => {
          if (!profile) return;
          await deleteProfile(profile.id);
          useSettings.getState().set({ activeProfileId: '' });
          await useData.getState().load();
          toast.success(t('profileDeleted'));
          navigate(useData.getState().profiles.length ? '/' : '/onboarding/profile');
        }}
      />
    </div>
  );
}
