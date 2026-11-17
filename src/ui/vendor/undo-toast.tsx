/** EasyUI feedback material adapted to the existing Sonner announcement lifecycle. */
import { Toaster } from 'sonner';
export function UndoToast({theme}:{theme:'system'|'light'|'dark'}) { return (      <Toaster
        position="top-center"
        theme={theme}
        closeButton
        offset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        toastOptions={{
          style: {
            background: 'var(--glass-tint)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow)',
            color: 'var(--ink)',
            fontSize: '1rem',
            borderRadius: '24px',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
); }
