import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  CreateProjectSchema,
  ObjectIdSchema,
  UpdateProjectSchema,
} from '@darketing/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const projectsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    '/projects',
    { schema: { body: CreateProjectSchema } },
    controller.createProjectHandler,
  );

  fastify.get('/projects', controller.listProjectsHandler);

  fastify.get(
    '/projects/:id',
    { schema: { params: IdParamsSchema } },
    controller.getProjectHandler,
  );

  fastify.patch(
    '/projects/:id',
    { schema: { params: IdParamsSchema, body: UpdateProjectSchema } },
    controller.updateProjectHandler,
  );

  fastify.delete(
    '/projects/:id',
    { schema: { params: IdParamsSchema } },
    controller.deleteProjectHandler,
  );

  fastify.post(
    '/projects/:id/run',
    { schema: { params: IdParamsSchema } },
    controller.runProjectHandler,
  );
};

export { projectsRoutes as registerProjectsRoutes };
