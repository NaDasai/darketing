import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const PIPELINE_QUEUE_NAME = 'project-pipeline';
export const PIPELINE_JOB_NAME = 'run';

export interface PipelineJobData {
  projectId: string;
  // "manual" jobs come from POST /projects/:id/run, "scheduled" from node-cron.
  // Purely for log readability — no branching logic depends on it.
  trigger: 'manual' | 'scheduled';
}

// BullMQ requires `maxRetriesPerRequest: null` on the ioredis connection — with
// the default (20) a dropped connection surfaces as an unhandled error after
// retries are exhausted. `enableReadyCheck: false` is recommended by BullMQ to
// avoid noisy reconnect cycles on slow-start Redis providers.
export function createRedisConnection(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
  });
}

const connection = createRedisConnection();

export const pipelineQueue = new Queue<PipelineJobData>(PIPELINE_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function enqueuePipelineRun(
  projectId: string,
  trigger: PipelineJobData['trigger'],
): Promise<string> {
  const job = await pipelineQueue.add(PIPELINE_JOB_NAME, { projectId, trigger });
  if (!job.id) {
    throw new Error('BullMQ did not return a job id');
  }
  return job.id;
}

export type JobUiState =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'unknown';

export interface JobStatus {
  id: string;
  state: JobUiState;
  progress: unknown;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
}

function mapState(raw: string): JobUiState {
  switch (raw) {
    case 'completed':
    case 'failed':
    case 'active':
    case 'waiting':
      return raw;
    case 'delayed':
    case 'paused':
    case 'prioritized':
    case 'waiting-children':
      return 'waiting';
    default:
      return 'unknown';
  }
}

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const job = await pipelineQueue.getJob(jobId);
  if (!job) return null;
  const rawState = await job.getState();
  return {
    id: jobId,
    state: mapState(rawState),
    progress: job.progress ?? null,
    failedReason: job.failedReason ?? null,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
  };
}

export async function closeQueue(): Promise<void> {
  await pipelineQueue.close();
  await connection.quit();
}
