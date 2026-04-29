'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Repeat,
  XCircle,
  Zap,
} from 'lucide-react';
import type { RunLogDto } from '@eagle-eyes/shared';
import { runLogsApi } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
} from '@/components/ui';
import { cn, formatDate, formatRelative } from '@/lib/utils';

type RunEvent = RunLogDto['events'][number];

const PHASE_LABEL: Record<string, string> = {
  starting: 'Starting',
  ingesting: 'Ingesting',
  summarizing: 'Summarizing',
  generating: 'Generating',
  trends: 'Trends',
  signals: 'Signals',
  done: 'Done',
  failed: 'Failed',
};

export function LogsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const logs = useQuery({
    queryKey: ['run-logs', projectId],
    queryFn: ({ signal }) =>
      runLogsApi.list(projectId, { limit: 30 }, signal),
  });

  if (logs.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!logs.data || logs.data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
            <Clock className="h-5 w-5 text-accent-300" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-zinc-100">
              No pipeline runs yet
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              When you trigger a run manually or the schedule fires, a recap
              of what happened will be saved here — counts, warnings, and any
              failure reason.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Showing the last {logs.data.length} run
          {logs.data.length === 1 ? '' : 's'}.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            qc.invalidateQueries({ queryKey: ['run-logs', projectId] })
          }
          isLoading={logs.isFetching}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      {logs.data.map((log) => (
        <RunLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}

function RunLogCard({ log }: { log: RunLogDto }) {
  const succeeded = log.status === 'SUCCEEDED';
  const warnCount = log.events.filter((e) => e.level === 'warn').length;
  const errorCount = log.events.filter((e) => e.level === 'error').length;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={log.status} />
              <TriggerBadge trigger={log.trigger} />
              {warnCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-800/60 bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-200">
                  <AlertTriangle className="h-3 w-3" />
                  {warnCount} warning{warnCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {errorCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-800/60 bg-red-950/30 px-2 py-0.5 text-xs font-medium text-red-200">
                  <XCircle className="h-3 w-3" />
                  {errorCount} error{errorCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <span
              className="text-xs text-zinc-500"
              title={formatDate(log.startedAt)}
            >
              Started {formatRelative(log.startedAt)} ·{' '}
              {formatDuration(log.durationMs)}
            </span>
          </div>
        </div>

        {succeeded ? (
          <p className="text-sm text-zinc-200">
            Pipeline run complete — {log.stats.newItems} new,{' '}
            {log.stats.selected} selected, {log.stats.postsCreated} posts
            {log.stats.trendThemes > 0
              ? `, ${log.stats.trendThemes} theme${log.stats.trendThemes === 1 ? '' : 's'}`
              : ''}
            {log.stats.marketSignals > 0
              ? `, ${log.stats.marketSignals} signal${log.stats.marketSignals === 1 ? '' : 's'}`
              : ''}
            .
          </p>
        ) : null}

        {!succeeded && log.failureReason ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-pre-wrap break-words">
              Pipeline run failed: {log.failureReason}
            </span>
          </div>
        ) : null}

        <StatsGrid stats={log.stats} />

        {log.events.length > 0 ? (
          <details className="border-t border-zinc-800 pt-3">
            <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
              Event log ({log.events.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {log.events.map((event, i) => (
                <EventRow key={i} event={event} />
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: RunLogDto['status'] }) {
  if (status === 'SUCCEEDED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Succeeded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-700/60 bg-red-950/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-300">
      <XCircle className="h-3.5 w-3.5" />
      Failed
    </span>
  );
}

function TriggerBadge({ trigger }: { trigger: RunLogDto['trigger'] }) {
  const Icon = trigger === 'manual' ? Zap : Repeat;
  return (
    <Badge>
      <Icon className="mr-1 h-3 w-3" />
      {trigger === 'manual' ? 'Manual' : 'Scheduled'}
    </Badge>
  );
}

function StatsGrid({ stats }: { stats: RunLogDto['stats'] }) {
  const cells: Array<{ label: string; value: number }> = [
    { label: 'New items', value: stats.newItems },
    { label: 'Summarized', value: stats.summarized },
    { label: 'Scored', value: stats.scored },
    { label: 'Selected', value: stats.selected },
    { label: 'Posts', value: stats.postsCreated },
    { label: 'Themes', value: stats.trendThemes },
    { label: 'Signals', value: stats.marketSignals },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {cell.label}
          </div>
          <div className="mt-0.5 text-lg font-semibold text-zinc-100 tabular-nums">
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventRow({ event }: { event: RunEvent }) {
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
          event.level === 'info' && 'bg-zinc-800 text-zinc-300',
          event.level === 'warn' && 'bg-amber-950/50 text-amber-200',
          event.level === 'error' && 'bg-red-950/60 text-red-200',
        )}
      >
        {PHASE_LABEL[event.phase] ?? event.phase}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 break-words',
          event.level === 'info' && 'text-zinc-400',
          event.level === 'warn' && 'text-amber-200/90',
          event.level === 'error' && 'text-red-200',
        )}
      >
        {event.message}
      </span>
      <span
        className="shrink-0 text-xs text-zinc-600"
        title={formatDate(event.at)}
      >
        {formatRelative(event.at)}
      </span>
    </li>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec - min * 60);
  return `${min}m ${rem}s`;
}
