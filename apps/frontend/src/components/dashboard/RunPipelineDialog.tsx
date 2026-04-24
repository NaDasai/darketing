'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi, type JobStatusDto } from '@/lib/api';
import { Button, Modal } from '@/components/ui';

const POLL_INTERVAL_MS = 1500;
const AUTO_CLOSE_DELAY_MS = 1500;

const PHASE_ORDER = [
  'starting',
  'ingesting',
  'summarizing',
  'generating',
  'done',
] as const;

const PHASE_LABEL: Record<string, string> = {
  starting: 'Starting…',
  ingesting: 'Fetching RSS sources…',
  summarizing: 'Summarizing & scoring new items…',
  generating: 'Generating posts for top picks…',
  done: 'Run complete',
};

interface RunPipelineDialogProps {
  open: boolean;
  jobId: string | null;
  projectId: string;
  onClose: () => void;
}

export function RunPipelineDialog({
  open,
  jobId,
  projectId,
  onClose,
}: RunPipelineDialogProps) {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ['job', jobId],
    queryFn: ({ signal }) => jobsApi.getStatus(jobId as string, signal),
    enabled: open && !!jobId,
    refetchInterval: (q) => {
      const data = q.state.data as JobStatusDto | undefined;
      if (!data) return POLL_INTERVAL_MS;
      return data.state === 'completed' || data.state === 'failed'
        ? false
        : POLL_INTERVAL_MS;
    },
    // Don't keep stale data between separate runs.
    gcTime: 0,
  });

  const isTerminal =
    status.data?.state === 'completed' || status.data?.state === 'failed';

  // When the run finishes, refresh the project + content + posts so the UI
  // reflects the new items, then auto-close on success after a short pause.
  useEffect(() => {
    if (!open || !isTerminal) return undefined;
    qc.invalidateQueries({ queryKey: ['project', projectId] });
    qc.invalidateQueries({ queryKey: ['content', projectId] });
    qc.invalidateQueries({ queryKey: ['posts'] });

    if (status.data?.state === 'completed') {
      const t = window.setTimeout(onClose, AUTO_CLOSE_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, isTerminal, status.data?.state, qc, projectId, onClose]);

  const progress = useMemo(() => {
    const p = status.data?.progress;
    if (!p || typeof p !== 'object') return null;
    return p as {
      phase?: string;
      message?: string;
      newItems?: number;
      selected?: number;
      postsCreated?: number;
    };
  }, [status.data?.progress]);

  const currentPhase = progress?.phase ?? null;
  const currentPhaseIndex = currentPhase
    ? PHASE_ORDER.indexOf(currentPhase as (typeof PHASE_ORDER)[number])
    : -1;

  const headerLabel: string = (() => {
    if (!status.data) return 'Queued…';
    if (status.data.state === 'failed') return 'Run failed';
    if (status.data.state === 'completed') return 'Run complete';
    if (status.data.state === 'waiting') return 'Queued — waiting for worker';
    if (currentPhase && PHASE_LABEL[currentPhase]) {
      return PHASE_LABEL[currentPhase];
    }
    return 'Running…';
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pipeline run"
      description={jobId ? `Job ${jobId.slice(0, 8)}…` : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {isTerminal ? (
            status.data?.state === 'completed' ? (
              <CheckIcon />
            ) : (
              <ErrorIcon />
            )
          ) : (
            <Spinner />
          )}
          <span className="text-sm text-zinc-100">{headerLabel}</span>
        </div>

        <ol className="flex flex-col gap-1.5 text-xs">
          {PHASE_ORDER.filter((p) => p !== 'done').map((phase, idx) => {
            const reached =
              status.data?.state === 'completed' ||
              (currentPhaseIndex >= 0 && idx <= currentPhaseIndex);
            const active =
              !isTerminal && currentPhaseIndex === idx;
            return (
              <li
                key={phase}
                className="flex items-center gap-2"
              >
                <span
                  className={
                    'inline-block h-1.5 w-1.5 rounded-full ' +
                    (reached
                      ? 'bg-accent-400'
                      : active
                        ? 'bg-accent-400/70 animate-pulse'
                        : 'bg-zinc-700')
                  }
                />
                <span
                  className={
                    reached || active ? 'text-zinc-200' : 'text-zinc-500'
                  }
                >
                  {PHASE_LABEL[phase]}
                </span>
              </li>
            );
          })}
        </ol>

        {status.data?.state === 'completed' && progress ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
            <div>New items: {progress.newItems ?? 0}</div>
            <div>Selected: {progress.selected ?? 0}</div>
            <div>Posts generated: {progress.postsCreated ?? 0}</div>
          </div>
        ) : null}

        {status.data?.state === 'failed' ? (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {status.data.failedReason ?? 'Unknown error'}
          </div>
        ) : null}

        {status.isError && !status.data ? (
          <div className="rounded-md border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            Couldn&apos;t fetch job status. The worker may be offline.
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            {isTerminal ? 'Close' : 'Hide'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-accent-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-emerald-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="h-5 w-5 text-red-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
