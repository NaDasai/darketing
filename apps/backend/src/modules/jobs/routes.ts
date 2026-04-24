import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import * as controller from './controller';

const JobIdParamsSchema = z.object({ jobId: z.string().min(1) });

const jobsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/jobs/:jobId',
    { schema: { params: JobIdParamsSchema } },
    controller.getJobStatusHandler,
  );
};

export { jobsRoutes as registerJobsRoutes };
