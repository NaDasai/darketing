import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ObjectIdSchema, TrendsQuerySchema } from '@darketing/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const trendsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/projects/:id/trends',
    {
      schema: {
        params: IdParamsSchema,
        querystring: TrendsQuerySchema,
      },
    },
    controller.listProjectTrendsHandler,
  );
};

export { trendsRoutes as registerTrendsRoutes };
