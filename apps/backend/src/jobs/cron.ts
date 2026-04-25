import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger';
import { ProjectModel } from '../models';
import { enqueuePipelineRun } from './queue';

// One node-cron ScheduledTask per project. The worker reconciles this map
// against the DB every RECONCILE_INTERVAL_MS so schedule edits made via the
// API process propagate without any cross-process messaging.
interface TaskEntry {
  schedule: string;
  task: ScheduledTask;
}

const tasks = new Map<string, TaskEntry>();
let reconcileTimer: NodeJS.Timeout | null = null;

const RECONCILE_INTERVAL_MS = 60_000;

export class InvalidCronExpressionError extends Error {
  constructor(expr: string) {
    super(`Invalid cron expression: ${expr}`);
    this.name = 'InvalidCronExpressionError';
  }
}

export function isValidCronExpression(expr: string): boolean {
  return cron.validate(expr);
}

function makeTask(projectId: string, schedule: string): ScheduledTask {
  return cron.schedule(schedule, async () => {
    const tickLog = logger.child({ trigger: 'cron', projectId });
    try {
      // Re-check the project is still active at fire time — the reconcile
      // loop would have pulled this task too but a race is possible.
      const project = await ProjectModel.findById(projectId).select(
        'isActive name',
      );
      if (!project || !project.isActive) {
        tickLog.info('cron tick: project missing or inactive, skipping');
        return;
      }
      const jobId = await enqueuePipelineRun(projectId, 'scheduled');
      tickLog.info({ name: project.name, jobId }, 'cron: enqueued project run');
    } catch (err) {
      tickLog.error({ err }, 'cron: tick failed');
    }
  });
}

function addTask(projectId: string, schedule: string): void {
  if (!cron.validate(schedule)) {
    logger.error(
      { projectId, schedule },
      'cron: refusing to register invalid schedule',
    );
    return;
  }
  const task = makeTask(projectId, schedule);
  tasks.set(projectId, { schedule, task });
}

function removeTask(projectId: string): void {
  const existing = tasks.get(projectId);
  if (!existing) return;
  try {
    existing.task.stop();
  } catch (err) {
    logger.warn({ err, projectId }, 'cron: task stop failed');
  }
  tasks.delete(projectId);
}

async function reconcile(): Promise<void> {
  let projects: Array<{ _id: unknown; schedule: string }> = [];
  try {
    projects = await ProjectModel.find({ isActive: true })
      .select('_id schedule')
      .lean();
  } catch (err) {
    logger.error({ err }, 'cron: reconcile fetch failed');
    return;
  }

  const desired = new Map<string, string>(
    projects.map((p) => [String(p._id), p.schedule]),
  );

  for (const [projectId, entry] of tasks) {
    const want = desired.get(projectId);
    if (!want) {
      removeTask(projectId);
      logger.info({ projectId }, 'cron: unregistered (project removed/paused)');
    } else if (want !== entry.schedule) {
      removeTask(projectId);
      addTask(projectId, want);
      logger.info(
        { projectId, from: entry.schedule, to: want },
        'cron: rescheduled',
      );
    }
  }

  for (const [projectId, schedule] of desired) {
    if (!tasks.has(projectId)) {
      addTask(projectId, schedule);
      logger.info({ projectId, schedule }, 'cron: registered');
    }
  }
}

export async function startCronScheduler(): Promise<void> {
  await reconcile();
  reconcileTimer = setInterval(() => {
    void reconcile();
  }, RECONCILE_INTERVAL_MS);
  logger.info(
    { registered: tasks.size, reconcileIntervalMs: RECONCILE_INTERVAL_MS },
    'cron scheduler started (per-project, reconciling)',
  );
}

export function stopCronScheduler(): void {
  if (reconcileTimer) {
    clearInterval(reconcileTimer);
    reconcileTimer = null;
  }
  for (const [projectId, entry] of tasks) {
    try {
      entry.task.stop();
    } catch (err) {
      logger.warn({ err, projectId }, 'cron: task stop failed on shutdown');
    }
  }
  tasks.clear();
}
