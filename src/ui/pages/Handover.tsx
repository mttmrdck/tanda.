import { clsx } from 'clsx';
import { CircleCheck, FileUp, KeyRound, Share2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { MIN_PASSPHRASE } from '../../engine/crypto';
import { decryptBundle, encryptBundle, HandoverError, type HandoverErrorCode, type ProfileBundle } from '../../engine/handover';
import { useT, type MsgKey } from '../../i18n';
import { exportBundle, importBundle, RepoError } from '../../store/repo';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Switch, Tab, TabList, TabPanel, Tabs, TextField } from '../components/Controls';
import { downloadBlob, fileStem, ymd } from '../components/download';
import { PassphraseField } from '../components/PassphraseField';

const HO_ERR: Record<HandoverErrorCode, MsgKey> = {
  'not-isyarat': 'hoErrNotIsyarat',
  'unsupported-version': 'hoErrVersion',
  'wrong-passphrase': 'hoErrPassphrase',
  corrupted: 'hoErrCorrupted',
  'invalid-content': 'hoErrContent',
  'weak-passphrase': 'hoErrWeak',
};

function ExportPanel() {
  const t = useT();
  const profile = useData((s) => s.profile);
  const sensitivity = useSettings((s) => s.sensitivity);
  const windowMs = useSettings((s) => s.windowMs);
  const [history, setHistory] = useState(false);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const short = pass.length < MIN_PASSPHRASE;
  const mismatch = pass2.length > 0 && pass !== pass2;

  const create = async () => {
    setTouched(true);
    if (!profile || short || pass !== pass2) return;
    setBusy(true);
    setDone('');
    try {
      const bundle = await exportBundle(profile.id, { includeHistory: history, settings: { sensitivity, windowMs } });
      const text = await encryptBundle(bundle, pass, new Date().toISOString());
      const file = `${fileStem(profile.nickname)}-${ymd(new Date())}.isyarat`;
      downloadBlob(text, file, 'application/octet-stream');
      setDone(file);
      setPass('');
      setPass2('');
      setTouched(false);
    } catch (err) {
      toast.error(err instanceof HandoverError ? t(HO_ERR[err.code]) : t('storageError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-lg font-bold">{t('incTitle')}</legend>
          <p className="flex items-center gap-2">
            <CircleCheck aria-hidden className="size-5 text-calm-fg" />
            {t('incAlways')}
          </p>
          <Switch label={t('incHistory')} checked={history} onChange={setHistory} />
        </fieldset>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input type="text" name="username" autoComplete="username" value={profile?.nickname ?? ''} readOnly hidden />
          <PassphraseField label={t('passphrase')} hint={t('passphraseHint')} value={pass} onChange={setPass} showStrength error={touched && short ? t('hoErrWeak') : undefined} />
          <PassphraseField label={t('passphraseConfirm')} value={pass2} onChange={setPass2} error={mismatch || (touched && pass !== pass2) ? t('passMismatch') : undefined} />
          <Button type="submit" size="lg" loading={busy} icon={<KeyRound aria-hidden className="size-5" />}>
            {busy ? t('creatingFile') : t('createFile')}
          </Button>
          {done && (
            <p role="status" className="flex items-center gap-2 rounded-[12px] bg-calm-bg p-3 font-bold text-calm-fg">
              <CircleCheck aria-hidden className="size-5" />
              {t('fileCreated', { file: done })}
            </p>
          )}
        </form>
      </Card>
      <Card aria-labelledby="howto" className="self-start">
        <h2 id="howto" className="text-lg">
          {t('howToTitle')}
        </h2>
        <ol className="mt-3 space-y-3">
          {(['howTo1', 'howTo2', 'howTo3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary tabular">
                {i + 1}
              </span>
              <span className="pt-1">{t(k)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/** Import an .isyarat file as a new profile. Used on the Handover page and from onboarding. */
export function ImportPanel({ onDone }: { onDone?: (profileId: string) => void }) {
  const t = useT();
  const profiles = useData((s) => s.profiles);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<ProfileBundle | null>(null);
  const [saveAs, setSaveAs] = useState('');
  const [result, setResult] = useState<{ id: string; name: string; n: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const choose = async (f: File | undefined) => {
    setError('');
    setBundle(null);
    setResult(null);
    if (!f) return;
    try {
      setFile({ name: f.name, text: await f.text() });
    } catch {
      setError(t('hoErrRead'));
    }
  };

  const unlock = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const b = await decryptBundle(file.text, pass);
      setBundle(b);
      setSaveAs(b.nickname);
    } catch (err) {
      setError(err instanceof HandoverError ? t(HO_ERR[err.code]) : t('hoErrContent'));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!bundle) return;
    setBusy(true);
    try {
      const p = await importBundle(bundle, saveAs.trim() || bundle.nickname);
      await useData.getState().load();
      setResult({ id: p.id, name: p.nickname, n: bundle.signals.length });
      setBundle(null);
      setFile(null);
      setPass('');
    } catch (err) {
      setError(t(err instanceof RepoError && err.code === 'quota' ? 'storageQuota' : 'storageError'));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Card className="flex flex-col items-start gap-4">
        <p role="status" className="flex items-center gap-2 text-lg font-bold text-calm-fg">
          <CircleCheck aria-hidden className="size-6" />
          {t('importDone', { name: result.name, n: result.n })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => onDone?.(result.id)}>{t('importOpen', { name: result.name })}</Button>
          <Button variant="secondary" onClick={() => setResult(null)}>
            {t('importAnother')}
          </Button>
        </div>
      </Card>
    );
  }

  const taken = bundle && profiles.some((p) => p.nickname.toLowerCase() === (saveAs.trim() || bundle.nickname).toLowerCase());

  return (
    <Card className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void choose(e.dataTransfer.files[0]);
        }}
        className={clsx('flex flex-col items-center gap-2 rounded-[20px] border-2 border-dashed p-8 text-center', drag ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2')}
      >
        <FileUp aria-hidden className="size-10 text-primary" />
        <input ref={input} type="file" accept=".isyarat,application/json,application/octet-stream" className="sr-only" id="import-file" onChange={(e) => void choose(e.target.files?.[0])} />
        <label htmlFor="import-file" className="inline-flex min-h-12 cursor-pointer items-center rounded-[12px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-hover has-[:focus-visible]:outline">
          {t('importChoose')}
        </label>
        <p className="text-ink-muted">{t('importDropHint')}</p>
        {file && <p className="font-bold">{t('importChosen', { file: file.name })}</p>}
      </div>

      {file && !bundle && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <input type="text" name="username" autoComplete="username" value={file.name} readOnly hidden />
          <PassphraseField label={t('passphrase')} value={pass} onChange={setPass} autoComplete="current-password" />
          <Button type="submit" loading={busy} disabled={!pass}>
            {busy ? t('importUnlocking') : t('importUnlock')}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-[12px] bg-high-bg p-4 font-bold text-high-fg" data-testid="import-error">
          {error}
        </p>
      )}

      {bundle && (
        <div className="space-y-4 rounded-[16px] border border-border-soft p-4">
          <h2 className="text-lg">{t('importPreviewTitle')}</h2>
          <p data-testid="import-preview">{t('importPreviewLine', { nickname: bundle.nickname, signals: bundle.signals.length, examples: bundle.examples.length })}</p>
          <p className="text-ink-muted">{bundle.events ? t('importWithHistory', { n: bundle.events.length }) : t('importNoHistory')}</p>
          <TextField label={t('importSaveAs')} value={saveAs} onChange={setSaveAs} maxLength={40} />
          {taken && <p className="text-sm text-ink-muted">{t('importNameTaken', { name: saveAs.trim() || bundle.nickname })}</p>}
          <Button size="lg" loading={busy} onClick={() => void doImport()}>
            {t('importConfirm')}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function Handover() {
  const t = useT();
  const profile = useData((s) => s.profile);
  const [, navigate] = useLocation();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-2xl sm:text-3xl">
          <Share2 aria-hidden className="size-7 text-primary" />
          {t('handoverTitle')}
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-muted">{t('handoverIntro', { name: profile?.nickname ?? '' })}</p>
      </header>
      <Tabs defaultValue="export" className="space-y-6">
        <TabList label={t('handoverTitle')}>
          <Tab value="export">{t('tabExport')}</Tab>
          <Tab value="import">{t('tabImport')}</Tab>
        </TabList>
        <TabPanel value="export">
          <ExportPanel />
        </TabPanel>
        <TabPanel value="import">
          <ImportPanel
            onDone={(id) => {
              void useData.getState().selectProfile(id);
              navigate('/');
            }}
          />
        </TabPanel>
      </Tabs>
    </div>
  );
}
