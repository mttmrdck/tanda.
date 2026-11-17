import { Download, Lock, Radio, SpellCheck, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'wouter';
import { encryptPack, serialisePack, withdrawSigner } from '../../../engine/sign/pack';
import { useT } from '../../../i18n';
import { listSignProgress } from '../../../store/signRepo';
import type { SignProgress } from '../../../store/db';
import { useSettings } from '../../../store/useApp';
import { useSignPacks } from '../../../store/useSignPacks';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextField } from '../../components/Controls';
import { ConfirmDelete, Dialog } from '../../components/Dialog';
import { downloadBlob } from '../../components/download';
import { EmptyState } from '../../components/EmptyState';
import { PassphraseField } from '../../components/PassphraseField';
import { FramingNotes, glossOf, PackBadges, PackMeta, packTitle } from './SignBits';

export default function PackDetail() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { packId } = useParams<{ packId: string }>();
  const [, navigate] = useLocation();
  const { packs, load, save, remove } = useSignPacks();
  useEffect(() => void load(), [load]);
  const pack = packs.find((p) => p.id === packId);
  const [q, setQ] = useState('');
  const [progress, setProgress] = useState<Map<string, SignProgress>>(new Map());
  const [del, setDel] = useState(false);
  const [withdraw, setWithdraw] = useState<{ id: string; name: string } | null>(null);
  const [encOpen, setEncOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [encErr, setEncErr] = useState('');

  useEffect(() => {
    if (!packId) return;
    void listSignProgress(packId)
      .then((ps) => setProgress(new Map(ps.map((p) => [p.signId, p]))))
      .catch(() => undefined);
  }, [packId]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (pack?.signs ?? []).filter((x) => !s || x.gloss.toLowerCase().includes(s) || x.gloss_ms.toLowerCase().includes(s));
  }, [pack, q]);

  if (!pack) {
    return (
      <div className="space-y-4">
        <p role="alert">{t('spBadFile')}</p>
        <Link href="/signs" className="font-bold text-primary underline underline-offset-4">
          {t('spBack')}
        </Link>
      </div>
    );
  }
  const glossById = (id: string) => {
    const s = pack.signs.find((x) => x.id === id);
    return s ? glossOf(s, lang) : id;
  };
  const hasStatic = pack.signs.some((s) => s.type === 'static');
  const fileName = `${pack.id}-${pack.version}.signpack`;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/signs" className="inline-flex min-h-12 items-center font-bold text-primary">
          ← {t('spBack')}
        </Link>
        <h1 className="text-2xl sm:text-3xl">{packTitle(pack, lang)}</h1>
        <PackBadges pack={pack} />
        <FramingNotes />
      </header>

      <div className="flex flex-wrap gap-2">
        {hasStatic && (
          <Link href={`/signs/pack/${pack.id}/spell`} className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-fill px-5 font-semibold text-on-primary hover:bg-primary-hover">
            <SpellCheck aria-hidden className="size-5" />
            {t('spSpell')}
          </Link>
        )}
        {pack.signs.length > 0 && (
          <Link href={`/signs/pack/${pack.id}/recognise`} className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-primary-soft">
            <Radio aria-hidden className="size-5" />
            {t('spRecognise')}
          </Link>
        )}
        <Button variant="secondary" icon={<Download aria-hidden className="size-5" />} onClick={() => downloadBlob(serialisePack(pack), fileName, 'application/json')}>
          {t('spExport')}
        </Button>
        <Button variant="secondary" icon={<Lock aria-hidden className="size-5" />} onClick={() => setEncOpen(true)}>
          {t('spExportEncrypted')}
        </Button>
        {!pack.builtIn && (
          <Button variant="destructive" icon={<Trash aria-hidden className="size-5" />} onClick={() => setDel(true)}>
            {t('spDelete')}
          </Button>
        )}
      </div>

      {pack.signs.length === 0 ? (
        <EmptyState title={t('spEmptyPackTitle')} body={t('spEmptyPackBody')} />
      ) : (
        <Card aria-labelledby="signs-h" className="space-y-4">
          <h2 id="signs-h" className="text-lg">
            {t('spSigns', { n: pack.signs.length })}
          </h2>
          <TextField label={t('spSearch')} value={q} onChange={setQ} maxLength={60} />
          {shown.length === 0 ? (
            <p>{t('spNoMatch', { q })}</p>
          ) : (
            <ul className="grouped-list">
              {shown.map((s) => {
                const pr = progress.get(s.id);
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {s.gloss}
                        {s.gloss_ms && <span className="font-normal text-ink-muted"> · {s.gloss_ms}</span>}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {t(s.type === 'static' ? 'spStatic' : 'spDynamic')}
                        {pr ? ` · ${t('spProgress', { n: pr.attempts })}` : ''}
                      </p>
                      {s.confusableWith.length > 0 && <p className="text-sm text-rising-fg">{t('spConfusable', { list: s.confusableWith.map(glossById).join(', ') })}</p>}
                    </div>
                    <Link href={`/signs/pack/${pack.id}/practice/${s.id}`} className="press inline-flex min-h-12 items-center rounded-full bg-primary-soft px-5 font-semibold text-primary" aria-label={`${t('spPractice')}: ${s.gloss}`}>
                      {t('spPractice')}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <Card aria-labelledby="meta-h" className="space-y-3">
        <h2 id="meta-h" className="text-lg">
          {t('spSource')}
        </h2>
        <PackMeta
          pack={pack}
          actions={
            pack.builtIn
              ? undefined
              : (id, name) => (
                  <Button variant="quiet" className="min-h-10 px-3 text-sm" onClick={() => setWithdraw({ id, name })}>
                    {t('spWithdraw')}
                  </Button>
                )
          }
        />
      </Card>

      <ConfirmDelete
        open={del}
        onOpenChange={setDel}
        title={t('spDelete')}
        body={t('spDeleteConfirm', { name: packTitle(pack, lang) })}
        confirmLabel={t('spDelete')}
        onConfirm={async () => {
          await remove(pack.id);
          toast.success(t('spDeleted'));
          navigate('/signs');
        }}
      />
      <ConfirmDelete
        open={!!withdraw}
        onOpenChange={(o) => !o && setWithdraw(null)}
        title={t('spWithdraw')}
        body={t('spWithdrawConfirm', { name: withdraw?.name ?? '' })}
        confirmLabel={t('spWithdraw')}
        onConfirm={async () => {
          if (!withdraw) return;
          await save(withdrawSigner(pack, withdraw.id, new Date().toISOString()));
          setWithdraw(null);
          toast.success(t('spWithdrawn'));
        }}
      />
      <Dialog open={encOpen} onOpenChange={setEncOpen} title={t('spExportEncrypted')}>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void encryptPack(pack, pass)
              .then((txt) => {
                downloadBlob(txt, fileName, 'application/json');
                setEncOpen(false);
                setPass('');
                setEncErr('');
              })
              .catch(() => setEncErr(t('spPassphraseHint')));
          }}
        >
          <PassphraseField label={t('spPassphrase')} hint={t('spPassphraseHint')} value={pass} onChange={setPass} showStrength {...(encErr ? { error: encErr } : {})} />
          <Button type="submit">{t('spExport')}</Button>
        </form>
      </Dialog>
    </div>
  );
}
