import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { MarketReportsQuerySchema, ObjectIdSchema } from '@darketing/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const marketSignalsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/projects/:id/market-signals',
    {
      schema: {
        params: IdParamsSchema,
        querystring: MarketReportsQuerySchema,
      },
    },
    controller.listProjectMarketReportsHandler,
  );
};

export { marketSignalsRoutes as registerMarketSignalsRoutes };
