'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi, type JobStatusDto } from '@/lib/api';

const POLL_INTERVAL_MS = 1500;

export interface RunTerminalResult {
  state: 'completed' | 'failed';
  progress?: {
    newItems?: number;
    selected?: number;
    postsCreated?: number;
  };
  failedReason?: string;
}

interface RunPipelineTrackerProps {
  jobId: string | null;
  projectId: string;
  onTerminal?: (result: RunTerminalResult) => void;
}

export function RunPipelineTracker({
  jobId,
  projectId,
  onTerminal,
}: RunPipelineTrackerProps) {
  const qc = useQueryClient();
  // Ensures we only fire onTerminal once per job, even across re-renders.
  const notifiedRef = useRef<string | null>(null);

  const status = useQuery({
    queryKey: ['job', jobId],
    queryFn: ({ signal }) => jobsApi.getStatus(jobId as string, signal),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const data = q.state.data as JobStatusDto | undefined;
      if (!data) return POLL_INTERVAL_MS;
      return data.state === 'completed' || data.state === 'failed'
        ? false
        : POLL_INTERVAL_MS;
    },
    gcTime: 0,
  });

  const state = status.data?.state;
  const isTerminal = state === 'completed' || state === 'failed';

  useEffect(() => {
    if (!jobId || !isTerminal) return;
    if (notifiedRef.current === jobId) return;
    notifiedRef.current = jobId;

    qc.invalidateQueries({ queryKey: ['project', projectId] });
    qc.invalidateQueries({ queryKey: ['content', projectId] });
    qc.invalidateQueries({ queryKey: ['trends', projectId] });
    qc.invalidateQueries({ queryKey: ['market-signals', projectId] });
    qc.invalidateQueries({ queryKey: ['run-logs', projectId] });
    qc.invalidateQueries({ queryKey: ['posts'] });

    onTerminal?.({
      state: state as 'completed' | 'failed',
      progress: status.data?.progress as RunTerminalResult['progress'],
      failedReason: status.data?.failedReason ?? undefined,
    });
  }, [jobId, isTerminal, state, status.data, qc, projectId, onTerminal]);

  return null;
}
