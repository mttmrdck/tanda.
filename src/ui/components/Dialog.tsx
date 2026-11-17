import * as RD from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useT } from '../../i18n';
import { Button, IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** bottom sheet on small screens */
  sheet?: boolean;
}

/** Accessible modal dialog (Radix): focus is moved in, trapped, and returned on close; Escape closes. */
export function Dialog({ open, onOpenChange, title, description, children, footer, sheet = false }: DialogProps) {
  const t = useT();
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="dialog-overlay fixed inset-0 z-40 bg-scrim" />
        <RD.Content
          className={clsx(
            'dialog-content fixed z-50 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden border border-border-soft bg-surface text-ink shadow-soft',
            sheet
              ? 'inset-x-0 bottom-0 rounded-t-[28px] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]'
              : 'left-1/2 top-1/2 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[28px]',
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <RD.Title className="pt-2 text-xl">{title}</RD.Title>
            <RD.Close asChild>
              <IconButton label={t('close')}>
                <X aria-hidden className="size-5" />
              </IconButton>
            </RD.Close>
          </div>
          <div className="overflow-y-auto px-6 pb-6">
            {description && <RD.Description className="mt-1 text-ink-muted">{description}</RD.Description>}
            {children}
          </div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-border-soft px-6 py-4">{footer}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/** Destructive confirmation. With `confirmWord`, the user must type the word first. */
export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  confirmWord,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  confirmWord?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = !confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
      title={title}
      description={body}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={!ok}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setTyped('');
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {confirmWord && (
        <label className="mt-5 block">
          <span className="font-bold">{t('deleteAllType', { word: confirmWord })}</span>
          <input
            className="mt-2 block min-h-12 w-full rounded-[12px] border border-border bg-surface px-4 text-ink"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      )}
    </Dialog>
  );
}
