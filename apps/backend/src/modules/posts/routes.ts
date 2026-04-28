import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  AiEditPostInputSchema,
  ObjectIdSchema,
  PostsQuerySchema,
  UpdatePostSchema,
} from '@darketing/shared';
import * as controller from './controller';

const IdParamsSchema = z.object({ id: ObjectIdSchema });

const postsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/posts',
    { schema: { querystring: PostsQuerySchema } },
    controller.listPostsHandler,
  );

  fastify.get(
    '/posts/:id',
    { schema: { params: IdParamsSchema } },
    controller.getPostHandler,
  );

  fastify.patch(
    '/posts/:id',
    { schema: { params: IdParamsSchema, body: UpdatePostSchema } },
    controller.updatePostHandler,
  );

  fastify.post(
    '/posts/:id/ai-edit',
    { schema: { params: IdParamsSchema, body: AiEditPostInputSchema } },
    controller.aiEditPostHandler,
  );
};

export { postsRoutes as registerPostsRoutes };
