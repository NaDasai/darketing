import { connectDatabase, disconnectDatabase } from '../src/lib/db';
import { logger } from '../src/lib/logger';
import {
  ContentItemModel,
  GeneratedPostModel,
  ProjectModel,
  SourceModel,
} from '../src/models';

const DEMO_SOURCES = [
  'https://hnrss.org/frontpage',
  'https://techcrunch.com/feed/',
];

async function seed(): Promise<void> {
  await connectDatabase();

  // Wipe every collection so `pnpm seed` is idempotent during MVP development.
  await Promise.all([
    GeneratedPostModel.deleteMany({}),
    ContentItemModel.deleteMany({}),
    SourceModel.deleteMany({}),
    ProjectModel.deleteMany({}),
  ]);
  logger.info('Cleared existing collections');

  const project = await ProjectModel.create({
    name: 'Tech Insights Demo',
    description:
      'Curated AI and developer-tool news, reframed as original posts for a technical founder audience.',
    tone: 'PROFESSIONAL',
    targetAudience: 'Software engineers, tech founders, and product leaders',
    domain: 'AI, developer tools, SaaS, infrastructure',
    topNPerRun: 5,
    isActive: true,
  });

  logger.info({ projectId: project.id, name: project.name }, 'Created demo project');

  const sources = await SourceModel.create(
    DEMO_SOURCES.map((rssUrl) => ({
      projectId: project._id,
      rssUrl,
      isActive: true,
    })),
  );

  logger.info(
    { projectId: project.id, count: sources.length, urls: DEMO_SOURCES },
    'Created demo sources',
  );

  logger.info(
    'Seed complete. Trigger a pipeline run via `POST /projects/:id/run` once the worker is running.',
  );
}

seed()
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
