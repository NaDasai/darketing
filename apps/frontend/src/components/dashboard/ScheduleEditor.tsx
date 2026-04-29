'use client';

import { useEffect, useState } from 'react';
import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

type Mode = 'hourly' | 'every-n-hours' | 'daily' | 'weekly' | 'custom';

const HOUR_INTERVALS = [2, 3, 4, 6, 8, 12] as const;
const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

interface ParsedExpr {
  mode: Mode;
  intervalN: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
}

const DEFAULTS: ParsedExpr = {
  mode: 'daily',
  intervalN: 6,
  hour: 6,
  minute: 0,
  dayOfWeek: 1,
};

function parseExpression(expr: string): ParsedExpr {
  const trimmed = expr.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return { ...DEFAULTS, mode: 'custom' };

  const [min, hour, dom, mon, dow] = parts;
  if (dom !== '*' || mon !== '*') return { ...DEFAULTS, mode: 'custom' };

  // Hourly: "0 * * * *"
  if (dow === '*' && hour === '*' && min === '0') {
    return { ...DEFAULTS, mode: 'hourly' };
  }

  // Every N hours: "0 */N * * *"
  const intervalMatch = /^\*\/(\d+)$/.exec(hour);
  if (dow === '*' && intervalMatch && min === '0') {
    const n = Number(intervalMatch[1]);
    if ((HOUR_INTERVALS as readonly number[]).includes(n)) {
      return { ...DEFAULTS, mode: 'every-n-hours', intervalN: n };
    }
    return { ...DEFAULTS, mode: 'custom' };
  }

  // Daily / weekly: numeric minute + hour
  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const m = Number(min);
    const h = Number(hour);
    if (m >= 0 && m < 60 && h >= 0 && h < 24) {
      if (dow === '*') {
        return { ...DEFAULTS, mode: 'daily', hour: h, minute: m };
      }
      if (/^\d+$/.test(dow)) {
        const d = Number(dow);
        if (d >= 0 && d <= 6) {
          return {
            ...DEFAULTS,
            mode: 'weekly',
            hour: h,
            minute: m,
            dayOfWeek: d,
          };
        }
      }
    }
  }

  return { ...DEFAULTS, mode: 'custom' };
}

function buildExpression(state: ParsedExpr, customExpr: string): string {
  switch (state.mode) {
    case 'hourly':
      return '0 * * * *';
    case 'every-n-hours':
      return `0 */${state.intervalN} * * *`;
    case 'daily':
      return `${state.minute} ${state.hour} * * *`;
    case 'weekly':
      return `${state.minute} ${state.hour} * * ${state.dayOfWeek}`;
    case 'custom':
      return customExpr;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function describe(state: ParsedExpr, customExpr: string): string {
  switch (state.mode) {
    case 'hourly':
      return 'Runs at the top of every hour';
    case 'every-n-hours':
      return `Runs every ${state.intervalN} hours`;
    case 'daily':
      return `Runs daily at ${pad(state.hour)}:${pad(state.minute)}`;
    case 'weekly':
      return `Runs weekly on ${DAYS[state.dayOfWeek]} at ${pad(state.hour)}:${pad(state.minute)}`;
    case 'custom':
      return customExpr.trim()
        ? 'Custom cron expression'
        : 'Set a cron expression';
  }
}

interface ScheduleEditorProps {
  value: string;
  onChange: (next: string) => void;
  error?: string;
}

export function ScheduleEditor({
  value,
  onChange,
  error,
}: ScheduleEditorProps) {
  // Local state seeded from `value`. We don't sync continuously from `value`
  // (would auto-flip Custom → Daily if a user types a daily-shaped expression
  // by hand). Instead, we re-seed only when `value` changes from outside our
  // own emits — tracked via lastEmittedRef.
  const [state, setState] = useState<ParsedExpr>(() => parseExpression(value));
  const [customExpr, setCustomExpr] = useState<string>(value);

  useEffect(() => {
    const built = buildExpression(state, customExpr);
    if (value !== built) {
      const reparsed = parseExpression(value);
      setState(reparsed);
      setCustomExpr(value);
    }
    // We intentionally exclude state/customExpr — only react to outside
    // changes to `value`.
  }, [value]);

  function emit(next: ParsedExpr, nextCustom = customExpr) {
    onChange(buildExpression(next, nextCustom));
  }

  function setMode(mode: Mode) {
    const next = { ...state, mode };
    setState(next);
    if (mode === 'custom') {
      // Seed custom buffer with the currently-built expression so the user
      // can tweak from where they were.
      const seed = buildExpression(state, customExpr);
      setCustomExpr(seed);
      emit(next, seed);
    } else {
      emit(next);
    }
  }

  function patch(partial: Partial<ParsedExpr>) {
    const next = { ...state, ...partial };
    setState(next);
    emit(next);
  }

  const built = buildExpression(state, customExpr);
  const displayedExpr = state.mode === 'custom' ? customExpr : built;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <Select
          aria-label="Frequency"
          value={state.mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="hourly">Hourly</option>
          <option value="every-n-hours">Every N hours</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom</option>
        </Select>

        <div className="flex flex-wrap items-center gap-2">
          {state.mode === 'hourly' ? (
            <span className="text-xs text-zinc-500">
              No additional options.
            </span>
          ) : null}

          {state.mode === 'every-n-hours' ? (
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              Every
              <Select
                aria-label="Interval (hours)"
                className="h-9 w-20"
                value={String(state.intervalN)}
                onChange={(e) =>
                  patch({ intervalN: Number(e.target.value) })
                }
              >
                {HOUR_INTERVALS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              hours
            </label>
          ) : null}

          {state.mode === 'daily' || state.mode === 'weekly' ? (
            <>
              {state.mode === 'weekly' ? (
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  On
                  <Select
                    aria-label="Day of week"
                    className="h-9 w-36"
                    value={String(state.dayOfWeek)}
                    onChange={(e) =>
                      patch({ dayOfWeek: Number(e.target.value) })
                    }
                  >
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                At
                <Input
                  type="time"
                  aria-label="Time"
                  className="h-9 w-32"
                  value={`${pad(state.hour)}:${pad(state.minute)}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    if (Number.isFinite(h) && Number.isFinite(m)) {
                      patch({ hour: h, minute: m });
                    }
                  }}
                />
              </label>
            </>
          ) : null}

          {state.mode === 'custom' ? (
            <Input
              aria-label="Cron expression"
              placeholder="0 6 * * *"
              spellCheck={false}
              className="font-mono"
              value={customExpr}
              onChange={(e) => {
                setCustomExpr(e.target.value);
                emit(state, e.target.value);
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-3 py-2">
        <span className="text-xs text-zinc-700 dark:text-zinc-300">
          {describe(state, customExpr)}
        </span>
        <code
          className={cn(
            'rounded bg-white dark:bg-zinc-900 px-2 py-0.5 font-mono text-xs',
            error ? 'text-red-300' : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          {displayedExpr || '—'}
        </code>
      </div>

      {state.mode === 'custom' ? (
        <p className="text-xs text-zinc-500">
          5-field cron expression. See{' '}
          <a
            href="https://crontab.guru"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-accent-300"
          >
            crontab.guru
          </a>{' '}
          for syntax help.
        </p>
      ) : null}

      <p className="text-xs text-zinc-500">
        Changes take effect within a minute.
      </p>
    </div>
  );
}
