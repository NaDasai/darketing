import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { ProjectModel } from '../models';
import { enqueuePipelineRun } from './queue';

export function startCronScheduler(): ScheduledTask {
  if (!cron.validate(env.CRON_SCHEDULE)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${env.CRON_SCHEDULE}`);
  }

  const task = cron.schedule(env.CRON_SCHEDULE, async () => {
    const tickLog = logger.child({ trigger: 'cron' });
    try {
      const projects = await ProjectModel.find({ isActive: true }).select('_id name');
      tickLog.info({ count: projects.length }, 'cron tick: enqueuing active projects');

      for (const project of projects) {
        try {
          const jobId = await enqueuePipelineRun(String(project._id), 'scheduled');
          tickLog.info(
            { projectId: String(project._id), name: project.name, jobId },
            'cron: enqueued project run',
          );
        } catch (err) {
          tickLog.error(
            { err, projectId: String(project._id), name: project.name },
            'cron: enqueue failed for project',
          );
        }
      }
    } catch (err) {
      tickLog.error({ err }, 'cron: tick failed');
    }
  });

  logger.info({ schedule: env.CRON_SCHEDULE }, 'cron scheduler started');
  return task;
}
