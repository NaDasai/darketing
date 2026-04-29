'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastOptions {
  sticky?: boolean;
}

interface ToastContextValue {
  toast: (
    message: string,
    variant?: ToastVariant,
    options?: ToastOptions,
  ) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (
      message: string,
      variant: ToastVariant = 'info',
      options?: ToastOptions,
    ): number => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, variant }]);
      if (!options?.sticky) {
        setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== id));
        }, TOAST_DURATION_MS);
      }
      return id;
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg backdrop-blur',
              t.variant === 'success' &&
                'border-emerald-700 bg-emerald-950/90 text-emerald-100',
              t.variant === 'error' &&
                'border-red-700 bg-red-950/90 text-red-100',
              t.variant === 'info' &&
                'border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
