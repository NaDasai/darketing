import { Worker, type Job } from 'bullmq';
import type { Logger as PinoLogger } from 'pino';
import { Types } from 'mongoose';
import { PLATFORM_VALUES } from '@eagle-eyes/shared';
import { env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../lib/db';
import { logger } from '../lib/logger';
import {
  ContentItemModel,
  GeneratedPostModel,
  MarketReportModel,
  ProjectModel,
  RunLogModel,
  SourceModel,
  TrendModel,
  type IRunLogEvent,
  type IRunLogStats,
} from '../models';
import {
  PIPELINE_QUEUE_NAME,
  closeQueue,
  createRedisConnection,
  type PipelineJobData,
} from '../jobs/queue';
import { startCronScheduler, stopCronScheduler } from '../jobs/cron';
import { fetchFeed } from '../services/rss.service';
import { urlHash } from '../services/dedup.service';
import {
  summarize,
  generatePosts,
  generateMarketReport,
  generateTrendReport,
} from '../services/llm.service';
import { score } from '../services/scoring.service';

// Per-run accumulator. Each worker step appends events and bumps counters so
// a single RunLog row at the end captures a complete recap of the run.
interface RunRecap {
  events: IRunLogEvent[];
  stats: IRunLogStats;
}

function createRecap(): RunRecap {
  return {
    events: [],
    stats: {
      newItems: 0,
      summarized: 0,
      scored: 0,
      selected: 0,
      postsCreated: 0,
      trendThemes: 0,
      marketSignals: 0,
    },
  };
}

function pushEvent(
  recap: RunRecap,
  level: IRunLogEvent['level'],
  phase: string,
  message: string,
): void {
  recap.events.push({ level, phase, message, at: new Date() });
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

async function ingestSources(
  project: { _id: Types.ObjectId; id: string },
  recap: RunRecap,
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
          pushEvent(
            recap,
            'warn',
            'ingesting',
            `Item insert failed for ${item.sourceUrl}: ${describeError(err)}`,
          );
        }
      }

      source.lastFetchedAt = new Date();
      await source.save();
    } catch (err) {
      log.warn({ err, rssUrl: source.rssUrl }, 'pipeline: source fetch failed');
      pushEvent(
        recap,
        'warn',
        'ingesting',
        `Feed fetch failed for ${source.rssUrl}: ${describeError(err)}`,
      );
    }
  }

  return insertedIds;
}

async function summarizeAndScore(
  itemIds: Types.ObjectId[],
  project: { domain: string; targetAudience: string },
  recap: RunRecap,
  log: PinoLogger,
): Promise<void> {
  if (itemIds.length === 0) return;
  const items = await ContentItemModel.find({ _id: { $in: itemIds } });

  for (const item of items) {
    try {
      item.summary = await summarize(item.rawContent);
      recap.stats.summarized += 1;
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: summarize failed');
      pushEvent(
        recap,
        'warn',
        'summarizing',
        `Summarize failed for "${item.title}": ${describeError(err)}`,
      );
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
      recap.stats.scored += 1;
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: scoring failed');
      pushEvent(
        recap,
        'warn',
        'summarizing',
        `Scoring failed for "${item.title}": ${describeError(err)}`,
      );
    }

    try {
      await item.save();
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: item save failed');
      pushEvent(
        recap,
        'warn',
        'summarizing',
        `Item save failed for "${item.title}": ${describeError(err)}`,
      );
    }
  }
}

async function selectTopAndGenerate(
  itemIds: Types.ObjectId[],
  project: InstanceType<typeof ProjectModel>,
  recap: RunRecap,
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
          pushEvent(
            recap,
            'warn',
            'generating',
            `Post insert failed (${post.platform}) for "${item.title}": ${describeError(err)}`,
          );
        }
      }
    } catch (err) {
      log.warn({ err, itemId: String(item._id) }, 'pipeline: generatePosts failed');
      pushEvent(
        recap,
        'warn',
        'generating',
        `Post generation failed for "${item.title}": ${describeError(err)}`,
      );
    }
  }

  return { selected: topItems.length, postsCreated };
}

async function detectTrendsFromRun(
  itemIds: Types.ObjectId[],
  project: { _id: Types.ObjectId; domain: string; targetAudience: string },
  recap: RunRecap,
  log: PinoLogger,
): Promise<{ generated: boolean; themes: number }> {
  // Need at least 2 items with a summary for "trends" to be meaningful.
  const items = await ContentItemModel.find({
    _id: { $in: itemIds },
    summary: { $ne: null },
  }).select('title summary sourceUrl');

  if (items.length < 2) {
    log.info(
      { count: items.length },
      'pipeline: skipping trend detection (need >=2 summarized items)',
    );
    pushEvent(
      recap,
      'info',
      'trends',
      `Skipped trend detection — only ${items.length} summarized item(s).`,
    );
    return { generated: false, themes: 0 };
  }

  try {
    const report = await generateTrendReport({
      domain: project.domain,
      targetAudience: project.targetAudience,
      items: items.map((it) => ({
        title: it.title,
        summary: it.summary ?? '',
      })),
    });

    await TrendModel.create({
      projectId: project._id,
      generatedAt: new Date(),
      headline: report.headline,
      themes: report.themes,
      items: items.map((it) => ({
        contentItemId: it._id,
        title: it.title,
        sourceUrl: it.sourceUrl,
      })),
    });

    pushEvent(
      recap,
      'info',
      'trends',
      `Trend report generated with ${report.themes.length} theme(s).`,
    );
    return { generated: true, themes: report.themes.length };
  } catch (err) {
    // Trend detection is non-essential — log and continue so the run still
    // surfaces as completed.
    log.warn({ err }, 'pipeline: trend detection failed');
    pushEvent(
      recap,
      'warn',
      'trends',
      `Trend detection failed: ${describeError(err)}`,
    );
    return { generated: false, themes: 0 };
  }
}

async function detectMarketSignalsFromRun(
  itemIds: Types.ObjectId[],
  project: { _id: Types.ObjectId; domain: string; targetAudience: string },
  recap: RunRecap,
  log: PinoLogger,
): Promise<{ generated: boolean; signals: number }> {
  const items = await ContentItemModel.find({
    _id: { $in: itemIds },
    summary: { $ne: null },
  }).select('title summary sourceUrl');

  if (items.length < 2) {
    log.info(
      { count: items.length },
      'pipeline: skipping market signals (need >=2 summarized items)',
    );
    pushEvent(
      recap,
      'info',
      'signals',
      `Skipped market signals — only ${items.length} summarized item(s).`,
    );
    return { generated: false, signals: 0 };
  }

  try {
    const report = await generateMarketReport({
      domain: project.domain,
      targetAudience: project.targetAudience,
      items: items.map((it) => ({
        title: it.title,
        summary: it.summary ?? '',
      })),
    });

    // No usable signals — don't insert an empty report.
    if (report.signals.length === 0) {
      log.info('pipeline: no market signals detected');
      pushEvent(recap, 'info', 'signals', 'No market signals detected.');
      return { generated: false, signals: 0 };
    }

    // The LLM returns 1-based indexes into the items array. Map those to the
    // actual ContentItem ObjectIds and drop any out-of-range indexes silently.
    const indexToId = new Map<number, Types.ObjectId>(
      items.map((it, i) => [i + 1, it._id]),
    );

    await MarketReportModel.create({
      projectId: project._id,
      generatedAt: new Date(),
      signals: report.signals.map((s) => ({
        asset: s.asset,
        assetClass: s.assetClass,
        direction: s.direction,
        confidence: s.confidence,
        horizon: s.horizon,
        rationale: s.rationale,
        supportingContentItemIds: s.supportingItemIndexes
          .map((idx) => indexToId.get(idx))
          .filter((id): id is Types.ObjectId => id !== undefined),
      })),
      items: items.map((it) => ({
        contentItemId: it._id,
        title: it.title,
        sourceUrl: it.sourceUrl,
      })),
    });

    pushEvent(
      recap,
      'info',
      'signals',
      `Market signal report generated with ${report.signals.length} signal(s).`,
    );
    return { generated: true, signals: report.signals.length };
  } catch (err) {
    log.warn({ err }, 'pipeline: market signal detection failed');
    pushEvent(
      recap,
      'warn',
      'signals',
      `Market signal detection failed: ${describeError(err)}`,
    );
    return { generated: false, signals: 0 };
  }
}

async function persistRunLog(args: {
  projectId: Types.ObjectId;
  jobId: string | null;
  trigger: PipelineJobData['trigger'];
  status: 'SUCCEEDED' | 'FAILED';
  startedAt: Date;
  recap: RunRecap;
  failureReason: string | null;
  log: PinoLogger;
}): Promise<void> {
  const finishedAt = new Date();
  try {
    await RunLogModel.create({
      projectId: args.projectId,
      jobId: args.jobId,
      trigger: args.trigger,
      status: args.status,
      startedAt: args.startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - args.startedAt.getTime(),
      stats: args.recap.stats,
      events: args.recap.events,
      failureReason: args.failureReason,
    });
  } catch (err) {
    args.log.warn({ err }, 'pipeline: run log persist failed');
  }
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

  const recap = createRecap();
  const startedAt = new Date();
  pushEvent(recap, 'info', 'starting', `Run started (trigger: ${trigger}).`);

  log.info('pipeline: starting run');
  await job.updateProgress({ phase: 'starting', message: 'Starting run' });

  // Stamp the run-start time so the UI can mark items added during this run
  // as "new" (item.createdAt >= project.lastRunStartedAt).
  project.lastRunStartedAt = startedAt;
  await project.save();

  try {
    await job.updateProgress({
      phase: 'ingesting',
      message: 'Fetching RSS sources',
    });
    const insertedIds = await ingestSources(
      { _id: project._id, id: String(project._id) },
      recap,
      log,
    );
    recap.stats.newItems = insertedIds.length;
    pushEvent(
      recap,
      'info',
      'ingesting',
      `Ingested ${insertedIds.length} new item(s).`,
    );
    log.info({ newItems: insertedIds.length }, 'pipeline: ingestion done');

    await job.updateProgress({
      phase: 'summarizing',
      message: 'Summarizing and scoring new items',
      newItems: insertedIds.length,
    });
    await summarizeAndScore(insertedIds, project, recap, log);
    pushEvent(
      recap,
      'info',
      'summarizing',
      `Summarized ${recap.stats.summarized}, scored ${recap.stats.scored}.`,
    );

    await job.updateProgress({
      phase: 'generating',
      message: 'Generating posts for top picks',
      newItems: insertedIds.length,
    });
    const { selected, postsCreated } = await selectTopAndGenerate(
      insertedIds,
      project,
      recap,
      log,
    );
    recap.stats.selected = selected;
    recap.stats.postsCreated = postsCreated;
    pushEvent(
      recap,
      'info',
      'generating',
      `Selected top ${selected} item(s); created ${postsCreated} post(s).`,
    );
    log.info({ selected, postsCreated }, 'pipeline: generation done');

    await job.updateProgress({
      phase: 'trends',
      message: 'Detecting trends across new items',
      newItems: insertedIds.length,
      selected,
      postsCreated,
    });
    const trendResult = await detectTrendsFromRun(
      insertedIds,
      project,
      recap,
      log,
    );
    recap.stats.trendThemes = trendResult.themes;
    log.info(trendResult, 'pipeline: trend detection done');

    await job.updateProgress({
      phase: 'signals',
      message: 'Scanning for market signals',
      newItems: insertedIds.length,
      selected,
      postsCreated,
      trendThemes: trendResult.themes,
    });
    const signalResult = await detectMarketSignalsFromRun(
      insertedIds,
      project,
      recap,
      log,
    );
    recap.stats.marketSignals = signalResult.signals;
    log.info(signalResult, 'pipeline: market signal detection done');

    project.lastRunAt = new Date();
    await project.save();

    pushEvent(recap, 'info', 'done', 'Run complete.');

    await job.updateProgress({
      phase: 'done',
      message: 'Run complete',
      newItems: insertedIds.length,
      selected,
      postsCreated,
      trendThemes: trendResult.themes,
      marketSignals: signalResult.signals,
    });
    log.info('pipeline: run complete');

    await persistRunLog({
      projectId: project._id,
      jobId: job.id ?? null,
      trigger,
      status: 'SUCCEEDED',
      startedAt,
      recap,
      failureReason: null,
      log,
    });
  } catch (err) {
    const reason = describeError(err);
    pushEvent(recap, 'error', 'failed', `Run failed: ${reason}`);
    await persistRunLog({
      projectId: project._id,
      jobId: job.id ?? null,
      trigger,
      status: 'FAILED',
      startedAt,
      recap,
      failureReason: reason,
      log,
    });
    throw err;
  }
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

  await startCronScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'worker shutting down');
    stopCronScheduler();
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
