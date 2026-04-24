import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PostsQuery, UpdatePostInput } from '@darketing/shared';
import * as service from './service';
import { InvalidCursorError } from './service';

type IdParams = { id: string };

export async function listPostsHandler(
  req: FastifyRequest<{ Querystring: PostsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await service.listPosts(req.query);
    reply.send(result);
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      throw req.server.httpErrors.badRequest(err.message);
    }
    throw err;
  }
}

export async function getPostHandler(
  req: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const post = await service.getPost(req.params.id);
  if (!post) throw req.server.httpErrors.notFound('Post not found');
  reply.send(post);
}

export async function updatePostHandler(
  req: FastifyRequest<{ Params: IdParams; Body: UpdatePostInput }>,
  reply: FastifyReply,
): Promise<void> {
  const post = await service.updatePost(req.params.id, req.body);
  if (!post) throw req.server.httpErrors.notFound('Post not found');
  reply.send(post);
}
