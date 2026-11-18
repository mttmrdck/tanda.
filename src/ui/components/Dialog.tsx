import * as RD from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { SheetSurface } from '../vendor/sheet';
import { useDragControls } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const drag = useDragControls();
  const [expanded, setExpanded] = useState(false);
  // Controlled dialogs have no Radix Trigger, so remember what opened them and return focus there on close.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.activeElement;
    if (open && el instanceof HTMLElement && el !== document.body && !el.closest('[role="dialog"]')) opener.current = el;
  }, [open]);
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="dialog-overlay fixed inset-0 z-40 bg-scrim" />
        <RD.Content asChild
          className={clsx(
            'dialog-content glass fixed z-50 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden text-ink',
            sheet
              ? 'inset-x-0 bottom-0 rounded-t-[32px] pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px]'
              : 'left-1/2 top-1/2 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px]',
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
          onCloseAutoFocus={(e) => {
            const back = opener.current;
            opener.current = null;
            if (back?.isConnected) {
              e.preventDefault();
              back.focus();
            }
          }}
        >
          <SheetSurface sheet={sheet} expanded={expanded} controls={drag} onDismiss={() => onOpenChange(false)}>
          {sheet && <button type="button" className="sheet-grabber min-h-11 shrink-0" aria-label={t(expanded ? 'collapseSheet' : 'expandSheet')} aria-expanded={expanded} onClick={() => setExpanded(v => !v)} onPointerDown={e => drag.start(e)} />}
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
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--glass-border)] px-6 py-4">{footer}</div>}
          </SheetSurface>
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
            className="mt-2 block min-h-12 w-full rounded-[16px] border border-border bg-surface-2 px-4 text-ink"
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
