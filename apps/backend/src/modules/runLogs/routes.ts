import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ObjectIdSchema, RunLogsQuerySchema } from '@eagle-eyes/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const runLogsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/projects/:id/run-logs',
    {
      schema: {
        params: IdParamsSchema,
        querystring: RunLogsQuerySchema,
      },
    },
    controller.listProjectRunLogsHandler,
  );
};

export { runLogsRoutes as registerRunLogsRoutes };
