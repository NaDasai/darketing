// One-off cleanup: drops ContentItems that were ingested but never summarized
// (score=null) and any GeneratedPosts tied to them. Useful after a run that
// 429'd on LLM calls — without this, a second `Run pipeline now` does nothing
// because the URL-hash dedup layer skips the already-inserted items.
import { connectDatabase, disconnectDatabase } from '../src/lib/db';
import { logger } from '../src/lib/logger';
import { ContentItemModel, GeneratedPostModel } from '../src/models';

async function main(): Promise<void> {
  await connectDatabase();

  const stuck = await ContentItemModel.find({ score: null }).select('_id projectId');
  const ids = stuck.map((i) => i._id);

  if (ids.length === 0) {
    logger.info('Nothing to reset.');
    return;
  }

  const postsRes = await GeneratedPostModel.deleteMany({
    contentItemId: { $in: ids },
  });
  const itemsRes = await ContentItemModel.deleteMany({ _id: { $in: ids } });

  logger.info(
    { items: itemsRes.deletedCount, posts: postsRes.deletedCount },
    'Reset complete — re-run the pipeline to re-ingest these items.',
  );
}

main()
  .catch((err) => {
    logger.error({ err }, 'reset failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
