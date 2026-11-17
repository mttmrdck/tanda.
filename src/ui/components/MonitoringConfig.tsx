import { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { type CareProfile } from '../../platform/contracts';
import { useMonitoringProfile } from '../hooks/useMonitoringProfile';
import { session } from '../../store/useSession';
import { Button } from './Button';
import { Card } from './Card';
import { Select, Switch, TextField } from './Controls';

export function MonitoringConfig() {
  const t = useT();
  const m = useMonitoringProfile();
  const [draft, setDraft] = useState<CareProfile | null>(null);
  useEffect(() => setDraft(m.snapshot?.care ?? null), [m.snapshot?.care]);
  if (!draft) return <p role="status">{t(m.error ? 'storageError' : 'loading')}</p>;
  return (
    <Card className="monitor-config" aria-labelledby="monitor-config">
      <h2 id="monitor-config" className="text-xl">
        {t('monConfig')}
      </h2>
      <p className="page-description">{t('vdConfigureHint')}</p>
      <div className="config-columns">
        <fieldset className="config-section">
          <legend>{t('vdIndividualEnvironment')}</legend>
          <Select
            label={t('monCategory')}
            value={draft.category}
            onChange={(category) => setDraft({ ...draft, category })}
            options={[
              { value: 'unspecified', label: t('monUnspecified') },
              { value: 'child', label: t('monChild') },
              { value: 'older-adult', label: t('monOlder') },
            ]}
          />
          <p className="text-sm text-ink-muted">{t('monNoAutoPolicy')}</p>
          <TextField
            label={t('monRoom')}
            value={draft.environment.name}
            onChange={(name) => setDraft({ ...draft, environment: { ...draft.environment, name } })}
            maxLength={80}
          />
          <TextField
            label={t('monCaregiverLabel')}
            value={draft.caregiverLabel}
            onChange={(caregiverLabel) => setDraft({ ...draft, caregiverLabel })}
            maxLength={60}
          />
          <p className="text-sm text-ink-muted">{t('monLocalAccess')}</p>
        </fieldset>
        <fieldset className="config-section">
          <legend>{t('vdConsentPrivacy')}</legend>
          <Switch
            label={t('monAuthority')}
            checked={draft.consent.authorityConfirmed}
            onChange={(authorityConfirmed) => setDraft({ ...draft, consent: { ...draft.consent, authorityConfirmed } })}
          />
          <Switch
            label={t('monConsent')}
            checked={draft.consent.video}
            onChange={(video) =>
              setDraft({
                ...draft,
                consent: { ...draft.consent, video, reviewedAt: video ? new Date().toISOString() : null },
              })
            }
          />
        </fieldset>
        <fieldset className="config-section">
          <legend>{t('vdObservationPreferences')}</legend>
          <Switch
            label={t('monEnableMovement')}
            checked={draft.movementEnabled}
            onChange={(movementEnabled) => setDraft({ ...draft, movementEnabled })}
          />
          <Switch
            label={t('monReviewedContext')}
            checked={draft.baselineContextReviewed}
            onChange={(baselineContextReviewed) => setDraft({ ...draft, baselineContextReviewed })}
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              {t('monStartHour')}
              <input
                className="ml-2 min-h-11 w-16 rounded-lg bg-surface-2 px-2"
                type="number"
                min={0}
                max={23}
                value={draft.schedules[0]?.startHour ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    schedules: [
                      {
                        startHour: Math.max(0, Math.min(23, Number(e.target.value))),
                        endHour: draft.schedules[0]?.endHour ?? 24,
                      },
                    ],
                  })
                }
              />
            </label>
            <label className="text-sm">
              {t('monEndHour')}
              <input
                className="ml-2 min-h-11 w-16 rounded-lg bg-surface-2 px-2"
                type="number"
                min={1}
                max={24}
                value={draft.schedules[0]?.endHour ?? 24}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    schedules: [
                      {
                        startHour: draft.schedules[0]?.startHour ?? 0,
                        endHour: Math.max(1, Math.min(24, Number(e.target.value))),
                      },
                    ],
                  })
                }
              />
            </label>
          </div>
          <p className="text-sm text-ink-muted">{t('monScheduleNote')}</p>
        </fieldset>
      </div>
      <div className="config-footer">
        <Button
          disabled={!draft.environment.name.trim() || draft.schedules.some((w) => w.startHour >= w.endHour)}
          onClick={() => {
            if (!draft.consent.video || !draft.consent.authorityConfirmed) session.stop();
            void m.configure(draft);
          }}
        >
          {t('monSaveConfig')}
        </Button>
        {m.error && (
          <p role="alert" className="text-high-fg">
            {t('storageError')}
          </p>
        )}
      </div>
    </Card>
  );
}
