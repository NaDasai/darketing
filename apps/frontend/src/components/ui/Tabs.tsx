'use client';

import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onChange: (next: string) => void;
  name: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs subcomponents must be used inside <Tabs>');
  }
  return ctx;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const name = useId();
  const ctx = useMemo<TabsContextValue>(
    () => ({ value, onChange: onValueChange, name }),
    [value, onValueChange, name],
  );
  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: current, onChange } = useTabsContext();
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onChange(value)}
      className={cn(
        'rounded px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'bg-zinc-950 text-zinc-100 shadow-sm'
          : 'text-zinc-400 hover:text-zinc-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: current } = useTabsContext();
  if (current !== value) return null;
  return (
    <div role="tabpanel" className={cn(className)}>
      {children}
    </div>
  );
}
