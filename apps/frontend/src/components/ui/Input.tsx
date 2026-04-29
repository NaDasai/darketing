import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500',
        'focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...rest}
    />
  );
});
