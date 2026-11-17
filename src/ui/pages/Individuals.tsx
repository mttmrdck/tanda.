import { BookOpen, Check, HardDrive, Plus, Share2, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import type { AgeBand } from '../../engine/types';
import { useT, type MsgKey } from '../../i18n';
import { deleteProfile, listSignals, updateProfile } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Select, TextField } from '../components/Controls';
import { ConfirmDelete } from '../components/Dialog';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { MonitoringConfig } from '../components/MonitoringConfig';
import { Avatar } from '../components/Shell';

const AGE: { value: AgeBand | 'none'; label: MsgKey }[] = [
  { value: 'none', label: 'ageNone' },
  { value: 'under5', label: 'ageUnder5' },
  { value: '5to8', label: 'age5to8' },
  { value: '9to12', label: 'age9to12' },
  { value: '13plus', label: 'age13plus' },
];

/**
 * Individuals: the local profiles on this device (not accounts — there is no sign-in). Switch, add, edit the
 * selected profile, hand it over, or delete it. Only a nickname and an optional age band are kept.
 */
export default function Individuals() {
  const t = useT();
  const care = useMonitoringProfile().snapshot?.care;
  const [, navigate] = useLocation();
  const profiles = useData((s) => s.profiles);
  const profile = useData((s) => s.profile);
  const select = useData((s) => s.selectProfile);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [nick, setNick] = useState(profile?.nickname ?? '');
  const [age, setAge] = useState<AgeBand | 'none'>(profile?.ageBand ?? 'none');
  const [del, setDel] = useState(false);

  useEffect(() => {
    setNick(profile?.nickname ?? '');
    setAge(profile?.ageBand ?? 'none');
  }, [profile]);

  useEffect(() => {
    let live = true;
    void Promise.all(profiles.map(async (p) => [p.id, (await listSignals(p.id)).length] as const))
      .then((xs) => live && setCounts(Object.fromEntries(xs)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [profiles]);

  const save = async () => {
    if (!profile || !nick.trim()) return;
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
    <div className="individuals-page space-y-6">
      <PageHeader title={t('indTitle')} description={t('indIntro')} />

      <section aria-labelledby="ind-list" className="space-y-3">
        <h2 id="ind-list" className="sr-only">
          {t('indTitle')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="individuals">
          {profiles.map((p) => {
            const active = p.id === profile?.id;
            return (
              <li key={p.id} className={active ? 'card individual is-active p-4' : 'card individual p-4'}>
                <div className="flex items-center gap-3">
                  <Avatar name={p.nickname} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">{p.nickname}</p>
                    <p className="text-sm text-ink-muted">{t('indGestures', { n: counts[p.id] ?? 0 })}</p>
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                      <Check aria-hidden className="size-4" />
                      {t('indSelected')}
                    </span>
                  ) : (
                    <Button variant="secondary" onClick={() => void select(p.id)}>
                      {t('indSwitch', { name: p.nickname })}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => navigate('/onboarding/profile')}
              className="press flex h-full min-h-20 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-border px-4 font-semibold text-primary hover:bg-surface-2"
            >
              <Plus aria-hidden className="size-5" />
              {t('indAdd')}
            </button>
          </li>
        </ul>
      </section>

      {profile && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Card aria-labelledby="ind-edit" className="space-y-4">
            <h2 id="ind-edit" className="text-lg">
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
                <Button
                  variant="destructive"
                  icon={<Trash aria-hidden className="size-5" />}
                  onClick={() => setDel(true)}
                >
                  {t('deleteProfile')}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-5">
            <Card aria-labelledby="ind-lib" className="space-y-3">
              <h2 id="ind-lib" className="text-lg">
                {t('signalsTitle')}
              </h2>
              <p className="text-ink-muted">{t('indGestures', { n: counts[profile.id] ?? 0 })}</p>
              <Link href="/signals" className="platform-secondary">
                <BookOpen aria-hidden className="size-5" />
                {t('indOpenLibrary')}
              </Link>
            </Card>
            <Card aria-labelledby="ind-ho" className="space-y-3">
              <h2 id="ind-ho" className="text-lg">
                {t('indHandover')}
              </h2>
              <p className="text-ink-muted">{t('indHandoverBody', { name: profile.nickname })}</p>
              <Link href="/handover" className="platform-primary">
                <Share2 aria-hidden className="size-5" />
                {t('navHandover')}
              </Link>
            </Card>
            <Card aria-labelledby="ind-data" className="space-y-3">
              <h2 id="ind-data" className="flex items-center gap-2 text-lg">
                <HardDrive aria-hidden className="size-5 text-ink-muted" />
                {t('indData')}
              </h2>
              <p className="text-ink-muted">{t('indDataBody', { name: profile.nickname })}</p>
              <Link
                href="/settings"
                className="inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4"
              >
                {t('indDeleteAll')}
              </Link>
            </Card>
          </div>
        </div>
      )}

      <MonitoringConfig />

      <ConfirmDelete
        open={del}
        onOpenChange={setDel}
        title={t('deleteProfileTitle', { name: profile?.nickname ?? '' })}
        body={t('deleteProfileBody', { name: profile?.nickname ?? '' })}
        confirmLabel={t('delete')}
        onConfirm={async () => {
          if (!profile) return;
          await deleteProfile(profile.id);
          useSettings.getState().set({ activeProfileId: '' });
          await useData.getState().load();
          toast.success(t('profileDeleted'));
          navigate(useData.getState().profiles.length ? '/individuals' : '/onboarding/profile');
        }}
      />
    </div>
  );
}
