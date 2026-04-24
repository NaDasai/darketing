import { Worker, type Job } from 'bullmq';
import { Types } from 'mongoose';
import type { Logger as PinoLogger } from 'pino';
import { PLATFORM_VALUES } from '@darketing/shared';
import { env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../lib/db';
import { logger } from '../lib/logger';
import {
  ContentItemModel,
  GeneratedPostModel,
  ProjectModel,
  SourceModel,
} from '../models';
import {
  PIPELINE_QUEUE_NAME,
  closeQueue,
  createRedisConnection,
  type PipelineJobData,
} from '../jobs/queue';
import { startCronScheduler } from '../jobs/cron';
import { fetchFeed } from '../services/rss.service';
import { urlHash } from '../services/dedup.service';
import { summarize, generatePosts } from '../services/llm.service';
import { score } from '../services/scoring.service';

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

async function ingestSources(
  project: { _id: Types.ObjectId; id: string },
  log: PinoLogger,
): Promise<Types.ObjectId[]> {
  const sources = await SourceModel.find({ projectId: project._id, isActive: true });
  const insertedIds: Types.ObjectId[] = [];

  for (const source of sources) {
    try {
      const items = await fetchFeed(source.rssUrl);

      for (const item of items) {
        const hash = urlHash(item.sourceUrl);
        try {
          const created = await ContentItemModel.create({
            projectId: project._id,
            sourceId: source._id,
            sourceUrl: item.sourceUrl,
            urlHash: hash,
            title: item.title,
            rawContent: item.rawContent,
            summary: null,
            score: null,
            selected: false,
            publishedAt: item.publishedAt,
          });
          insertedIds.push(created._id);
        } catch (err) {
          // Unique-key collision = the hash already existed. Either a prior
          // run picked this up, or two sources in the same feed pointed at
          // the same URL. Silently skip.
          if (isDuplicateKeyError(err)) continue;
          log.warn({ err, url: item.sourceUrl }, 'pipeline: item insert failed');
        }
      }

      source.lastFetchedAt = new Date();
      await source.save();
    } catch (err) {
      log.warn({ err, rssUrl: source.rssUrl }, 'pipeline: source fetch failed');
    }
  }

  return insertedIds;
}

async function summarizeAndScore(
  itemIds: Types.ObjectId[],
  project: { domain: string; targetAudience: string },
  log: PinoLogger,
): Promise<void> {
  if (itemIds.length === 0) return;
  const items = await ContentItemModel.find({ _id: { $in: itemIds } });

  for (const item of items) {
    try {
      item.summary = await summarize(item.rawContent);
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: summarize failed');
      // Leave summary null, skip scoring — scoring relies on summary text.
      continue;
    }

    try {
      item.score = score(
        {
          title: item.title,
          summary: item.summary,
          rawContent: item.rawContent,
          publishedAt: item.publishedAt,
        },
        { domain: project.domain, targetAudience: project.targetAudience },
      );
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: scoring failed');
    }

    try {
      await item.save();
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: item save failed');
    }
  }
}

async function selectTopAndGenerate(
  itemIds: Types.ObjectId[],
  project: InstanceType<typeof ProjectModel>,
  log: PinoLogger,
): Promise<{ selected: number; postsCreated: number }> {
  if (itemIds.length === 0) return { selected: 0, postsCreated: 0 };

  // "Top N" is scoped to items ingested in *this* run. Older items keep their
  // historical selected=true state so /content?selected=true shows a running
  // log of past picks.
  const topItems = await ContentItemModel.find({
    _id: { $in: itemIds },
    score: { $ne: null },
  })
    .sort({ score: -1 })
    .limit(project.topNPerRun);

  if (topItems.length === 0) return { selected: 0, postsCreated: 0 };

  const topIds = topItems.map((i) => i._id);
  await ContentItemModel.updateMany(
    { _id: { $in: topIds } },
    { $set: { selected: true } },
  );

  let postsCreated = 0;
  for (const item of topItems) {
    try {
      const result = await generatePosts({
        title: item.title,
        summary: item.summary ?? '',
        sourceUrl: item.sourceUrl,
        tone: project.tone,
        targetAudience: project.targetAudience,
        domain: project.domain,
        platforms: PLATFORM_VALUES,
      });

      for (const post of result.posts) {
        try {
          await GeneratedPostModel.create({
            projectId: project._id,
            contentItemId: item._id,
            platform: post.platform,
            variant: null,
            content: post.content,
            editedContent: null,
            status: 'SUGGESTED',
          });
          postsCreated += 1;
        } catch (err) {
          log.warn(
            { err, itemId: String(item._id), platform: post.platform },
            'pipeline: post insert failed',
          );
        }
      }
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: generatePosts failed');
    }
  }

  return { selected: topItems.length, postsCreated };
}

async function runPipeline(job: Job<PipelineJobData>): Promise<void> {
  const { projectId, trigger } = job.data;
  const log = logger.child({ jobId: job.id, projectId, trigger });

  const project = await ProjectModel.findById(projectId);
  if (!project) {
    log.warn('pipeline: project not found, skipping');
    return;
  }
  if (!project.isActive) {
    log.info('pipeline: project inactive, skipping');
    return;
  }

  log.info('pipeline: starting run');
  await job.updateProgress({ phase: 'starting', message: 'Starting run' });

  // Stamp the run-start time so the UI can mark items added during this run
  // as "new" (item.createdAt >= project.lastRunStartedAt).
  project.lastRunStartedAt = new Date();
  await project.save();

  await job.updateProgress({
    phase: 'ingesting',
    message: 'Fetching RSS sources',
  });
  const insertedIds = await ingestSources({ _id: project._id, id: String(project._id) }, log);
  log.info({ newItems: insertedIds.length }, 'pipeline: ingestion done');

  await job.updateProgress({
    phase: 'summarizing',
    message: 'Summarizing and scoring new items',
    newItems: insertedIds.length,
  });
  await summarizeAndScore(insertedIds, project, log);

  await job.updateProgress({
    phase: 'generating',
    message: 'Generating posts for top picks',
    newItems: insertedIds.length,
  });
  const { selected, postsCreated } = await selectTopAndGenerate(insertedIds, project, log);
  log.info({ selected, postsCreated }, 'pipeline: generation done');

  project.lastRunAt = new Date();
  await project.save();

  await job.updateProgress({
    phase: 'done',
    message: 'Run complete',
    newItems: insertedIds.length,
    selected,
    postsCreated,
  });
  log.info('pipeline: run complete');
}

async function main(): Promise<void> {
  await connectDatabase();

  const connection = createRedisConnection();

  const worker = new Worker<PipelineJobData>(
    PIPELINE_QUEUE_NAME,
    runPipeline,
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
    },
  );

  worker.on('ready', () => {
    logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'worker ready');
  });
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, projectId: job.data.projectId }, 'worker: job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, projectId: job?.data.projectId, err },
      'worker: job failed',
    );
  });
  worker.on('error', (err) => {
    logger.error({ err }, 'worker: error event');
  });

  const cronTask = startCronScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'worker shutting down');
    cronTask.stop();
    try {
      await worker.close();
    } catch (err) {
      logger.warn({ err }, 'worker.close failed');
    }
    try {
      await connection.quit();
    } catch (err) {
      logger.warn({ err }, 'worker redis quit failed');
    }
    try {
      await closeQueue();
    } catch (err) {
      logger.warn({ err }, 'queue close failed');
    }
    try {
      await disconnectDatabase();
    } catch (err) {
      logger.warn({ err }, 'mongo disconnect failed');
    }
    process.exit(0);
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}

main().catch((err) => {
  logger.error({ err }, 'fatal worker error');
  process.exit(1);
});
