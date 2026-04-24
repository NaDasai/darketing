import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ContentQuery } from '@darketing/shared';
import * as service from './service';

type IdParams = { id: string };

export async function listProjectContentHandler(
  req: FastifyRequest<{ Params: IdParams; Querystring: ContentQuery }>,
  reply: FastifyReply,
): Promise<void> {
  if (!(await service.projectExists(req.params.id))) {
    throw req.server.httpErrors.notFound('Project not found');
  }
  const items = await service.listContentForProject(req.params.id, req.query);
  reply.send(items);
}
