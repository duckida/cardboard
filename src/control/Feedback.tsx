import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface FeedbackValue {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

let nextId = 1;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId++;
      setToasts((items) => [...items.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3200);
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    resolverRef.current?.(false);
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setConfirmState(null);
  }, []);

  const value = useMemo<FeedbackValue>(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {createPortal(
        <div className="cb-control pointer-events-none fixed inset-x-0 bottom-24 z-[130] flex flex-col items-center gap-2 px-4 sm:bottom-6">
          {toasts.map((item) => {
            const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? AlertTriangle : Info;
            return (
              <div
                key={item.id}
                className={cn(
                  'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_12px_40px_rgba(32,37,31,0.18)]',
                  item.tone === 'error'
                    ? 'border-[#efd5ce] bg-[#fdf3f0] text-[#8f3526]'
                    : item.tone === 'success'
                      ? 'border-[#c7e6d7] bg-[#eef8f2] text-[#1f5f44]'
                      : 'border-line bg-white text-ink',
                )}
                role="status"
              >
                <Icon size={18} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-snug">{item.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(item.id)}
                  className="-mr-1 -mt-0.5 rounded-lg p-1 opacity-60 transition hover:opacity-100"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}

      <Modal
        open={Boolean(confirmState)}
        onClose={() => settle(false)}
        title={confirmState?.title ?? ''}
        description={confirmState?.body}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {confirmState?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={confirmState?.destructive ? 'danger' : 'primary'}
              onClick={() => settle(true)}
              autoFocus
            >
              {confirmState?.confirmLabel ?? 'Continue'}
            </Button>
          </>
        }
      >
        <div className="pb-1" />
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}
