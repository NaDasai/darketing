'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl',
          maxWidth,
        )}
      >
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          ) : null}
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
