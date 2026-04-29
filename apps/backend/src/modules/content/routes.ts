import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ContentQuerySchema, ObjectIdSchema } from '@eagle-eyes/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const contentRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/projects/:id/content',
    {
      schema: {
        params: IdParamsSchema,
        querystring: ContentQuerySchema,
      },
    },
    controller.listProjectContentHandler,
  );
};

export { contentRoutes as registerContentRoutes };
