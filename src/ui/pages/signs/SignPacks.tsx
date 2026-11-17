import { ChevronRight, FlaskConical, Gauge, PenLine, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { isEncryptedPack, PackError, readPackFile, type SignPack } from '../../../engine/sign/pack';
import { useT } from '../../../i18n';
import { useSettings } from '../../../store/useApp';
import { isBuiltInPack, useSignPacks } from '../../../store/useSignPacks';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { PassphraseField } from '../../components/PassphraseField';
import { FramingNotes, PackBadges, PackMeta, packTitle } from './SignBits';

export default function SignPacks() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const noticeSeen = useSettings((s) => s.signsNoticeSeen);
  const setSettings = useSettings((s) => s.set);
  const { packs, load, save } = useSignPacks();
  useEffect(() => void load(), [load]);

  const [fileText, setFileText] = useState<string | null>(null);
  const [needsPass, setNeedsPass] = useState(false);
  const [pass, setPass] = useState('');
  const [pending, setPending] = useState<SignPack | null>(null);
  const [error, setError] = useState('');

  const open = async (text: string, passphrase?: string) => {
    setError('');
    try {
      setPending(await readPackFile(text, passphrase));
      setNeedsPass(false);
    } catch (err) {
      setError(t(err instanceof PackError && err.code === 'wrong-passphrase' ? 'spWrongPass' : 'spBadFile'));
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    setFileText(text);
    setPending(null);
    setPass('');
    try {
      if (isEncryptedPack(text)) {
        setError('');
        setNeedsPass(true);
        return;
      }
    } catch {
      setError(t('spBadFile'));
      return;
    }
    await open(text);
  };

  const confirmImport = async () => {
    if (!pending) return;
    // a file can never replace a built-in pack: give it its own id
    await save(isBuiltInPack(pending.id) ? { ...pending, id: `${pending.id}-imported` } : pending);
    setPending(null);
    setFileText(null);
    toast.success(t('spImported'));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl sm:text-3xl">{t('spTitle')}</h1>
        <FramingNotes />
      </header>

      {!noticeSeen && (
        <Card aria-labelledby="sp-notice" className="space-y-3 border border-border-soft" data-testid="signs-notice">
          <h2 id="sp-notice" className="flex items-center gap-2 text-lg">
            <FlaskConical aria-hidden className="size-5 text-primary" />
            {t('spNoticeTitle')}
          </h2>
          <p>{t('spNoticeBody')}</p>
          <Button onClick={() => setSettings({ signsNoticeSeen: true })}>{t('spNoticeOk')}</Button>
        </Card>
      )}

      <ul className="grid gap-4 md:grid-cols-2" aria-label={t('spTitle')}>
        {packs.map((p) => (
          <li key={p.id}>
            <Link href={`/signs/pack/${p.id}`} className="card press flex h-full flex-col gap-3 p-5 hover:bg-surface-2" data-testid={`pack-${p.id}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="text-lg font-bold">{packTitle(p, lang)}</span>
                <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-ink-muted" />
              </span>
              <PackBadges pack={p} />
              <span className="text-sm text-ink-muted">{t('spSigns', { n: p.signs.length })}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <label htmlFor="signpack-file" className="press inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft focus-within:outline focus-within:outline-[3px] focus-within:outline-focus">
          <Upload aria-hidden className="size-5" />
          {t('spImport')}
          <input id="signpack-file" type="file" accept=".signpack,application/json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        <Link href="/signs/author" className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
          <PenLine aria-hidden className="size-5" />
          {t('labsAuthor')}
        </Link>
        <Link href="/signs/benchmark" className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
          <Gauge aria-hidden className="size-5" />
          {t('labsBenchmark')}
        </Link>
      </div>

      {error && !needsPass && (
        <p role="alert" className="rounded-[16px] bg-high-bg p-3 font-bold text-high-fg">
          {error}
        </p>
      )}

      <Dialog open={needsPass} onOpenChange={setNeedsPass} title={t('spImport')}>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (fileText) void open(fileText, pass);
          }}
        >
          <PassphraseField label={t('spPassphrase')} value={pass} onChange={setPass} autoComplete="current-password" {...(error ? { error } : {})} />
          <Button type="submit">{t('spContinue')}</Button>
        </form>
      </Dialog>

      <Dialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={t('spImportTitle')}
        description={t('spImportBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={() => void confirmImport()}>{t('spImportConfirm')}</Button>
          </>
        }
      >
        {pending && (
          <div className="mt-4 space-y-4" data-testid="import-preview">
            <p className="text-lg font-bold">{packTitle(pending, lang)}</p>
            <PackBadges pack={pending} />
            <p>{t('spSigns', { n: pending.signs.length })}</p>
            <PackMeta pack={pending} />
            {packs.some((p) => p.id === pending.id) && <p className="font-bold text-rising-fg">{t('spImportExists')}</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
