import { buildApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './lib/db';
import { logger } from './lib/logger';

async function shutdown(signal: string, code = 0): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  try {
    await disconnectDatabase();
  } catch (err) {
    logger.warn({ err }, 'Error while disconnecting MongoDB');
  }
  process.exit(code);
}

async function main(): Promise<void> {
  await connectDatabase();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(
      { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
      'Eagle Eyes API listening',
    );
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    await shutdown('start-failure', 1);
    return;
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().finally(() => shutdown(signal));
    });
  }
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
