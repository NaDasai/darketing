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

export async function closeQueue(): Promise<void> {
  await pipelineQueue.close();
  await connection.quit();
}
