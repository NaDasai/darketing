import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300',
  accent: 'border-accent-800 bg-accent-900/40 text-accent-200',
  success: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  warning: 'border-amber-800 bg-amber-950/60 text-amber-300',
  danger: 'border-red-800 bg-red-950/60 text-red-300',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
