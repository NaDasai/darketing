import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  CreateSourceSchema,
  DiscoverFeedsSchema,
  ObjectIdSchema,
} from '@eagle-eyes/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const sourcesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/projects/:id/sources',
    { schema: { params: IdParamsSchema } },
    controller.listProjectSourcesHandler,
  );

  fastify.post(
    '/projects/:id/sources',
    { schema: { params: IdParamsSchema, body: CreateSourceSchema } },
    controller.createProjectSourceHandler,
  );

  fastify.post(
    '/sources/discover',
    { schema: { body: DiscoverFeedsSchema } },
    controller.discoverSourcesHandler,
  );

  fastify.delete(
    '/sources/:id',
    { schema: { params: IdParamsSchema } },
    controller.deleteSourceHandler,
  );
};

export { sourcesRoutes as registerSourcesRoutes };
