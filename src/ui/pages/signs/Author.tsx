import { Check, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { CLIP_N, D } from '../../../engine/constants';
import { findConfusables } from '../../../engine/sign/confusable';
import { buildPackModels } from '../../../engine/sign/models';
import { encodeFloats, type Sign, type SignPack } from '../../../engine/sign/pack';
import { checkTakes, MIN_TAKES, type SetIssue, type TakeIssue } from '../../../engine/sign/quality';
import { handShapeOfClip } from '../../../engine/sign/staticHand';
import { TEACHABLE_GESTURES, type GestureName } from '../../../engine/simulator';
import { useT, type MsgKey } from '../../../i18n';
import { uid } from '../../../store/repoBase';
import { useSettings } from '../../../store/useApp';
import { useSignPacks } from '../../../store/useSignPacks';
import { useSession } from '../../../store/useSession';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip, SegmentedControl, Select, TextField } from '../../components/Controls';
import { SignalGlyph } from '../../components/SignalGlyph';
import { GESTURE_LABEL } from '../../components/gestureLabels';
import { SourceControls, VideoPanel } from '../../components/VideoPanel';
import { useSignCapture, windowFor } from '../../hooks/useSignCapture';
import { CaptureOverlay, FramingNotes } from './SignBits';

const DEMO_PERFORMER: GestureName[] = [...TEACHABLE_GESTURES, 'shapeOpen', 'shapeFist', 'shapePoint', 'shapeThumb'];
const issueKey = (i: TakeIssue | SetIssue): MsgKey => `spQ_${i.replace('-', '_')}` as MsgKey;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sign';
const bump = (v: string) => {
  const [a, b, c] = v.split('.').map(Number);
  return `${a ?? 0}.${b ?? 0}.${(c ?? 0) + 1}`;
};

interface Take {
  id: number;
  clip: Float32Array;
  energy: number;
}

/** Labs: a reference signer records a sign pack. Landmarks only; consent first; signer may withdraw later. */
export default function Author() {
  const t = useT();
  const skeleton = useSettings((s) => s.skeletonTeach);
  const setSettings = useSettings((s) => s.set);
  const { packs, load, save } = useSignPacks();
  useEffect(() => void load(), [load]);
  const phase = useSession((s) => s.phase);
  const kind = useSession((s) => s.kind);
  const cap = useSignCapture();

  const [step, setStep] = useState<'consent' | 'pack' | 'sign'>('consent');
  const [consent, setConsent] = useState([false, false]);
  const [credit, setCredit] = useState('');
  const [signerId] = useState(() => uid());

  const own = packs.filter((p) => !p.builtIn);
  const [packId, setPackId] = useState<string>('new');
  const [language, setLanguage] = useState<'ASL' | 'BIM' | 'OTHER'>('ASL');
  const [otherCode, setOtherCode] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleMs, setTitleMs] = useState('');
  const [licence, setLicence] = useState('CC BY 4.0');

  const [gloss, setGloss] = useState('');
  const [glossMs, setGlossMs] = useState('');
  const [type, setType] = useState<Sign['type']>('dynamic');
  const [notes, setNotes] = useState('');
  const [takes, setTakes] = useState<Take[]>([]);
  const [nextId, setNextId] = useState(1);
  const [performer, setPerformer] = useState<GestureName>('wave');
  const [saving, setSaving] = useState(false);

  const pack = packs.find((p) => p.id === packId);
  const quality = useMemo(() => checkTakes(takes, type), [takes, type]);

  const createPack = async () => {
    const code = language === 'OTHER' ? otherCode.trim().toUpperCase() : language;
    if (!titleEn.trim() || code.length < 2) return;
    const now = new Date().toISOString();
    const p: SignPack = {
      format: 'isyarat-signpack',
      schema: 1,
      id: `${slug(titleEn)}-${uid().slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, '0')}`,
      language: code,
      version: '0.1.0',
      title_en: titleEn.trim(),
      title_ms: titleMs.trim(),
      signs: [],
      signerCredits: [],
      reviewStatus: 'unreviewed',
      licence: licence.trim() || 'All rights reserved',
      source: 'Recorded in Isyarat by consenting reference signers (landmarks only).',
      demo: false,
      builtIn: false,
      updatedAt: now,
    };
    await save(p);
    setPackId(p.id);
    setStep('sign');
  };

  const record = async () => {
    const r = await cap.capture(kind === 'demo' ? performer : null);
    const w = r ? windowFor(r, type) : null;
    if (!w?.clip) return;
    const clip = w.clip;
    setTakes((ts) => [...ts, { id: nextId, clip, energy: w.energy }]);
    setNextId((n) => n + 1);
  };

  const saveSign = async () => {
    if (!pack || !gloss.trim() || takes.length < MIN_TAKES) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const taken = new Set(pack.signs.map((s) => s.id));
      let id = slug(gloss);
      for (let i = 2; taken.has(id); i++) id = `${slug(gloss)}-${i}`;
      const sign: Sign = {
        id,
        gloss: gloss.trim(),
        gloss_ms: glossMs.trim(),
        type,
        notes: notes.trim(),
        confusableWith: [],
        templates: takes.map((tk) => {
          const side = type === 'static' ? handShapeOfClip(tk.clip)?.side : undefined;
          return { n: CLIP_N, d: D, data: encodeFloats(tk.clip), signerId, recordedAt: now, ...(side ? { hand: side } : {}) };
        }),
      };
      const credits = pack.signerCredits.some((c) => c.id === signerId) ? pack.signerCredits : [...pack.signerCredits, { id: signerId, name: credit.trim(), consentedAt: now }];
      let next: SignPack = { ...pack, signs: [...pack.signs, sign], signerCredits: credits, version: bump(pack.version), updatedAt: now };
      const conf = findConfusables(buildPackModels(next));
      next = { ...next, signs: next.signs.map((s) => ({ ...s, confusableWith: conf.get(s.id) ?? [] })) };
      await save(next);
      toast.success(t('spSaved', { gloss: sign.gloss }));
      setGloss('');
      setGlossMs('');
      setNotes('');
      setTakes([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/signs" className="inline-flex min-h-12 items-center font-bold text-primary">
          ← {t('spBack')}
        </Link>
        <h1 className="text-2xl sm:text-3xl">{t('spAuthorTitle')}</h1>
        <FramingNotes />
      </header>

      {step === 'consent' && (
        <Card aria-labelledby="consent-h" className="space-y-4">
          <h2 id="consent-h" className="text-xl">
            {t('spConsentTitle')}
          </h2>
          <fieldset className="space-y-3">
            <legend className="sr-only">{t('spConsentTitle')}</legend>
            {(['spConsent1', 'spConsent2'] as const).map((k, i) => (
              <label key={k} className="flex min-h-14 cursor-pointer items-start gap-4 rounded-[16px] border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="checkbox" className="peer sr-only" checked={consent[i]} onChange={(e) => setConsent((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
                <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] border-2 border-border bg-surface peer-checked:border-primary peer-checked:bg-primary-fill peer-checked:text-on-primary peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                  {consent[i] && <Check className="size-5" />}
                </span>
                <span>{t(k)}</span>
              </label>
            ))}
          </fieldset>
          <TextField label={t('spCreditName')} hint={t('spCreditHint')} value={credit} onChange={setCredit} maxLength={80} />
          <Button size="lg" disabled={!consent.every(Boolean)} onClick={() => setStep('pack')}>
            {t('spContinue')}
          </Button>
        </Card>
      )}

      {step === 'pack' && (
        <Card aria-labelledby="pack-h" className="space-y-4">
          <h2 id="pack-h" className="text-xl">
            {t('spChoosePack')}
          </h2>
          <Select label={t('spChoosePack')} value={packId} onChange={setPackId} options={[{ value: 'new', label: t('spNewPack') }, ...own.map((p) => ({ value: p.id, label: p.title_en }))]} />
          {packId === 'new' ? (
            <div className="space-y-4">
              <Select
                label={t('spLanguage')}
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'ASL', label: t('spLangASL') },
                  { value: 'BIM', label: t('spLangBIM') },
                  { value: 'OTHER', label: t('spLanguageOther') },
                ]}
              />
              {language === 'OTHER' && <TextField label={t('spLanguageOther')} value={otherCode} onChange={setOtherCode} maxLength={16} />}
              <TextField label={t('spPackTitleEn')} value={titleEn} onChange={setTitleEn} maxLength={80} />
              <TextField label={t('spPackTitleMs')} value={titleMs} onChange={setTitleMs} maxLength={80} />
              <TextField label={t('spLicence')} hint={t('spLicenceHint')} value={licence} onChange={setLicence} maxLength={200} />
              <Button size="lg" disabled={!titleEn.trim() || (language === 'OTHER' && otherCode.trim().length < 2)} onClick={() => void createPack()}>
                {t('spCreatePack')}
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setStep('sign')}>
              {t('spContinue')}
            </Button>
          )}
        </Card>
      )}

      {step === 'sign' && pack && (
        <section aria-labelledby="sign-h" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <h2 id="sign-h" className="text-xl">
              {t('spAddSign')} · {pack.title_en}
            </h2>
            <VideoPanel skeleton={skeleton} onSkeleton={(v) => setSettings({ skeletonTeach: v })} overlay={<CaptureOverlay phase={cap.phase} count={cap.count} progress={cap.progress} />} />
            <Button size="lg" className="w-full" disabled={phase !== 'running' || cap.busy} loading={cap.busy} onClick={() => void record()}>
              {cap.busy ? t('spChecking') : t('spRecordTake', { n: takes.length + 1 })}
            </Button>
            <SourceControls gestures={[]} />
            {kind === 'demo' && phase === 'running' && (
              <fieldset className="source-controls rounded-[16px] bg-surface p-4">
                <legend className="font-bold">{t('spPerformerDoes')}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DEMO_PERFORMER.map((g) => (
                    <Chip key={g} selected={performer === g} onClick={() => setPerformer(g)}>
                      {t(GESTURE_LABEL[g])}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          <Card className="space-y-4 self-start">
            <TextField label={t('spGloss')} value={gloss} onChange={setGloss} maxLength={60} />
            <TextField label={t('spGlossMs')} value={glossMs} onChange={setGlossMs} maxLength={60} />
            <SegmentedControl
              label={t('spType')}
              value={type}
              onChange={setType}
              options={[
                { value: 'dynamic', label: t('spDynamic') },
                { value: 'static', label: t('spStatic') },
              ]}
            />
            <TextField label={t('spNotes')} value={notes} onChange={setNotes} multiline maxLength={500} />
            <p className="font-bold" data-testid="author-takes">
              {t('spTakes', { n: takes.length })}
            </p>
            {takes.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {takes.map((tk, i) => (
                  <li key={tk.id} className="relative rounded-[16px] border border-border-soft bg-surface p-1">
                    <SignalGlyph data={tk.clip} n={CLIP_N} playing={false} size="sm" label={t('teachTake', { n: i + 1 })} />
                    {quality.perTake[i]?.map((iss) => (
                      <p key={iss} className="px-1 text-xs font-semibold text-rising-fg">
                        {t(issueKey(iss))}
                      </p>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTakes((ts) => ts.filter((x) => x.id !== tk.id))}
                      className="absolute right-0 top-0 grid size-12 place-items-center rounded-[16px] text-ink-muted hover:text-high-fg"
                      aria-label={t('spRemoveTake', { n: i + 1 })}
                    >
                      <Trash aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {quality.set.length > 0 && (
              <ul className="space-y-1 text-sm text-rising-fg" data-testid="author-quality">
                {quality.set.map((iss) => (
                  <li key={iss}>{t(issueKey(iss))}</li>
                ))}
              </ul>
            )}
            <Button size="lg" className="w-full" disabled={!gloss.trim() || takes.length < MIN_TAKES || cap.busy} loading={saving} onClick={() => void saveSign()}>
              {t('spSaveSign')}
            </Button>
            <Link href={`/signs/pack/${pack.id}`} className="inline-flex min-h-12 items-center font-bold text-primary underline underline-offset-4">
              {pack.title_en}
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}
